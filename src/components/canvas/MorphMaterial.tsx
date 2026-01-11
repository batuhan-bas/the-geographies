"use client";

import React from "react";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { extend } from "@react-three/fiber";

/**
 * Custom shader material for GPU-based morphing between sphere and flat positions
 * Includes day/night lighting effect for globe mode
 */
const MorphShaderMaterial = shaderMaterial(
  // Uniforms
  {
    morphProgress: 0,
    color: new THREE.Color("#4a7c59"),
    emissive: new THREE.Color("#000000"),
    emissiveIntensity: 0,
    roughness: 0.7,
    metalness: 0.1,
    sunDirection: new THREE.Vector3(1, 0.3, 0.5).normalize(),
    nightColor: new THREE.Color("#0a1628"),
    enableDayNight: true,
  },
  // Vertex Shader
  `
    attribute vec3 spherePosition;
    attribute vec3 flatPosition;

    uniform float morphProgress;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      // Interpolate between sphere and flat positions on GPU
      vec3 morphedPosition = mix(spherePosition, flatPosition, morphProgress);

      // Calculate morphed normal
      // For sphere: normal points outward from center (normalized position)
      // For flat: normal points towards +Z
      vec3 sphereNormal = normalize(spherePosition);
      vec3 flatNormal = vec3(0.0, 0.0, 1.0);
      vec3 morphedNormal = normalize(mix(sphereNormal, flatNormal, morphProgress));

      vNormal = normalMatrix * morphedNormal;

      vec4 mvPosition = modelViewMatrix * vec4(morphedPosition, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(morphedPosition, 1.0)).xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    uniform vec3 color;
    uniform vec3 emissive;
    uniform float emissiveIntensity;
    uniform float roughness;
    uniform float metalness;
    uniform vec3 sunDirection;
    uniform vec3 nightColor;
    uniform bool enableDayNight;
    uniform float morphProgress;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      if (!gl_FrontFacing) {
        normal = -normal;
      }

      // Calculate day/night factor
      float dayNightFactor = 1.0;

      if (enableDayNight && morphProgress < 0.5) {
        vec3 surfaceDir = normalize(vWorldPosition);
        float sunDot = dot(surfaceDir, sunDirection);

        // Sharper transition for more dramatic effect
        float twilightWidth = 0.15;
        dayNightFactor = smoothstep(-twilightWidth, twilightWidth, sunDot);
      }

      // Day lighting - vibrant
      float diffuseStrength = max(dot(normal, sunDirection), 0.0);
      vec3 dayColor = color * (0.4 + diffuseStrength * 0.8);

      // Night - very dark with blue tint
      vec3 nightBase = color * 0.05;
      vec3 nightTint = vec3(0.02, 0.04, 0.12);
      vec3 nightColor = nightBase + nightTint;

      // City lights effect on night side (subtle orange dots based on position)
      float cityNoise = fract(sin(dot(vWorldPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 cityLights = vec3(1.0, 0.8, 0.4) * step(0.97, cityNoise) * 0.3 * (1.0 - dayNightFactor);

      // Twilight glow - orange/red at the terminator
      float twilightGlow = smoothstep(0.0, 0.3, dayNightFactor) * (1.0 - smoothstep(0.3, 0.6, dayNightFactor));
      vec3 twilightColor = vec3(1.0, 0.4, 0.2) * twilightGlow * 0.15;

      // Mix day and night
      vec3 baseColor = mix(nightColor, dayColor, dayNightFactor);

      // Add effects
      baseColor += cityLights + twilightColor;

      // Rim light for atmosphere effect
      float rim = 1.0 - max(dot(viewDir, normal), 0.0);
      vec3 rimLight = vec3(0.3, 0.5, 1.0) * pow(rim, 3.0) * 0.15 * (1.0 - dayNightFactor);
      baseColor += rimLight;

      // Emissive for hover/selection
      baseColor += emissive * emissiveIntensity;

      // Tone mapping
      baseColor = baseColor / (baseColor + vec3(0.5));

      gl_FragColor = vec4(baseColor, 1.0);
    }
  `
);

// Extend Three.js with our custom material
extend({ MorphShaderMaterial });

// TypeScript declaration for JSX
type MorphShaderMaterialProps = {
  morphProgress?: number;
  color?: THREE.Color | string;
  emissive?: THREE.Color | string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  side?: THREE.Side;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  attach?: string;
  sunDirection?: THREE.Vector3;
  nightColor?: THREE.Color | string;
  enableDayNight?: boolean;
  ref?: React.Ref<THREE.ShaderMaterial>;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    morphShaderMaterial: MorphShaderMaterialProps;
  }
}

export { MorphShaderMaterial };
