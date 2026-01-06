"use client";

import { useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { CountryFeature } from "@/types/geo";
import { geoToSphere, geoToFlat, GLOBE_RADIUS } from "@/lib/geo/coordinates";
import { getFeatureCentroid } from "@/lib/geo/projections";
import { useState } from "react";

interface CountryLabelsProps {
  countries: CountryFeature[];
  morphProgress: number;
  minZoom?: number; // Minimum zoom level to show labels
}

interface LabelData {
  name: string;
  iso: string;
  position: THREE.Vector3;
  scale: number;
  population: number; // For sorting by importance
}

/**
 * Calculate label position and scale based on morph progress
 */
function calculateLabelData(
  feature: CountryFeature,
  morphProgress: number
): LabelData | null {
  const centroid = getFeatureCentroid(feature);
  if (!centroid) return null;

  const name = feature.properties?.name || "";
  const iso = feature.properties?.iso_a3 || "";
  const population = feature.properties?.pop_est || 0;

  if (!name) return null;

  // Calculate position
  const sphere = geoToSphere(centroid.longitude, centroid.latitude, GLOBE_RADIUS * 1.02);
  const flat = geoToFlat(centroid.longitude, centroid.latitude);

  const x = sphere.x + (flat.x - sphere.x) * morphProgress;
  const y = sphere.y + (flat.y - sphere.y) * morphProgress;
  const z = sphere.z + (flat.z - sphere.z) * morphProgress;

  return {
    name,
    iso,
    position: new THREE.Vector3(x, y, z + 0.02),
    scale: 0.025, // Base scale, will be adjusted based on zoom
    population,
  };
}

/**
 * Single country label with dynamic sizing
 * Hides when facing away from camera (for globe mode)
 */
function CountryLabel({
  data,
  fontSize,
  opacity,
  morphProgress,
}: {
  data: LabelData;
  fontSize: number;
  opacity: number;
  morphProgress: number;
}) {
  const { camera } = useThree();
  const [isVisible, setIsVisible] = useState(true);

  // Check visibility based on camera direction (for globe mode)
  useFrame(() => {
    if (morphProgress > 0.5) {
      // Flat mode - always visible
      setIsVisible(true);
      return;
    }

    // Globe mode - check if label is facing the camera
    const labelPos = data.position.clone();
    const cameraDir = camera.position.clone().normalize();
    const labelDir = labelPos.clone().normalize();

    // Dot product: >0 means facing camera, <0 means facing away
    const dot = cameraDir.dot(labelDir);
    setIsVisible(dot > 0.1); // Small threshold to hide labels at the edge
  });

  if (!isVisible) return null;

  return (
    <Billboard
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
      position={data.position}
    >
      <Text
        fontSize={fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={fontSize * 0.08}
        outlineColor="#000000"
        fillOpacity={opacity}
      >
        {data.name}
      </Text>
    </Billboard>
  );
}

/**
 * All country labels with zoom-based visibility
 */
export function CountryLabels({
  countries,
  morphProgress,
}: CountryLabelsProps) {
  const { camera } = useThree();
  const [zoomLevel, setZoomLevel] = useState(camera.position.length());

  // Update zoom level each frame
  useFrame(() => {
    const newZoom = camera.position.length();
    if (Math.abs(newZoom - zoomLevel) > 0.01) {
      setZoomLevel(newZoom);
    }
  });

  // Calculate label data for all countries, sorted by population
  const labelsData = useMemo(() => {
    return countries
      .map((country) => calculateLabelData(country, morphProgress))
      .filter((data): data is LabelData => data !== null)
      .sort((a, b) => b.population - a.population); // Largest populations first
  }, [countries, morphProgress]);

  // Determine how many labels to show based on zoom and mode
  const { visibleLabels, fontSize, opacity } = useMemo(() => {
    const isGlobeMode = morphProgress < 0.5;

    // Different thresholds for globe vs flat mode
    const farZoom = isGlobeMode ? 4.0 : 3.5;
    const midZoom = isGlobeMode ? 2.5 : 2.0;
    const closeZoom = isGlobeMode ? 1.8 : 1.2;

    let numLabels: number;
    let size: number;
    let alpha: number;

    if (zoomLevel > farZoom) {
      // Very far - show major countries
      numLabels = isGlobeMode ? 25 : 15;
      size = isGlobeMode ? 0.025 : 0.035;
      alpha = 0.8;
    } else if (zoomLevel > midZoom) {
      // Medium distance
      const t = (farZoom - zoomLevel) / (farZoom - midZoom);
      numLabels = Math.floor((isGlobeMode ? 25 : 15) + t * (isGlobeMode ? 40 : 35));
      size = isGlobeMode ? 0.022 + t * 0.008 : 0.03 + t * 0.01;
      alpha = 0.8 + t * 0.15;
    } else if (zoomLevel > closeZoom) {
      // Closer
      const t = (midZoom - zoomLevel) / (midZoom - closeZoom);
      numLabels = Math.floor((isGlobeMode ? 65 : 50) + t * (labelsData.length - (isGlobeMode ? 65 : 50)));
      size = isGlobeMode ? 0.03 - t * 0.01 : 0.04 - t * 0.015;
      alpha = 0.95;
    } else {
      // Very close - show all
      numLabels = labelsData.length;
      size = isGlobeMode ? 0.02 : 0.025;
      alpha = 1.0;
    }

    return {
      visibleLabels: labelsData.slice(0, Math.min(numLabels, labelsData.length)),
      fontSize: size,
      opacity: alpha,
    };
  }, [labelsData, zoomLevel, morphProgress]);

  return (
    <group>
      {visibleLabels.map((data) => (
        <CountryLabel
          key={data.iso}
          data={data}
          fontSize={fontSize}
          opacity={opacity}
          morphProgress={morphProgress}
        />
      ))}
    </group>
  );
}

export default CountryLabels;
