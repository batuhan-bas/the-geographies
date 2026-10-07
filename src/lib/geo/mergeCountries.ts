import * as THREE from "three";
import type { CountryGeometryData } from "@/types/geo";
import { geoToSphere, GLOBE_RADIUS } from "./coordinates";

// ==========================================
// GPU geometry from prebuilt country data
// ==========================================

/**
 * Morphable geometry: `spherePosition` for the globe, `lonLat` (degrees) for
 * the flat projection computed in the vertex shader, and a per-vertex
 * `countryIndex` for per-country styling and picking.
 */
function morphGeometry(
  lonLat: Float32Array,
  countryIds: Uint16Array,
  sphereRadius: number,
): THREE.BufferGeometry {
  const count = lonLat.length / 2;
  const sphere = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const p = geoToSphere(lonLat[i * 2], lonLat[i * 2 + 1], sphereRadius);
    sphere[i * 3] = p.x;
    sphere[i * 3 + 1] = p.y;
    sphere[i * 3 + 2] = p.z;
  }

  const geometry = new THREE.BufferGeometry();
  const sphereAttr = new THREE.BufferAttribute(sphere, 3);
  // `position` is required by three.js; the vertex shader uses the morph attributes instead
  geometry.setAttribute("position", sphereAttr);
  geometry.setAttribute("spherePosition", sphereAttr);
  geometry.setAttribute("lonLat", new THREE.BufferAttribute(lonLat, 2));
  geometry.setAttribute(
    "countryIndex",
    new THREE.BufferAttribute(Float32Array.from(countryIds), 1),
  );
  return geometry;
}

/** All country fills in one indexed geometry */
export function buildCountryFillGeometry(data: CountryGeometryData): THREE.BufferGeometry {
  const geometry = morphGeometry(data.fillLonLat, data.fillCountry, GLOBE_RADIUS);
  geometry.setIndex(new THREE.BufferAttribute(data.fillIndex, 1));
  return geometry;
}

/** All borders as non-indexed line segments (two vertices per segment) */
export function buildCountryBorderGeometry(
  data: CountryGeometryData,
  sphereRadius: number,
): THREE.BufferGeometry {
  return morphGeometry(data.borderLonLat, data.borderCountry, sphereRadius);
}
