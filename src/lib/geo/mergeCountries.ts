import * as THREE from "three";
import type { CountryFeature } from "@/types/geo";
import { featureToMorphableGeometry, subdivideLargeTriangles } from "./morphing";

// ==========================================
// Merged Country Geometry
// ==========================================

/**
 * Build a single BufferGeometry containing every country.
 *
 * Each vertex carries `spherePosition`, `flatPosition` and a `countryIndex`
 * (index into `features`), so the whole political layer renders in one draw
 * call and per-country styling is looked up in the shader.
 */
export function buildMergedCountryGeometry(features: CountryFeature[]): THREE.BufferGeometry {
  const spherePositions: number[] = [];
  const flatPositions: number[] = [];
  const countryIndices: number[] = [];
  const indices: number[] = [];

  features.forEach((feature, countryIndex) => {
    const morphable = featureToMorphableGeometry(feature);
    if (!morphable || morphable.indices.length === 0) {
      return;
    }

    const subdivided = subdivideLargeTriangles(morphable);
    const indexOffset = countryIndices.length;

    for (const p of subdivided.positions) {
      spherePositions.push(p.sphere.x, p.sphere.y, p.sphere.z);
      flatPositions.push(p.flat.x, p.flat.y, p.flat.z);
      countryIndices.push(countryIndex);
    }
    for (const idx of subdivided.indices) {
      indices.push(idx + indexOffset);
    }
  });

  const geometry = new THREE.BufferGeometry();
  const sphereAttr = new THREE.Float32BufferAttribute(spherePositions, 3);

  // `position` is required by three.js; the vertex shader uses the morph attributes instead
  geometry.setAttribute("position", sphereAttr);
  geometry.setAttribute("spherePosition", sphereAttr);
  geometry.setAttribute("flatPosition", new THREE.Float32BufferAttribute(flatPositions, 3));
  geometry.setAttribute("countryIndex", new THREE.Float32BufferAttribute(countryIndices, 1));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

  return geometry;
}
