import type { GeoCoordinate, CartesianCoordinate, MorphablePosition } from "@/types/geo";

// ==========================================
// Constants
// ==========================================

export const GLOBE_RADIUS = 1;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// ==========================================
// Coordinate Conversions
// ==========================================

/**
 * Convert geographic coordinates (lon, lat) to spherical 3D coordinates
 * Used for Globe view
 */
export function geoToSphere(
  longitude: number,
  latitude: number,
  radius: number = GLOBE_RADIUS
): CartesianCoordinate {
  const phi = (90 - latitude) * DEG_TO_RAD;
  const theta = (longitude + 180) * DEG_TO_RAD;

  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

/**
 * Convert geographic coordinates to flat 2D plane (Z = 0)
 * Uses Equirectangular projection for flat view
 * Scale matches globe radius for smooth morphing
 */
export function geoToFlat(
  longitude: number,
  latitude: number,
  scale: number = 2
): CartesianCoordinate {
  // Equirectangular projection - simple linear mapping
  // Scale of 2 makes the map roughly match the globe diameter
  const x = (longitude / 180) * scale;
  const y = (latitude / 90) * scale * 0.5; // Maintain aspect ratio

  return { x, y, z: 0 };
}

/**
 * Convert spherical coordinates back to geographic
 */
export function sphereToGeo(
  x: number,
  y: number,
  z: number
): GeoCoordinate {
  const radius = Math.sqrt(x * x + y * y + z * z);
  const latitude = Math.acos(y / radius) * RAD_TO_DEG - 90;
  const longitude = Math.atan2(z, -x) * RAD_TO_DEG - 180;

  return {
    longitude: longitude < -180 ? longitude + 360 : longitude,
    latitude: -latitude,
  };
}

// ==========================================
// Morphable Position Creation
// ==========================================

/**
 * Create a morphable position from geographic coordinates
 * Contains both sphere and flat representations for interpolation
 */
export function createMorphablePosition(
  longitude: number,
  latitude: number
): MorphablePosition {
  return {
    sphere: geoToSphere(longitude, latitude),
    flat: geoToFlat(longitude, latitude),
    geo: { longitude, latitude },
  };
}

/**
 * Convert a GeoJSON Position [lon, lat] to morphable position
 */
export function positionToMorphable(position: [number, number]): MorphablePosition {
  return createMorphablePosition(position[0], position[1]);
}

// ==========================================
// Interpolation
// ==========================================

/**
 * Interpolate between sphere and flat positions
 * t = 0 -> sphere (globe view)
 * t = 1 -> flat (mercator view)
 */
export function interpolatePosition(
  morphable: MorphablePosition,
  t: number
): CartesianCoordinate {
  const clampedT = Math.max(0, Math.min(1, t));

  return {
    x: morphable.sphere.x + (morphable.flat.x - morphable.sphere.x) * clampedT,
    y: morphable.sphere.y + (morphable.flat.y - morphable.sphere.y) * clampedT,
    z: morphable.sphere.z + (morphable.flat.z - morphable.sphere.z) * clampedT,
  };
}

/**
 * Create a Float32Array of interpolated positions for GPU upload
 */
export function createInterpolatedPositionArray(
  morphablePositions: MorphablePosition[],
  t: number
): Float32Array {
  const array = new Float32Array(morphablePositions.length * 3);

  for (let i = 0; i < morphablePositions.length; i++) {
    const pos = interpolatePosition(morphablePositions[i], t);
    const idx = i * 3;
    array[idx] = pos.x;
    array[idx + 1] = pos.y;
    array[idx + 2] = pos.z;
  }

  return array;
}

// ==========================================
// Geometry Utilities
// ==========================================

/**
 * Calculate the centroid of a set of positions
 */
export function calculateCentroid(
  positions: CartesianCoordinate[]
): CartesianCoordinate {
  if (positions.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const sum = positions.reduce(
    (acc, pos) => ({
      x: acc.x + pos.x,
      y: acc.y + pos.y,
      z: acc.z + pos.z,
    }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: sum.x / positions.length,
    y: sum.y / positions.length,
    z: sum.z / positions.length,
  };
}

/**
 * Calculate the geographic centroid from morphable positions
 */
export function calculateGeoCentroid(
  positions: MorphablePosition[]
): GeoCoordinate {
  if (positions.length === 0) {
    return { longitude: 0, latitude: 0 };
  }

  const sum = positions.reduce(
    (acc, pos) => ({
      longitude: acc.longitude + pos.geo.longitude,
      latitude: acc.latitude + pos.geo.latitude,
    }),
    { longitude: 0, latitude: 0 }
  );

  return {
    longitude: sum.longitude / positions.length,
    latitude: sum.latitude / positions.length,
  };
}

/**
 * Normalize a 3D vector
 */
export function normalize(v: CartesianCoordinate): CartesianCoordinate {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };

  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}

/**
 * Calculate distance between two 3D points
 */
export function distance(
  a: CartesianCoordinate,
  b: CartesianCoordinate
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
