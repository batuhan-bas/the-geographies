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
      // Use the normal, handling back faces
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Flip normal for back faces to ensure consistent lighting
      if (!gl_FrontFacing) {
        normal = -normal;
      }

      // Calculate day/night factor based on sun direction (only in globe mode)
      float dayNightFactor = 1.0;
      float twilightWidth = 0.2; // Wider twilight zone for softer transition

      if (enableDayNight && morphProgress < 0.5) {
        // Globe mode - calculate sun illumination
        vec3 surfaceDir = normalize(vWorldPosition);
        float sunDot = dot(surfaceDir, sunDirection);

        // Smooth transition from day to night
        dayNightFactor = smoothstep(-twilightWidth, twilightWidth * 0.5, sunDot);
      }

      // Day side colors - bright and natural
      vec3 dayAmbient = color * 0.5;
      float diffuseStrength = max(dot(normal, sunDirection), 0.0);
      vec3 dayDiffuse = color * diffuseStrength * 0.7;

      // Night side colors - not too dark, subtle visibility
      vec3 nightAmbient = color * 0.2; // Keep some color visible
      vec3 nightTint = vec3(0.15, 0.2, 0.35); // Subtle blue night tint

      // Mix day and night based on sun position
      vec3 ambient = mix(nightAmbient + nightTint, dayAmbient, dayNightFactor);
      vec3 diffuse = dayDiffuse * dayNightFactor;

      // Soft fill light for overall visibility
      vec3 fillLight = color * 0.15;

      // Subtle rim light
      float rim = 1.0 - max(dot(viewDir, normal), 0.0);
      vec3 rimLight = color * pow(rim, 4.0) * 0.1;

      // Emissive (for hover/selection)
      vec3 emissiveColor = emissive * emissiveIntensity;

      // Combine all lighting
      vec3 finalColor = ambient + diffuse + fillLight + rimLight + emissiveColor;

      // Soft tone mapping
      finalColor = finalColor / (finalColor + vec3(0.8));

      // Gamma correction for natural look
      finalColor = pow(finalColor, vec3(0.9));

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

// Extend Three.js with our custom material
extend({ MorphShaderMaterial });

// TypeScript declaration for JSX
declare module "@react-three/fiber" {
  interface ThreeElements {
    morphShaderMaterial: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
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
    };
  }
}

export { MorphShaderMaterial };
