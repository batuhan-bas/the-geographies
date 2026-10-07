"use client";

// three.js uniforms are mutated imperatively by design (R3F pattern)
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { morphProgressRef, sunDirectionRef } from "@/store/hooks";

// ==========================================
// Atmosphere glow
// ==========================================

/** Outer shell radius relative to the globe */
const ATMOSPHERE_RADIUS = 1.12;

const vertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 sunDirection;
  uniform float opacity;
  uniform bool sunLit;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    // Rendered on the shell's back faces: the normal points away from the
    // camera, so this is ~0 at the shell's outer edge and grows toward the
    // planet's limb (inside the limb the globe occludes it)
    vec3 toFragment = normalize(vWorldPosition - cameraPosition);
    float limb = clamp(dot(vWorldNormal, toFragment), 0.0, 1.0);
    float intensity = pow(limb, 2.0) * 1.8;

    // Sun-aware tint: blue on the day side, orange just past the terminator,
    // dim at night. Light scatters around the limb, so "day" extends slightly
    // beyond the geometric terminator (sunFacing = 0).
    float sunFacing = sunLit ? dot(normalize(vWorldPosition), sunDirection) : 1.0;
    float day = smoothstep(-0.45, 0.1, sunFacing);
    float sunset = 1.0 - smoothstep(0.0, 0.15, abs(sunFacing + 0.25));
    vec3 color = mix(vec3(0.05, 0.08, 0.2), vec3(0.3, 0.6, 1.0), day);
    color += vec3(1.0, 0.45, 0.2) * sunset * 0.6;

    gl_FragColor = vec4(color * intensity * opacity, 1.0);
  }
`;

interface AtmosphereProps {
  /** Tint by the sun position (day/night); false = uniform daylight glow */
  sunLit?: boolean;
}

/**
 * Additive back-face shell around the globe. Fades out while morphing to the
 * flat map, where an atmosphere makes no sense.
 */
export const Atmosphere = ({ sunLit = true }: AtmosphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: sunDirectionRef.current },
          opacity: { value: 1 },
          sunLit: { value: true },
        },
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.sunLit.value = sunLit;
  }, [material, sunLit]);

  useFrame(() => {
    const opacity = 1 - THREE.MathUtils.smoothstep(morphProgressRef.current, 0, 0.4);
    material.uniforms.opacity.value = opacity;
    // Skip the full-screen-ish shell entirely in flat mode
    if (meshRef.current) {
      meshRef.current.visible = opacity > 0.001;
    }
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1}>
      <sphereGeometry args={[ATMOSPHERE_RADIUS, 96, 96]} />
    </mesh>
  );
};

export default Atmosphere;
