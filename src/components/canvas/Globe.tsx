"use client";

import { useRef, useMemo, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { CountryMesh } from "./CountryMesh";
import { CountryBorders } from "./CountryBorders";
import { CountryLabels } from "./CountryLabels";
import { PhysicalGlobe } from "./PhysicalGlobe";
import { TopographyLayer } from "./TopographyLayer";
import { HeatmapLayer } from "@/components/visualization";
import { useMapStore } from "@/store/mapStore";
import { morphProgressRef, sunDirectionRef } from "@/store/hooks";
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

export const Globe = ({
  countries,
  morphProgress,
  animateSun = true,
  sunSpeed = 0.05, // Slow rotation for gentle day/night cycle
}: GlobeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const showPhysical = useMapStore((state) => state.activeLayers.has("physical"));
  const showTopography = useMapStore((state) => state.activeLayers.has("topography"));
  const showPolitical = useMapStore((state) => state.activeLayers.has("political"));

  // Sun angle lives in a ref: mutating the shared sun vector avoids re-rendering
  // the whole scene graph every frame. Shader uniforms hold the same Vector3.
  const sunAngleRef = useRef(0);
  useFrame((_, delta) => {
    if (!animateSun || morphProgressRef.current >= 0.5) {
      return;
    }
    sunAngleRef.current += delta * sunSpeed;
    const angle = sunAngleRef.current;
    // Sun rotates around the Y axis (equator plane), slight tilt for more interesting lighting
    sunDirectionRef.current.set(Math.cos(angle), 0.3, Math.sin(angle)).normalize();
  });

  const isGlobeMode = morphProgress < 0.5;

  // Filter visible countries based on active layers and mode
  // Hide Antarctica in flat mode due to projection distortion
  const visibleCountries = useMemo(() => {
    if (!showPolitical) {
      return [];
    }
    if (isGlobeMode) {
      return countries;
    }
    // In flat mode, hide Antarctica
    return countries.filter((c) => c.properties?.continent !== "Antarctica");
  }, [countries, showPolitical, isGlobeMode]);

  return (
    <group ref={groupRef}>
      {/* Physical Earth texture (when physical layer active) */}
      {showPhysical ? (
        <Suspense fallback={null}>
          <PhysicalGlobe />
        </Suspense>
      ) : null}

      {/* Topography layer (between physical and political) */}
      {showTopography ? (
        <Suspense fallback={null}>
          <TopographyLayer />
        </Suspense>
      ) : null}

      {/* Ocean sphere (globe mode, only when no physical layer) */}
      {!showPhysical && (
        <mesh visible={morphProgress < 0.5}>
          <sphereGeometry args={[0.995, 64, 64]} />
          <meshStandardMaterial color="#1a4a7a" roughness={0.6} metalness={0.2} />
        </mesh>
      )}

      {/* Ocean plane (flat mode) - sized to exclude Antarctica region */}
      <mesh visible={morphProgress > 0.5} position={[0, 0.1, -0.01]}>
        <planeGeometry args={[4.5, 2]} />
        <meshStandardMaterial color="#1a4a7a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Country meshes (political layer) */}
      {visibleCountries.map((feature, index) => (
        <CountryMesh
          key={
            feature.properties?.iso_a3 && feature.properties.iso_a3 !== "-99"
              ? feature.properties.iso_a3
              : `country-${index}`
          }
          feature={feature}
          index={index}
        />
      ))}

      {/* Country borders (political layer) */}
      {showPolitical ? (
        <CountryBorders
          countries={visibleCountries}
          morphProgress={morphProgress}
          color="#ffffff"
          opacity={0.2}
        />
      ) : null}

      {/* Country labels (political layer, zoom-dependent) */}
      {showPolitical ? <CountryLabels countries={visibleCountries} minZoom={2.5} /> : null}

      {/* Heatmap visualization layer */}
      <HeatmapLayer />
    </group>
  );
};

export default Globe;
