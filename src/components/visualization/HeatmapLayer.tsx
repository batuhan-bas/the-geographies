"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useHeatmap, useLayers, morphProgressRef } from "@/store/hooks";
import { computeHeatmapTexture } from "@/lib/visualization";

// ==========================================
// Constants
// ==========================================

const GLOBE_RADIUS = 1.0;
const FLAT_SCALE = 2.0;
const SEGMENTS = 64;
const DEG_TO_RAD = Math.PI / 180;

// Render above political layer
const SPHERE_OFFSET = 1.003;
const FLAT_Z_OFFSET = 0.005;

// ==========================================
// HeatmapLayer Component
// ==========================================

export function HeatmapLayer() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { config, points } = useHeatmap();
  const { activeLayers } = useLayers();

  // Compute density texture when points change
  const texture = useMemo(() => {
    if (points.length === 0) return null;
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
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const widthSegments = SEGMENTS;
    const heightSegments = SEGMENTS / 2;

    const spherePositions: number[] = [];
    const flatPositions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= heightSegments; y++) {
      const latitude = 90 - (y / heightSegments) * 180;

      for (let x = 0; x <= widthSegments; x++) {
        const longitude = (x / widthSegments) * 360 - 180;

        // Sphere position
        const phi = (90 - latitude) * DEG_TO_RAD;
        const theta = (longitude + 180) * DEG_TO_RAD;
        const radius = GLOBE_RADIUS * SPHERE_OFFSET;

        spherePositions.push(
          -radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );

        // Flat position
        flatPositions.push(
          (longitude / 180) * FLAT_SCALE,
          (latitude / 90) * FLAT_SCALE * 0.5,
          FLAT_Z_OFFSET
        );

        // UV - must match kernel coordinates exactly
        // Kernel uses: u = (lon + 180) / 360, v = (lat + 90) / 180
        const u = (longitude + 180) / 360;
        const v = (latitude + 90) / 180;
        uvs.push(u, v);
      }
    }

    // Create indices
    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x;
        const b = a + 1;
        const c = a + (widthSegments + 1);
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(spherePositions, 3)
    );
    geo.setAttribute(
      "spherePosition",
      new THREE.Float32BufferAttribute(spherePositions, 3)
    );
    geo.setAttribute(
      "flatPosition",
      new THREE.Float32BufferAttribute(flatPositions, 3)
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, []);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    // Create empty texture placeholder
    const emptyTexture = new THREE.DataTexture(
      new Uint8Array(4),
      1,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    emptyTexture.needsUpdate = true;

    return new THREE.ShaderMaterial({
      uniforms: {
        morphProgress: { value: 0 },
        heatmapTexture: { value: texture || emptyTexture },
        opacity: { value: config.opacity },
      },
      vertexShader: `
        attribute vec3 spherePosition;
        attribute vec3 flatPosition;

        uniform float morphProgress;

        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 morphedPosition = mix(spherePosition, flatPosition, morphProgress);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
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
      materialRef.current.uniforms.morphProgress.value =
        morphProgressRef.current;
      materialRef.current.uniforms.opacity.value = config.opacity;
    }
  });

  // Don't render if layer is not active or no data
  if (
    !activeLayers.has("heatmap") ||
    !config.enabled ||
    points.length === 0 ||
    !texture
  ) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={8} frustumCulled={false}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default HeatmapLayer;
