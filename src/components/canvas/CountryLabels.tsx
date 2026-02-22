"use client";

import React, { useMemo, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { CountryFeature } from "@/types/geo";
import { geoToSphere, geoToFlat, GLOBE_RADIUS } from "@/lib/geo/coordinates";
import { getFeatureCentroid } from "@/lib/geo/projections";

interface CountryLabelsProps {
  countries: CountryFeature[];
  morphProgress: number;
  minZoom?: number;
}

interface LabelData {
  name: string;
  iso: string;
  spherePos: THREE.Vector3;
  flatPos: THREE.Vector3;
  population: number;
}

function calculateLabelData(feature: CountryFeature): LabelData | null {
  const centroid = getFeatureCentroid(feature);
  if (!centroid) {
    return null;
  }

  const name = feature.properties?.name || "";
  const iso = feature.properties?.iso_a3 || "";
  const population = feature.properties?.pop_est || 0;

  if (!name) {
    return null;
  }

  const sphere = geoToSphere(centroid.longitude, centroid.latitude, GLOBE_RADIUS * 1.02);
  const flat = geoToFlat(centroid.longitude, centroid.latitude);

  return {
    name,
    iso,
    spherePos: new THREE.Vector3(sphere.x, sphere.y, sphere.z),
    flatPos: new THREE.Vector3(flat.x, flat.y, flat.z + 0.02),
    population,
  };
}

/**
 * Single country label — uses ref-based visibility to avoid re-renders
 */
const CountryLabel = ({
  data,
  morphProgress,
  zoomRef,
}: {
  data: LabelData;
  morphProgress: number;
  zoomRef: React.RefObject<{ zoom: number }>;
}) => {
  const { camera } = useThree();
  const textRef = useRef<THREE.Object3D>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const lastVisible = useRef(true);

  useFrame(() => {
    if (!billboardRef.current) {
      return;
    }

    const zoom = zoomRef.current?.zoom ?? 3.5;

    // Interpolate position
    const x = data.spherePos.x + (data.flatPos.x - data.spherePos.x) * morphProgress;
    const y = data.spherePos.y + (data.flatPos.y - data.spherePos.y) * morphProgress;
    const z = data.spherePos.z + (data.flatPos.z - data.spherePos.z) * morphProgress;
    billboardRef.current.position.set(x, y, z);

    // Globe mode visibility check
    if (morphProgress < 0.5) {
      const cameraDir = camera.position.clone().normalize();
      const labelDir = billboardRef.current.position.clone().normalize();
      const dot = cameraDir.dot(labelDir);

      const visible = dot > 0.5;
      if (visible !== lastVisible.current) {
        billboardRef.current.visible = visible;
        lastVisible.current = visible;
      }

      // Edge fade
      if (visible && textRef.current) {
        const edgeOpacity = Math.min(1, Math.max(0, (dot - 0.5) / 0.25));
        const mat = (textRef.current as unknown as { material: THREE.Material }).material;
        if (mat) {
          mat.opacity = edgeOpacity;
        }
      }
    } else {
      if (!lastVisible.current) {
        billboardRef.current.visible = true;
        lastVisible.current = true;
      }
      if (textRef.current) {
        const mat = (textRef.current as unknown as { material: THREE.Material }).material;
        if (mat) {
          mat.opacity = 1;
        }
      }
    }

    // Scale font to maintain roughly consistent screen size across zoom levels.
    // Camera approaches globe surface (radius ~1), so effective distance = zoom - 1.
    // Clamp to avoid extreme scaling at very close or very far zoom.
    const effectiveDistance = Math.max(0.3, zoom - 1.0);
    const scale = effectiveDistance / 2.5;
    billboardRef.current.scale.setScalar(Math.max(0.3, Math.min(2.0, scale)));
  });

  return (
    <Billboard ref={billboardRef} follow lockX={false} lockY={false} lockZ={false}>
      <Text
        ref={textRef as React.RefObject<THREE.Object3D>}
        fontSize={0.022}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.0018}
        outlineColor="#000000"
        maxWidth={0.3}
        {...({ depthTest: false, renderOrder: 100 } as Record<string, unknown>)}
      >
        {data.name}
      </Text>
    </Billboard>
  );
};

/**
 * All country labels with zoom-based visibility
 */
export const CountryLabels = ({ countries, morphProgress }: CountryLabelsProps) => {
  const { camera } = useThree();
  const zoomRef = useRef({ zoom: camera.position.length() });
  const prevCount = useRef(0);
  const countRef = useRef(0);

  // Pre-calculate all label data sorted by population
  const labelsData = useMemo(
    () =>
      countries
        .map((country) => calculateLabelData(country))
        .filter((data): data is LabelData => data !== null)
        .sort((a, b) => b.population - a.population),
    [countries],
  );

  // Update zoom + label count via ref (no re-render)
  useFrame(() => {
    const zoom = camera.position.length();
    zoomRef.current.zoom = zoom;

    const isGlobeMode = morphProgress < 0.5;

    // Determine how many labels to show based on zoom
    let numLabels: number;
    if (isGlobeMode) {
      if (zoom > 5.0) {
        numLabels = 20;
      } else if (zoom > 4.0) {
        numLabels = 50;
      } else {
        numLabels = labelsData.length;
      }
    } else {
      if (zoom > 4.5) {
        numLabels = 20;
      } else if (zoom > 3.5) {
        numLabels = 60;
      } else {
        numLabels = labelsData.length;
      }
    }

    countRef.current = Math.min(numLabels, labelsData.length);
  });

  // We need to trigger a re-render when label count changes meaningfully
  // Use a state that only updates when the count tier changes
  const [countTier, setCountTier] = useState(0);

  useFrame(() => {
    const newCount = countRef.current;
    if (newCount !== prevCount.current) {
      prevCount.current = newCount;
      // Map to tiers to avoid too many re-renders
      const tier = newCount <= 20 ? 0 : newCount <= 50 ? 1 : newCount <= 60 ? 2 : 3;
      setCountTier(tier);
    }
  });

  const visibleLabels = useMemo(() => {
    const counts = [20, 50, 60, labelsData.length];
    return labelsData.slice(0, counts[countTier] ?? labelsData.length);
  }, [labelsData, countTier]);

  return (
    <group renderOrder={100}>
      {visibleLabels.map((data, index) => (
        <CountryLabel
          key={data.iso && data.iso !== "-99" ? data.iso : `label-${index}`}
          data={data}
          morphProgress={morphProgress}
          zoomRef={zoomRef}
        />
      ))}
    </group>
  );
};

export default CountryLabels;
