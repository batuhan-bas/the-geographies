"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { atmosphereVertexShader, atmosphereFragmentShader } from "@/lib/shaders";

// ==========================================
// Atmosphere Component
// ==========================================

interface AtmosphereProps {
  morphProgress: number;
  color?: string;
  intensity?: number;
}

export function Atmosphere({
  morphProgress,
  color = "#4da6ff",
  intensity = 0.6,
}: AtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uSunDirection: { value: new THREE.Vector3(1, 0.5, 1).normalize() },
      uAtmosphereColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: 4.0 },
      uMorphProgress: { value: morphProgress },
      uTime: { value: 0 },
    }),
    [color, intensity]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uMorphProgress.value = morphProgress;
    }
  });

  // Fade out completely when flat
  if (morphProgress > 0.95) return null;

  return (
    <mesh ref={meshRef} scale={1.15}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default Atmosphere;
