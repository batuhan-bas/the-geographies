"use client";

// three.js uniforms are mutated imperatively by design (R3F pattern)
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Position } from "geojson";
import type { CountryFeature } from "@/types/geo";
import { geoToSphere, geoToFlat, GLOBE_RADIUS } from "@/lib/geo/coordinates";
import { morphProgressRef } from "@/store/hooks";

// Borders sit just above the country fill to avoid z-fighting
const SPHERE_OFFSET = 1.001;
const FLAT_Z_OFFSET = 0.002;

interface CountryBordersProps {
  countries: CountryFeature[];
  /** Hide Antarctica (flat mode) without rebuilding geometry */
  hideAntarctica?: boolean;
  color?: string;
  opacity?: number;
}

/**
 * Outer ring of each polygon (holes are not rendered, matching the country fill)
 */
function extractBorderRings(feature: CountryFeature): Position[][] {
  const { geometry } = feature;
  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0]];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygon[0]);
  }
  return [];
}

/**
 * Build all borders as one LineSegments geometry with sphere/flat endpoints.
 * Segments crossing the antimeridian are dropped so the flat map has no
 * lines streaking across the whole width.
 */
function buildBorderGeometry(countries: CountryFeature[]): THREE.BufferGeometry {
  const spherePositions: number[] = [];
  const flatPositions: number[] = [];
  const antarctica: number[] = [];

  const pushVertex = (lon: number, lat: number, isAntarctica: number) => {
    const sphere = geoToSphere(lon, lat, GLOBE_RADIUS * SPHERE_OFFSET);
    const flat = geoToFlat(lon, lat);
    spherePositions.push(sphere.x, sphere.y, sphere.z);
    flatPositions.push(flat.x, flat.y, flat.z + FLAT_Z_OFFSET);
    antarctica.push(isAntarctica);
  };

  for (const country of countries) {
    const isAntarctica = country.properties?.continent === "Antarctica" ? 1 : 0;
    for (const ring of extractBorderRings(country)) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lon0, lat0] = ring[i];
        const [lon1, lat1] = ring[i + 1];
        if (Math.abs(lon1 - lon0) > 180) {
          continue;
        }
        pushVertex(lon0, lat0, isAntarctica);
        pushVertex(lon1, lat1, isAntarctica);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  const sphereAttr = new THREE.Float32BufferAttribute(spherePositions, 3);
  // `position` is required by three.js; the vertex shader uses the morph attributes instead
  geometry.setAttribute("position", sphereAttr);
  geometry.setAttribute("spherePosition", sphereAttr);
  geometry.setAttribute("flatPosition", new THREE.Float32BufferAttribute(flatPositions, 3));
  geometry.setAttribute("antarctica", new THREE.Float32BufferAttribute(antarctica, 1));
  return geometry;
}

const vertexShader = /* glsl */ `
  attribute vec3 spherePosition;
  attribute vec3 flatPosition;
  attribute float antarctica;

  uniform float morphProgress;
  uniform bool hideAntarctica;

  varying float vHidden;

  void main() {
    vHidden = hideAntarctica ? antarctica : 0.0;
    vec3 morphedPosition = mix(spherePosition, flatPosition, morphProgress);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;

  varying float vHidden;

  void main() {
    if (vHidden > 0.5) {
      discard;
    }
    gl_FragColor = vec4(color, opacity);
  }
`;

/**
 * All country borders in a single draw call, morphed on the GPU so they
 * animate together with the country fill.
 */
export const CountryBorders = ({
  countries,
  hideAntarctica = false,
  color = "#ffffff",
  opacity = 0.15,
}: CountryBordersProps) => {
  const geometry = useMemo(() => buildBorderGeometry(countries), [countries]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          morphProgress: { value: morphProgressRef.current },
          hideAntarctica: { value: false },
          color: { value: new THREE.Color() },
          opacity: { value: 1 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.color.value.set(color);
    material.uniforms.opacity.value = opacity;
    material.uniforms.hideAntarctica.value = hideAntarctica;
  }, [material, color, opacity, hideAntarctica]);

  useFrame(() => {
    material.uniforms.morphProgress.value = morphProgressRef.current;
  });

  return (
    <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
  );
};

export default CountryBorders;
