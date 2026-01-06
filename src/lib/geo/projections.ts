import { geoMercator, geoOrthographic, geoPath, geoEquirectangular, geoCentroid } from "d3-geo";
import type { Feature, Geometry, Position, Polygon, MultiPolygon, GeoJsonProperties } from "geojson";
import type { ProjectionConfig, GeoCoordinate } from "@/types/geo";

// ==========================================
// D3 Projection Factory
// ==========================================

export function createProjection(config: ProjectionConfig) {
  const { type, scale, center, rotation } = config;

  switch (type) {
    case "orthographic":
      return geoOrthographic()
        .scale(scale)
        .center(center)
        .rotate(rotation)
        .clipAngle(90);

    case "mercator":
      return geoMercator()
        .scale(scale)
        .center(center)
        .rotate([rotation[0], 0, 0]);

    case "equirectangular":
    default:
      return geoEquirectangular()
        .scale(scale)
        .center(center)
        .rotate([rotation[0], 0, 0]);
  }
}

// ==========================================
// Feature Processing
// ==========================================

/**
 * Extract all coordinate rings from a GeoJSON feature
 */
export function extractCoordinateRings(
  feature: Feature<Geometry, GeoJsonProperties>
): Position[][] {
  const geometry = feature.geometry;
  const rings: Position[][] = [];

  if (!geometry) return rings;

  switch (geometry.type) {
    case "Polygon":
      rings.push(...(geometry as Polygon).coordinates);
      break;

    case "MultiPolygon":
      for (const polygon of (geometry as MultiPolygon).coordinates) {
        rings.push(...polygon);
      }
      break;

    case "LineString":
      rings.push(geometry.coordinates as Position[]);
      break;

    case "MultiLineString":
      rings.push(...(geometry.coordinates as Position[][]));
      break;

    case "Point":
      rings.push([geometry.coordinates as Position]);
      break;

    case "MultiPoint":
      rings.push(geometry.coordinates as Position[]);
      break;
  }

  return rings;
}

/**
 * Get the centroid of a GeoJSON feature
 */
export function getFeatureCentroid(
  feature: Feature<Geometry, GeoJsonProperties>
): GeoCoordinate | null {
  try {
    const [longitude, latitude] = geoCentroid(feature);
    if (isNaN(longitude) || isNaN(latitude)) return null;
    return { longitude, latitude };
  } catch {
    return null;
  }
}

/**
 * Get bounds of a feature [west, south, east, north]
 */
export function getFeatureBounds(
  feature: Feature<Geometry, GeoJsonProperties>
): [number, number, number, number] | null {
  const rings = extractCoordinateRings(feature);
  if (rings.length === 0) return null;

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }

  return [minLon, minLat, maxLon, maxLat];
}

// ==========================================
// SVG Path Generation (for debugging/2D fallback)
// ==========================================

/**
 * Generate SVG path string for a feature
 */
export function featureToPath(
  feature: Feature<Geometry, GeoJsonProperties>,
  projection: ReturnType<typeof createProjection>
): string | null {
  const pathGenerator = geoPath(projection);
  return pathGenerator(feature);
}

// ==========================================
// Coordinate Transformation Utilities
// ==========================================

/**
 * Project a geographic coordinate using D3 projection
 */
export function projectCoordinate(
  coord: GeoCoordinate,
  projection: ReturnType<typeof createProjection>
): [number, number] | null {
  const result = projection([coord.longitude, coord.latitude]);
  return result as [number, number] | null;
}

/**
 * Invert a projected coordinate back to geographic
 */
export function unprojectCoordinate(
  x: number,
  y: number,
  projection: ReturnType<typeof createProjection>
): GeoCoordinate | null {
  const invert = projection.invert;
  if (!invert) return null;

  const result = invert([x, y]);
  if (!result) return null;

  return {
    longitude: result[0],
    latitude: result[1],
  };
}

// ==========================================
// Default Projection Configs
// ==========================================

export const DEFAULT_ORTHOGRAPHIC: ProjectionConfig = {
  type: "orthographic",
  scale: 250,
  center: [0, 0],
  rotation: [0, 0, 0],
};

export const DEFAULT_MERCATOR: ProjectionConfig = {
  type: "mercator",
  scale: 150,
  center: [0, 0],
  rotation: [0, 0, 0],
};

export const DEFAULT_EQUIRECTANGULAR: ProjectionConfig = {
  type: "equirectangular",
  scale: 150,
  center: [0, 0],
  rotation: [0, 0, 0],
};
