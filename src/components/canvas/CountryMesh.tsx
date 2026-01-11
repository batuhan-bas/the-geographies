"use client";

import { useRef, useMemo, useCallback } from "react";
import { useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useMapStore } from "@/store/mapStore";
import { morphProgressRef, useDayNight } from "@/store/hooks";
import { featureToMorphableGeometry, createMorphableBufferGeometry, updateMorphProgress } from "@/lib/geo/morphing";
import type { CountryFeature } from "@/types/geo";
import "./MorphMaterial"; // Import to register the custom material

// ==========================================
// Country Color Palette - Warm tones
// ==========================================

// Continent-based color palette with warmer, more vibrant colors
const CONTINENT_COLORS: Record<string, string> = {
  "Europe": "#5d9b6b",      // Sage green
  "Asia": "#d4a574",        // Warm sand/terracotta
  "Africa": "#e8a83c",      // Golden amber
  "North America": "#7eb5a6", // Teal green
  "South America": "#6bc268", // Fresh green
  "Oceania": "#c287a5",     // Dusty rose
  "Antarctica": "#b8c4ce",  // Ice blue-gray
  "Unknown": "#8a9a8a",     // Neutral sage
};

const FALLBACK_COLORS = [
  "#7eb5a6",
  "#6bc268",
  "#d4a574",
  "#e8a83c",
  "#c287a5",
  "#5d9b6b",
];

function getCountryColor(continent: string | undefined, index: number): string {
  if (continent && CONTINENT_COLORS[continent]) {
    return CONTINENT_COLORS[continent];
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// ==========================================
// CountryMesh Component
// ==========================================

// Default sun direction (pointing towards viewer's right and slightly up)
const DEFAULT_SUN_DIRECTION = new THREE.Vector3(1, 0.3, 0.5).normalize();

interface CountryMeshProps {
  feature: CountryFeature;
  index: number;
  sunDirection?: THREE.Vector3;
}

export function CountryMesh({ feature, index, sunDirection = DEFAULT_SUN_DIRECTION }: CountryMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  const { interaction, setHoveredFeature, selectCountry } = useMapStore();
  const { enableDayNight } = useDayNight();

  const featureId = feature.properties?.iso_a3 || `country-${index}`;
  const isHovered = interaction.hoveredFeatureId === featureId;
  const isSelected = interaction.selectedFeatureId === featureId;

  // Create morphable geometry ONCE
  const geometry = useMemo(() => {
    const morphableData = featureToMorphableGeometry(feature);
    if (!morphableData) return null;
    return createMorphableBufferGeometry(morphableData, 0);
  }, [feature]);

  // Update shader uniforms and raycasting geometry every frame (reading from ref, no re-render)
  const lastEndpointRef = useRef<number>(-1);
  useFrame(() => {
    const progress = morphProgressRef.current;

    // Update shader uniforms directly
    if (materialRef.current) {
      materialRef.current.uniforms.morphProgress.value = progress;
      materialRef.current.uniforms.enableDayNight.value = enableDayNight && progress < 0.5;
    }

    // Update position for raycasting only at endpoints
    if (geometry) {
      const endpoint = progress < 0.05 ? 0 : progress > 0.95 ? 1 : -1;
      if (endpoint !== -1 && endpoint !== lastEndpointRef.current) {
        updateMorphProgress(geometry, endpoint);
        lastEndpointRef.current = endpoint;
      }
    }
  });

  // Check if we're in globe mode (for front-facing checks)
  const isGlobeMode = morphProgressRef.current < 0.5;

  // Check if the intersection is on the front-facing side (visible to camera)
  // Only relevant in globe mode - in flat mode all faces are front-facing
  const isFrontFacing = useCallback((event: ThreeEvent<PointerEvent | MouseEvent>) => {
    // In flat mode, always consider front-facing
    if (!isGlobeMode) return true;

    if (!event.face || !event.point) return false;

    // Get the direction from hit point to camera
    const toCamera = new THREE.Vector3();
    toCamera.subVectors(camera.position, event.point).normalize();

    // Check if face normal points towards camera (dot product > 0 means front-facing)
    const faceNormal = event.face.normal.clone();

    // Transform normal to world space if mesh has rotation
    if (meshRef.current) {
      faceNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(meshRef.current.matrixWorld));
    }

    return faceNormal.dot(toCamera) > 0;
  }, [camera, isGlobeMode]);

  // Event handlers - only trigger if front-facing
  const handlePointerEnter = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!isFrontFacing(event)) return;
    setHoveredFeature(featureId);
    document.body.style.cursor = "pointer";
  }, [isFrontFacing, featureId, setHoveredFeature]);

  const handlePointerLeave = useCallback(() => {
    setHoveredFeature(null);
    document.body.style.cursor = "auto";
  }, [setHoveredFeature]);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!isFrontFacing(event)) {
      event.stopPropagation();
      return;
    }
    selectCountry(feature);
  }, [isFrontFacing, feature, selectCountry]);

  if (!geometry) return null;

  // Determine color based on state
  const baseColor = getCountryColor(feature.properties?.continent, index);
  let color = baseColor;
  let emissive = "#000000";
  let emissiveIntensity = 0;

  if (isSelected) {
    color = "#ffd700";
    emissive = "#ffd700";
    emissiveIntensity = 0.3;
  } else if (isHovered) {
    emissive = "#ffffff";
    emissiveIntensity = 0.2;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      renderOrder={1}
    >
      <morphShaderMaterial
        ref={materialRef}
        morphProgress={morphProgressRef.current}
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        sunDirection={sunDirection}
        enableDayNight={enableDayNight}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default CountryMesh;
