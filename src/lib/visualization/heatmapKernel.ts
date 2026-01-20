import * as THREE from "three";
import type { HeatmapPoint, HeatmapConfig } from "@/types/visualization";

/**
 * Compute a density texture for heatmap rendering
 * Uses Gaussian kernel density estimation
 */
export function computeHeatmapTexture(
  points: HeatmapPoint[],
  config: HeatmapConfig
): THREE.DataTexture {
  const { resolution, radius, blur, maxIntensity } = config;
  const data = new Float32Array(resolution * resolution);

  if (points.length === 0) {
    // Return empty texture
    const texture = new THREE.DataTexture(
      new Uint8Array(resolution * resolution),
      resolution,
      resolution,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    return texture;
  }

  // Convert radius from degrees to normalized texture space (0-1)
  const radiusNorm = radius / 180;
  const radiusSq = radiusNorm * radiusNorm;
  const blurFactor = Math.max(0.1, blur);

  for (const point of points) {
    // Convert geographic to texture coordinates (0-1)
    // Longitude: -180 to 180 -> 0 to 1
    // Latitude: -90 to 90 -> 0 to 1
    const u = (point.position.longitude + 180) / 360;
    const v = (point.position.latitude + 90) / 180;

    // Kernel radius in pixels
    const kernelRadius = Math.ceil(radiusNorm * resolution);
    const cx = Math.floor(u * resolution);
    const cy = Math.floor(v * resolution);

    // Apply Gaussian kernel
    for (let dy = -kernelRadius; dy <= kernelRadius; dy++) {
      for (let dx = -kernelRadius; dx <= kernelRadius; dx++) {
        let px = cx + dx;
        let py = cy + dy;

        // Wrap horizontally (longitude wraps around)
        if (px < 0) px += resolution;
        if (px >= resolution) px -= resolution;

        // Clamp vertically (latitude doesn't wrap)
        if (py < 0 || py >= resolution) continue;

        // Calculate normalized distance
        const distX = dx / resolution;
        const distY = dy / resolution;
        const distSq = distX * distX + distY * distY;

        if (distSq > radiusSq) continue;

        // Gaussian falloff: exp(-d^2 / (2 * sigma^2))
        const sigma = radiusNorm * blurFactor;
        const weight = Math.exp(-distSq / (2 * sigma * sigma));

        const idx = py * resolution + px;
        data[idx] += point.intensity * weight;
      }
    }
  }

  // Find maximum value for normalization
  let maxVal = 0;
  for (let i = 0; i < data.length; i++) {
    maxVal = Math.max(maxVal, data[i]);
  }

  // Normalize to 0-255 range
  const normalizedData = new Uint8Array(resolution * resolution);
  const normFactor = maxIntensity > 0 ? maxIntensity : maxVal;

  if (normFactor > 0) {
    for (let i = 0; i < data.length; i++) {
      const normalized = Math.min(1, data[i] / normFactor);
      normalizedData[i] = Math.floor(normalized * 255);
    }
  }

  // Create texture
  const texture = new THREE.DataTexture(
    normalizedData,
    resolution,
    resolution,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );

  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

/**
 * Generate random heatmap points for testing
 */
export function generateRandomHeatmapPoints(
  count: number,
  intensityRange: [number, number] = [0.3, 1]
): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];

  for (let i = 0; i < count; i++) {
    points.push({
      position: {
        longitude: Math.random() * 360 - 180,
        latitude: Math.random() * 170 - 85, // Avoid exact poles
      },
      intensity:
        intensityRange[0] +
        Math.random() * (intensityRange[1] - intensityRange[0]),
    });
  }

  return points;
}

/**
 * Generate clustered heatmap points around specific locations
 */
export function generateClusteredHeatmapPoints(
  centers: Array<{ longitude: number; latitude: number }>,
  pointsPerCluster: number,
  spread: number = 10,
  intensityRange: [number, number] = [0.5, 1]
): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];

  for (const center of centers) {
    for (let i = 0; i < pointsPerCluster; i++) {
      // Gaussian distribution around center
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.abs(gaussianRandom() * spread);

      const lon = center.longitude + Math.cos(angle) * distance;
      const lat = Math.max(
        -85,
        Math.min(85, center.latitude + Math.sin(angle) * distance)
      );

      points.push({
        position: {
          longitude: ((lon + 180) % 360) - 180, // Wrap longitude
          latitude: lat,
        },
        intensity:
          intensityRange[0] +
          Math.random() * (intensityRange[1] - intensityRange[0]),
      });
    }
  }

  return points;
}

// Box-Muller transform for Gaussian random
function gaussianRandom(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
