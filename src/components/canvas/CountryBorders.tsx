"use client";

// three.js uniforms are mutated imperatively by design (R3F pattern)
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CountryFeature, CountryGeometryData } from "@/types/geo";
import { buildCountryBorderGeometry } from "@/lib/geo/mergeCountries";
import { createMorphUniforms, morphVertexGlsl, syncMorphUniforms } from "@/lib/geo/morphShader";

// Borders sit just above the country fill to avoid z-fighting
const SPHERE_OFFSET = 1.001;
const FLAT_Z_OFFSET = 0.002;

interface CountryBordersProps {
  countries: CountryFeature[];
  geometryData: CountryGeometryData;
  /** Hide Antarctica (flat mode) without rebuilding geometry */
  hideAntarctica?: boolean;
  color?: string;
  opacity?: number;
}

const vertexShader = /* glsl */ `
  attribute float countryIndex;

  ${morphVertexGlsl}

  uniform float hiddenCountry;

  varying float vHidden;

  void main() {
    vHidden = abs(countryIndex - hiddenCountry) < 0.5 ? 1.0 : 0.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(morphPosition(), 1.0);
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
  geometryData,
  hideAntarctica = false,
  color = "#ffffff",
  opacity = 0.15,
}: CountryBordersProps) => {
  const geometry = useMemo(
    () => buildCountryBorderGeometry(geometryData, SPHERE_OFFSET),
    [geometryData],
  );
  const antarcticaIndex = useMemo(
    () => countries.findIndex((c) => c.properties.continent === "Antarctica"),
    [countries],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...createMorphUniforms(FLAT_Z_OFFSET),
          hiddenCountry: { value: -1 },
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
    material.uniforms.hiddenCountry.value = hideAntarctica ? antarcticaIndex : -1;
  }, [material, color, opacity, hideAntarctica, antarcticaIndex]);

  useFrame(() => {
    syncMorphUniforms(material.uniforms);
  });

  return (
    <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
  );
};

export default CountryBorders;
