"use client";

import { useMemo, useRef, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { CountriesLayer } from "./CountriesLayer";
import { CountryBorders } from "./CountryBorders";
import { CountryLabels } from "./CountryLabels";
import { PhysicalGlobe } from "./PhysicalGlobe";
import { TopographyLayer } from "./TopographyLayer";
import { HeatmapLayer } from "@/components/visualization";
import { Atmosphere } from "@/components/effects";
import { useMapStore } from "@/store/mapStore";
import { sunDirectionRef } from "@/store/hooks";
import { setSunDirectionFromDate } from "@/lib/geo/sun";
import type { CountryFeature, CountryGeometryData } from "@/types/geo";

// ==========================================
// Globe Component Props
// ==========================================

interface GlobeProps {
  countries: CountryFeature[];
  geometryData: CountryGeometryData;
  morphProgress: number;
  /**
   * Simulation speed relative to real time (1 = the sun is where it really is
   * right now; e.g. 3600 = one hour per second for a time-lapse)
   */
  timeScale?: number;
}

// ==========================================
// Globe Component
// ==========================================

export const Globe = ({ countries, geometryData, morphProgress, timeScale = 1 }: GlobeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const showPhysical = useMapStore((state) => state.activeLayers.has("physical"));
  const showTopography = useMapStore((state) => state.activeLayers.has("topography"));
  const showPolitical = useMapStore((state) => state.activeLayers.has("political"));
  const enableDayNight = useMapStore((state) => state.enableDayNight);

  // Real sun position from a simulation clock (starts at "now"). The shared
  // sun vector is mutated in place, so no React re-render happens per frame.
  const simClock = useMemo(() => ({ date: new Date() }), []);
  useFrame((_, delta) => {
    simClock.date.setTime(simClock.date.getTime() + delta * 1000 * timeScale);
    setSunDirectionFromDate(simClock.date, sunDirectionRef.current);
  });

  const isGlobeMode = morphProgress < 0.5;

  // Antarctica is hidden in flat mode (projection distortion) via per-layer
  // flags, so switching modes never rebuilds geometry or labels
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

      {/* Country meshes (political layer) - single merged mesh, one draw call */}
      {showPolitical ? (
        <CountriesLayer
          countries={countries}
          geometryData={geometryData}
          hideAntarctica={!isGlobeMode}
        />
      ) : null}

      {/* Country borders (political layer) */}
      {showPolitical ? (
        <CountryBorders
          countries={countries}
          geometryData={geometryData}
          hideAntarctica={!isGlobeMode}
          color="#ffffff"
          opacity={0.2}
        />
      ) : null}

      {/* Country labels (political layer, zoom-dependent) */}
      {showPolitical ? <CountryLabels countries={countries} hideAntarctica={!isGlobeMode} /> : null}

      {/* Sun-lit atmosphere glow (globe mode only) */}
      <Atmosphere sunLit={enableDayNight} />

      {/* Heatmap visualization layer */}
      <HeatmapLayer />
    </group>
  );
};

export default Globe;
