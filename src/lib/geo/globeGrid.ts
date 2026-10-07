import * as THREE from "three";
import { geoToSphere, GLOBE_RADIUS } from "./coordinates";

/**
 * Morphable lat/lon grid covering the whole globe, for raster layers
 * (physical, topography, heatmap, ocean). Provides `spherePosition`,
 * `lonLat` (degrees, projected in the vertex shader) and equirectangular
 * `uv` = ((lon + 180) / 360, (lat + 90) / 180).
 *
 * @param widthSegments segments around the equator (height = width / 2)
 * @param radiusScale   sphere radius relative to the globe (layer stacking)
 */
export function buildGlobeGrid(widthSegments: number, radiusScale: number): THREE.BufferGeometry {
  const heightSegments = widthSegments / 2;
  const vertexCount = (widthSegments + 1) * (heightSegments + 1);
  const spherePositions = new Float32Array(vertexCount * 3);
  const lonLat = new Float32Array(vertexCount * 2);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  let v = 0;
  for (let y = 0; y <= heightSegments; y++) {
    // Latitude from the north pole (90) to the south pole (-90)
    const latitude = 90 - (y / heightSegments) * 180;
    for (let x = 0; x <= widthSegments; x++) {
      const longitude = (x / widthSegments) * 360 - 180;
      const p = geoToSphere(longitude, latitude, GLOBE_RADIUS * radiusScale);
      spherePositions.set([p.x, p.y, p.z], v * 3);
      lonLat.set([longitude, latitude], v * 2);
      uvs.set([(longitude + 180) / 360, (latitude + 90) / 180], v * 2);
      v++;
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + 1;
      const c = a + (widthSegments + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  const sphereAttr = new THREE.BufferAttribute(spherePositions, 3);
  // `position` is required by three.js; the vertex shader uses the morph attributes instead
  geometry.setAttribute("position", sphereAttr);
  geometry.setAttribute("spherePosition", sphereAttr);
  geometry.setAttribute("lonLat", new THREE.BufferAttribute(lonLat, 2));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
