"use client";

// three.js uniforms are mutated imperatively by design (R3F pattern)
/* eslint-disable react-hooks/immutability */

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildGlobeGrid } from "@/lib/geo/globeGrid";
import { createMorphUniforms, morphVertexGlsl, syncMorphUniforms } from "@/lib/geo/morphShader";
import { useProgressiveTexture } from "@/lib/textures/useProgressiveTexture";

// ==========================================
// Constants - Must match coordinates.ts
// ==========================================

const SEGMENTS = 128;

// Topography renders between physical (0.998) and political (1.0) layers
const SPHERE_OFFSET = 0.999;
const FLAT_Z_OFFSET = -0.005;

// Available KTX2 tiers (see scripts/build-textures.mjs)
const HYPSOMETRIC_TIERS_K = [2, 4, 8, 16];
const ELEVATION_TIERS_K = [2, 4, 8];

// ==========================================
// TopographyLayer Component
// ==========================================

export const TopographyLayer = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Progressive KTX2 textures (elevation is linear data, not color)
  const hypsometricTexture = useProgressiveTexture("earth_hypsometric", HYPSOMETRIC_TIERS_K);
  const elevationTexture = useProgressiveTexture("earth_elevation", ELEVATION_TIERS_K, {
    srgb: false,
  });

  // Morphable lat/lon grid (flat position is projected in the vertex shader)
  const geometry = useMemo(() => buildGlobeGrid(SEGMENTS, SPHERE_OFFSET), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Update uniforms every frame
  useFrame(() => {
    if (materialRef.current) {
      syncMorphUniforms(materialRef.current.uniforms);
    }
  });

  // Custom shader material with hypsometric tint + contour lines
  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...createMorphUniforms(FLAT_Z_OFFSET),
          hypsometricMap: { value: null },
          elevationMap: { value: null },
          contourCount: { value: 20.0 },
          contourColor: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
          contourOpacity: { value: 0.3 },
        },
        vertexShader: `
        ${morphVertexGlsl}

        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(morphPosition(), 1.0);
        }
      `,
        fragmentShader: `
        uniform sampler2D hypsometricMap;
        uniform sampler2D elevationMap;
        uniform float contourCount;
        uniform vec3 contourColor;
        uniform float contourOpacity;

        varying vec2 vUv;

        void main() {
          // Base color from hypsometric tint texture
          vec4 baseColor = texture2D(hypsometricMap, vUv);

          // Elevation from grayscale DEM texture
          float elevation = texture2D(elevationMap, vUv).r;

          // Contour lines using fract + fwidth for antialiasing
          float contourVal = fract(elevation * contourCount);
          float fw = fwidth(elevation * contourCount);
          float contourLine = smoothstep(fw * 1.5, 0.0, contourVal) + smoothstep(1.0 - fw * 1.5, 1.0, contourVal);
          contourLine = clamp(contourLine, 0.0, 1.0);

          // Composite: base color with contour overlay
          vec3 finalColor = mix(baseColor.rgb, contourColor, contourLine * contourOpacity);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // <primitive> objects are not auto-disposed by R3F
  useEffect(() => () => shaderMaterial.dispose(), [shaderMaterial]);

  // Swap in higher-resolution tiers as they arrive, without rebuilding the material
  useEffect(() => {
    shaderMaterial.uniforms.hypsometricMap.value = hypsometricTexture;
    shaderMaterial.uniforms.elevationMap.value = elevationTexture;
  }, [shaderMaterial, hypsometricTexture, elevationTexture]);

  if (!hypsometricTexture || !elevationTexture) {
    return null;
  }

  return (
    <mesh geometry={geometry} material={shaderMaterial}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
};

export default TopographyLayer;
