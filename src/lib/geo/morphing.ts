import type { Feature, Geometry, Position } from "geojson";
import type { MorphablePosition, MorphableGeometry, CountryProperties } from "@/types/geo";
import { createMorphablePosition, interpolatePosition } from "./coordinates";
import * as THREE from "three";

// ==========================================
// GeoJSON to Morphable Geometry Conversion
// ==========================================

/**
 * Convert a GeoJSON feature to morphable geometry
 */
export function featureToMorphableGeometry(
  feature: Feature<Geometry, CountryProperties>
): MorphableGeometry | null {
  const geometry = feature.geometry;
  if (!geometry) return null;

  const featureId = feature.properties?.iso_a3 || feature.id?.toString() || "unknown";

  switch (geometry.type) {
    case "Polygon":
      return polygonToMorphable(geometry.coordinates, featureId);
    case "MultiPolygon":
      return multiPolygonToMorphable(geometry.coordinates, featureId);
    default:
      console.warn(`Unsupported geometry type: ${geometry.type}`);
      return null;
  }
}

/**
 * Convert a single polygon to morphable geometry using THREE.ShapeGeometry
 */
function polygonToMorphable(
  coordinates: Position[][],
  featureId: string
): MorphableGeometry {
  if (!coordinates || coordinates.length === 0 || !coordinates[0] || coordinates[0].length < 3) {
    return { positions: [], indices: [], featureId };
  }

  try {
    const outerRing = coordinates[0];
    const shape = new THREE.Shape();

    shape.moveTo(outerRing[0][0], outerRing[0][1]);
    for (let i = 1; i < outerRing.length; i++) {
      shape.lineTo(outerRing[i][0], outerRing[i][1]);
    }
    shape.closePath();

    // Add holes
    for (let h = 1; h < coordinates.length; h++) {
      const holeRing = coordinates[h];
      if (holeRing.length >= 3) {
        const holePath = new THREE.Path();
        holePath.moveTo(holeRing[0][0], holeRing[0][1]);
        for (let i = 1; i < holeRing.length; i++) {
          holePath.lineTo(holeRing[i][0], holeRing[i][1]);
        }
        holePath.closePath();
        shape.holes.push(holePath);
      }
    }

    const shapeGeom = new THREE.ShapeGeometry(shape);
    const posAttr = shapeGeom.getAttribute("position");
    const indexAttr = shapeGeom.getIndex();

    if (!posAttr || !indexAttr || indexAttr.count === 0) {
      shapeGeom.dispose();
      return { positions: [], indices: [], featureId };
    }

    const positions: MorphablePosition[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      positions.push(createMorphablePosition(posAttr.getX(i), posAttr.getY(i)));
    }

    const indices: number[] = [];
    for (let i = 0; i < indexAttr.count; i++) {
      indices.push(indexAttr.getX(i));
    }

    shapeGeom.dispose();
    return { positions, indices, featureId };
  } catch (error) {
    console.warn(`Triangulation failed for ${featureId}:`, error);
    return { positions: [], indices: [], featureId };
  }
}

/**
 * Convert a multi-polygon to morphable geometry
 */
function multiPolygonToMorphable(
  coordinates: Position[][][],
  featureId: string
): MorphableGeometry {
  const allPositions: MorphablePosition[] = [];
  const allIndices: number[] = [];
  let indexOffset = 0;

  for (const polygonCoords of coordinates) {
    const polyGeom = polygonToMorphable(polygonCoords, featureId);
    allPositions.push(...polyGeom.positions);
    for (const idx of polyGeom.indices) {
      allIndices.push(idx + indexOffset);
    }
    indexOffset += polyGeom.positions.length;
  }

  return { positions: allPositions, indices: allIndices, featureId };
}

// ==========================================
// Three.js Geometry Creation
// ==========================================

/**
 * Create a Three.js BufferGeometry from morphable geometry
 * Subdivides large triangles to prevent sphere projection issues
 */
export function createMorphableBufferGeometry(
  morphable: MorphableGeometry,
  morphProgress: number = 0
): THREE.BufferGeometry {
  // Subdivide large triangles for better sphere projection
  const subdivided = subdivideLargeTriangles(morphable);

  const geometry = new THREE.BufferGeometry();
  const positionCount = subdivided.positions.length;

  const spherePositions = new Float32Array(positionCount * 3);
  const flatPositions = new Float32Array(positionCount * 3);
  const interpolatedPositions = new Float32Array(positionCount * 3);

  for (let i = 0; i < positionCount; i++) {
    const mp = subdivided.positions[i];
    const idx = i * 3;

    spherePositions[idx] = mp.sphere.x;
    spherePositions[idx + 1] = mp.sphere.y;
    spherePositions[idx + 2] = mp.sphere.z;

    flatPositions[idx] = mp.flat.x;
    flatPositions[idx + 1] = mp.flat.y;
    flatPositions[idx + 2] = mp.flat.z;

    const interp = interpolatePosition(mp, morphProgress);
    interpolatedPositions[idx] = interp.x;
    interpolatedPositions[idx + 1] = interp.y;
    interpolatedPositions[idx + 2] = interp.z;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(interpolatedPositions, 3));
  geometry.setAttribute("spherePosition", new THREE.BufferAttribute(spherePositions, 3));
  geometry.setAttribute("flatPosition", new THREE.BufferAttribute(flatPositions, 3));

  if (subdivided.indices.length > 0) {
    geometry.setIndex(subdivided.indices);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return geometry;
}

/**
 * Subdivide triangles that are too large in geo coordinates
 * This prevents distortion when projecting to sphere
 */
function subdivideLargeTriangles(morphable: MorphableGeometry): MorphableGeometry {
  const maxEdgeLength = 10; // Max degrees for an edge
  const maxIterations = 4; // Prevent infinite loops

  let positions = [...morphable.positions];
  let indices = [...morphable.indices];

  for (let iter = 0; iter < maxIterations; iter++) {
    const newIndices: number[] = [];
    let subdivided = false;

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const p0 = positions[i0];
      const p1 = positions[i1];
      const p2 = positions[i2];

      if (!p0 || !p1 || !p2) {
        continue;
      }

      const edge01 = geoDistance(p0.geo, p1.geo);
      const edge12 = geoDistance(p1.geo, p2.geo);
      const edge20 = geoDistance(p2.geo, p0.geo);
      const maxEdge = Math.max(edge01, edge12, edge20);

      if (maxEdge > maxEdgeLength) {
        subdivided = true;

        // Add midpoints for each edge
        const mid01Lon = (p0.geo.longitude + p1.geo.longitude) / 2;
        const mid01Lat = (p0.geo.latitude + p1.geo.latitude) / 2;
        const mid01Idx = positions.length;
        positions.push(createMorphablePosition(mid01Lon, mid01Lat));

        const mid12Lon = (p1.geo.longitude + p2.geo.longitude) / 2;
        const mid12Lat = (p1.geo.latitude + p2.geo.latitude) / 2;
        const mid12Idx = positions.length;
        positions.push(createMorphablePosition(mid12Lon, mid12Lat));

        const mid20Lon = (p2.geo.longitude + p0.geo.longitude) / 2;
        const mid20Lat = (p2.geo.latitude + p0.geo.latitude) / 2;
        const mid20Idx = positions.length;
        positions.push(createMorphablePosition(mid20Lon, mid20Lat));

        // Create 4 smaller triangles
        newIndices.push(i0, mid01Idx, mid20Idx);
        newIndices.push(mid01Idx, i1, mid12Idx);
        newIndices.push(mid20Idx, mid12Idx, i2);
        newIndices.push(mid01Idx, mid12Idx, mid20Idx);
      } else {
        newIndices.push(i0, i1, i2);
      }
    }

    indices = newIndices;

    if (!subdivided) break;
  }

  return {
    positions,
    indices,
    featureId: morphable.featureId,
  };
}

function geoDistance(a: { longitude: number; latitude: number }, b: { longitude: number; latitude: number }): number {
  const dLon = Math.abs(a.longitude - b.longitude);
  const dLat = Math.abs(a.latitude - b.latitude);
  // Handle antimeridian crossing
  const adjustedDLon = dLon > 180 ? 360 - dLon : dLon;
  return Math.sqrt(adjustedDLon * adjustedDLon + dLat * dLat);
}

/**
 * Update geometry positions based on morph progress
 */
export function updateMorphProgress(
  geometry: THREE.BufferGeometry,
  morphProgress: number
): void {
  const spherePositions = geometry.getAttribute("spherePosition") as THREE.BufferAttribute;
  const flatPositions = geometry.getAttribute("flatPosition") as THREE.BufferAttribute;
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;

  if (!spherePositions || !flatPositions || !positions) return;

  const count = positions.count;
  const t = Math.max(0, Math.min(1, morphProgress));

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    positions.array[idx] = spherePositions.array[idx] + (flatPositions.array[idx] - spherePositions.array[idx]) * t;
    positions.array[idx + 1] = spherePositions.array[idx + 1] + (flatPositions.array[idx + 1] - spherePositions.array[idx + 1]) * t;
    positions.array[idx + 2] = spherePositions.array[idx + 2] + (flatPositions.array[idx + 2] - spherePositions.array[idx + 2]) * t;
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}
