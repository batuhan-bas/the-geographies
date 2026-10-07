import * as THREE from "three";
import type { CountryGeometryData } from "@/types/geo";
import { geoToFlat, geoToSphere, GLOBE_RADIUS } from "./coordinates";

// ==========================================
// GPU geometry from prebuilt country data
// ==========================================

/** Write sphere/flat positions for interleaved lon/lat into the target arrays */
function projectLonLat(
  lonLat: Float32Array,
  sphereRadius: number,
  flatZ: number,
): { sphere: Float32Array; flat: Float32Array } {
  const count = lonLat.length / 2;
  const sphere = new Float32Array(count * 3);
  const flat = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const lon = lonLat[i * 2];
    const lat = lonLat[i * 2 + 1];
    const s = geoToSphere(lon, lat, sphereRadius);
    const f = geoToFlat(lon, lat);
    sphere[i * 3] = s.x;
    sphere[i * 3 + 1] = s.y;
    sphere[i * 3 + 2] = s.z;
    flat[i * 3] = f.x;
    flat[i * 3 + 1] = f.y;
    flat[i * 3 + 2] = f.z + flatZ;
  }
  return { sphere, flat };
}

function morphGeometry(
  lonLat: Float32Array,
  countryIds: Uint16Array,
  sphereRadius: number,
  flatZ: number,
): THREE.BufferGeometry {
  const { sphere, flat } = projectLonLat(lonLat, sphereRadius, flatZ);
  const geometry = new THREE.BufferGeometry();
  const sphereAttr = new THREE.BufferAttribute(sphere, 3);
  // `position` is required by three.js; the vertex shader uses the morph attributes instead
  geometry.setAttribute("position", sphereAttr);
  geometry.setAttribute("spherePosition", sphereAttr);
  geometry.setAttribute("flatPosition", new THREE.BufferAttribute(flat, 3));
  geometry.setAttribute(
    "countryIndex",
    new THREE.BufferAttribute(Float32Array.from(countryIds), 1),
  );
  return geometry;
}

/**
 * All country fills in one indexed geometry: `spherePosition`, `flatPosition`
 * and a per-vertex `countryIndex` for per-country styling and picking.
 */
export function buildCountryFillGeometry(data: CountryGeometryData): THREE.BufferGeometry {
  const geometry = morphGeometry(data.fillLonLat, data.fillCountry, GLOBE_RADIUS, 0);
  geometry.setIndex(new THREE.BufferAttribute(data.fillIndex, 1));
  return geometry;
}

/** All borders as non-indexed line segments (two vertices per segment) */
export function buildCountryBorderGeometry(
  data: CountryGeometryData,
  sphereRadius: number,
  flatZ: number,
): THREE.BufferGeometry {
  return morphGeometry(data.borderLonLat, data.borderCountry, sphereRadius, flatZ);
}
