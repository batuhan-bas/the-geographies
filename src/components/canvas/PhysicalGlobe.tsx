"use client";

import { useRef } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

// ==========================================
// PhysicalGlobe Component Props
// ==========================================

interface PhysicalGlobeProps {
  morphProgress: number;
}

// ==========================================
// PhysicalGlobe Component
// ==========================================

export function PhysicalGlobe({ morphProgress }: PhysicalGlobeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Load textures
  const dayTexture = useLoader(THREE.TextureLoader, "/textures/earth_daymap.jpg");
  const bumpTexture = useLoader(THREE.TextureLoader, "/textures/earth_topology.png");

  // Configure textures
  dayTexture.colorSpace = THREE.SRGBColorSpace;

  // Only show in globe mode
  if (morphProgress > 0.5) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.998, 64, 64]} />
      <meshStandardMaterial
        map={dayTexture}
        bumpMap={bumpTexture}
        bumpScale={0.02}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

export default PhysicalGlobe;
