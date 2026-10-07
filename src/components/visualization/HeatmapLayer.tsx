"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useHeatmap, useLayers } from "@/store/hooks";
import { buildGlobeGrid } from "@/lib/geo/globeGrid";
import { createMorphUniforms, morphVertexGlsl, syncMorphUniforms } from "@/lib/geo/morphShader";
import { computeHeatmapTexture } from "@/lib/visualization";

// ==========================================
// Constants
// ==========================================

const SEGMENTS = 64;

// Render above political layer
const SPHERE_OFFSET = 1.003;
const FLAT_Z_OFFSET = 0.005;

// ==========================================
// HeatmapLayer Component
// ==========================================

export const HeatmapLayer = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { config, points } = useHeatmap();
  const { activeLayers } = useLayers();

  // Compute density texture when points change
  const texture = useMemo(() => {
    if (points.length === 0) {
      return null;
    }
    return computeHeatmapTexture(points, config);
  }, [points, config.radius, config.resolution, config.blur, config.maxIntensity]);

  // Update texture on material when it changes
  useEffect(() => {
    if (materialRef.current && texture) {
      materialRef.current.uniforms.heatmapTexture.value = texture;
      materialRef.current.uniforms.heatmapTexture.value.needsUpdate = true;
    }
  }, [texture]);

  // Create morphable geometry
  // Morphable lat/lon grid (flat position is projected in the vertex shader)
  const geometry = useMemo(() => buildGlobeGrid(SEGMENTS, SPHERE_OFFSET), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    // Create empty texture placeholder
    const emptyTexture = new THREE.DataTexture(
      new Uint8Array(4),
      1,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    emptyTexture.needsUpdate = true;

    return new THREE.ShaderMaterial({
      uniforms: {
        ...createMorphUniforms(FLAT_Z_OFFSET),
        heatmapTexture: { value: texture || emptyTexture },
        opacity: { value: config.opacity },
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
        uniform sampler2D heatmapTexture;
        uniform float opacity;

        varying vec2 vUv;

        void main() {
          float intensity = texture2D(heatmapTexture, vUv).r;

          // Discard very low intensity to keep it transparent
          if (intensity < 0.02) discard;

          // Heat color gradient: dark -> purple -> blue -> cyan -> green -> yellow -> red
          vec3 color;
          if (intensity < 0.2) {
            color = mix(vec3(0.0, 0.0, 0.1), vec3(0.2, 0.0, 0.5), intensity * 5.0);
          } else if (intensity < 0.4) {
            color = mix(vec3(0.2, 0.0, 0.5), vec3(0.0, 0.5, 1.0), (intensity - 0.2) * 5.0);
          } else if (intensity < 0.6) {
            color = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.5), (intensity - 0.4) * 5.0);
          } else if (intensity < 0.8) {
            color = mix(vec3(0.0, 1.0, 0.5), vec3(1.0, 1.0, 0.0), (intensity - 0.6) * 5.0);
          } else {
            color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (intensity - 0.8) * 5.0);
          }

          // Apply opacity with intensity-based alpha
          float alpha = intensity * opacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [texture, config.opacity]);

  // Update morph progress every frame
  useFrame(() => {
    if (materialRef.current) {
      syncMorphUniforms(materialRef.current.uniforms);
      materialRef.current.uniforms.opacity.value = config.opacity;
    }
  });

  // Don't render if layer is not active or no data
  if (!activeLayers.has("heatmap") || !config.enabled || points.length === 0 || !texture) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={8} frustumCulled={false}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
};

export default HeatmapLayer;
