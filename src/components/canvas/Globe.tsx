"use client";

import { useRef, useMemo, Suspense, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CountryMesh } from "./CountryMesh";
import { CountryBorders } from "./CountryBorders";
import { CountryLabels } from "./CountryLabels";
import { PhysicalGlobe } from "./PhysicalGlobe";
import { useMapStore } from "@/store/mapStore";
import type { CountryFeature } from "@/types/geo";

// ==========================================
// Globe Component Props
// ==========================================

interface GlobeProps {
  countries: CountryFeature[];
  morphProgress: number;
  animateSun?: boolean;
  sunSpeed?: number; // Rotation speed (radians per second)
}

// ==========================================
// Globe Component
// ==========================================

export function Globe({
  countries,
  morphProgress,
  animateSun = true,
  sunSpeed = 0.05, // Slow rotation for gentle day/night cycle
}: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { activeLayers } = useMapStore();

  // Sun direction state for day/night effect
  const [sunAngle, setSunAngle] = useState(0);
  const sunDirection = useMemo(() => {
    // Sun rotates around the Y axis (equator plane)
    const x = Math.cos(sunAngle);
    const z = Math.sin(sunAngle);
    const y = 0.3; // Slight tilt for more interesting lighting
    return new THREE.Vector3(x, y, z).normalize();
  }, [sunAngle]);

  // Animate sun position
  useFrame((_, delta) => {
    if (animateSun && morphProgress < 0.5) {
      setSunAngle((prev) => prev + delta * sunSpeed);
    }
  });

  const showPhysical = activeLayers.has("physical");
  const showPolitical = activeLayers.has("political");
  const isGlobeMode = morphProgress < 0.5;

  // Filter visible countries based on active layers and mode
  // Hide Antarctica in flat mode due to projection distortion
  const visibleCountries = useMemo(() => {
    if (!showPolitical) return [];
    if (isGlobeMode) return countries;
    // In flat mode, hide Antarctica
    return countries.filter(c => c.properties?.continent !== "Antarctica");
  }, [countries, showPolitical, isGlobeMode]);

  return (
    <group ref={groupRef}>
      {/* Physical Earth texture (when physical layer active) */}
      {showPhysical && (
        <Suspense fallback={null}>
          <PhysicalGlobe morphProgress={morphProgress} sunDirection={sunDirection} />
        </Suspense>
      )}

      {/* Ocean sphere (globe mode, only when no physical layer) */}
      {!showPhysical && (
        <mesh visible={morphProgress < 0.5}>
          <sphereGeometry args={[0.995, 64, 64]} />
          <meshStandardMaterial
            color="#1a4a7a"
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      )}

      {/* Ocean plane (flat mode) - sized to exclude Antarctica region */}
      <mesh visible={morphProgress > 0.5} position={[0, 0.1, -0.01]}>
        <planeGeometry args={[4.5, 2]} />
        <meshStandardMaterial
          color="#1a4a7a"
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Country meshes (political layer) */}
      {visibleCountries.map((feature, index) => (
        <CountryMesh
          key={feature.properties?.iso_a3 || `country-${index}`}
          feature={feature}
          index={index}
          sunDirection={sunDirection}
        />
      ))}

      {/* Country borders (political layer) */}
      {showPolitical && (
        <CountryBorders
          countries={visibleCountries}
          morphProgress={morphProgress}
          color="#ffffff"
          opacity={0.2}
        />
      )}

      {/* Country labels (political layer, zoom-dependent) */}
      {showPolitical && (
        <CountryLabels
          countries={visibleCountries}
          morphProgress={morphProgress}
          minZoom={2.5}
        />
      )}
    </group>
  );
}

export default Globe;
