"use client";

import { useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BatchedText, Text } from "troika-three-text";
import type { CountryFeature } from "@/types/geo";
import { geoToSphere, geoToFlat, GLOBE_RADIUS } from "@/lib/geo/coordinates";
import { morphProgressRef } from "@/store/hooks";

// ==========================================
// Constants
// ==========================================

const FONT_SIZE = 0.022;
const OUTLINE_WIDTH = 0.0018;
const MAX_WIDTH = 0.3;
/** Extra screen-space gap between labels, in CSS pixels */
const COLLISION_PADDING_PX = 3;
/** Fade speed (per second) for labels entering/leaving */
const FADE_SPEED = 8;

interface CountryLabelsProps {
  countries: CountryFeature[];
  /** Hide Antarctica (flat mode) without rebuilding the labels */
  hideAntarctica?: boolean;
}

interface LabelData {
  name: string;
  spherePos: THREE.Vector3;
  flatPos: THREE.Vector3;
  population: number;
  isAntarctica: boolean;
}

function calculateLabelData(feature: CountryFeature): LabelData | null {
  const centroid = feature.label;
  const name = feature.properties?.name || "";
  if (!name) {
    return null;
  }

  const sphere = geoToSphere(centroid.longitude, centroid.latitude, GLOBE_RADIUS * 1.02);
  const flat = geoToFlat(centroid.longitude, centroid.latitude);

  return {
    name,
    spherePos: new THREE.Vector3(sphere.x, sphere.y, sphere.z),
    flatPos: new THREE.Vector3(flat.x, flat.y, flat.z + 0.02),
    population: feature.properties?.pop_est || 0,
    isAntarctica: feature.properties?.continent === "Antarctica",
  };
}

/** Greedy placement: true if the box was free and has been added to `placed` */
function tryPlace(
  placed: number[],
  box: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  const { x0, y0, x1, y1 } = box;
  for (let j = 0; j < placed.length; j += 4) {
    if (x0 < placed[j + 2] && x1 > placed[j] && y0 < placed[j + 3] && y1 > placed[j + 1]) {
      return false;
    }
  }
  placed.push(x0, y0, x1, y1);
  return true;
}

// Scratch objects (useFrame callbacks run sequentially)
const tmpPosition = new THREE.Vector3();
const tmpProjected = new THREE.Vector3();
const tmpCameraDir = new THREE.Vector3();
const tmpLabelDir = new THREE.Vector3();
const tmpBox = { x0: 0, y0: 0, x1: 0, y1: 0 };

// ==========================================
// CountryLabels Component
// ==========================================

/**
 * All country labels rendered as one troika BatchedText (single draw call).
 *
 * Every frame each label is billboarded, faded out on the far side of the
 * globe, and run through a greedy screen-space collision pass in population
 * order, so larger countries win and labels never overlap.
 */
export const CountryLabels = ({ countries, hideAntarctica = false }: CountryLabelsProps) => {
  const { camera, size } = useThree();

  // Most populous first: they get collision priority
  const labelsData = useMemo(
    () =>
      countries
        .map((country) => calculateLabelData(country))
        .filter((data): data is LabelData => data !== null)
        .sort((a, b) => b.population - a.population),
    [countries],
  );

  const batch = useMemo(() => {
    const batched = new BatchedText();
    // Labels draw on top of everything; far-side labels are faded out manually
    batched.material.depthTest = false;
    batched.material.depthWrite = false;
    batched.renderOrder = 100;
    batched.frustumCulled = false;
    return batched;
  }, []);
  useEffect(() => () => batch.dispose(), [batch]);

  const labels = useMemo(() => {
    const members = labelsData.map((data) => {
      const text = new Text();
      text.text = data.name;
      text.fontSize = FONT_SIZE;
      text.color = 0xffffff;
      text.anchorX = "center";
      text.anchorY = "middle";
      text.textAlign = "center";
      text.maxWidth = MAX_WIDTH;
      text.outlineWidth = OUTLINE_WIDTH;
      text.outlineColor = 0x000000;
      text.fillOpacity = 0;
      text.outlineOpacity = 0;
      batch.add(text);
      return text;
    });
    return { members, opacity: new Float32Array(members.length) };
  }, [labelsData, batch]);
  useEffect(
    () => () => {
      for (const text of labels.members) {
        batch.remove(text);
        text.dispose();
      }
    },
    [labels, batch],
  );

  useFrame((_, delta) => {
    const morphProgress = morphProgressRef.current;
    const isGlobeMode = morphProgress < 0.5;
    const zoom = camera.position.length();

    // Keep roughly constant screen size: camera approaches the surface (radius ~1)
    const scale = Math.max(0.3, Math.min(2.0, Math.max(0.3, zoom - 1.0) / 2.5));

    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
    const viewHeightFactor = size.height / (2 * Math.tan((fov * Math.PI) / 360));
    const fade = Math.min(1, delta * FADE_SPEED);
    tmpCameraDir.copy(camera.position).normalize();

    // Accepted screen boxes as flat [x0, y0, x1, y1, ...]
    const placed: number[] = [];

    labels.members.forEach((text, i) => {
      const data = labelsData[i];
      tmpPosition.lerpVectors(data.spherePos, data.flatPos, morphProgress);
      text.position.copy(tmpPosition);
      text.quaternion.copy(camera.quaternion);
      text.scale.setScalar(scale);

      // Globe mode: fade labels approaching the horizon, hide the far side
      let target = hideAntarctica && data.isAntarctica ? 0 : 1;
      if (target > 0 && isGlobeMode) {
        const dot = tmpCameraDir.dot(tmpLabelDir.copy(tmpPosition).normalize());
        target = Math.min(1, Math.max(0, (dot - 0.5) / 0.25));
      }

      const bounds = text.textRenderInfo?.blockBounds;
      if (target > 0 && bounds) {
        tmpProjected.copy(tmpPosition).project(camera);
        if (tmpProjected.z > 1) {
          target = 0;
        } else {
          const cx = ((tmpProjected.x + 1) / 2) * size.width;
          const cy = ((1 - tmpProjected.y) / 2) * size.height;
          const pxPerUnit = (viewHeightFactor / camera.position.distanceTo(tmpPosition)) * scale;
          const halfW = ((bounds[2] - bounds[0]) / 2) * pxPerUnit + COLLISION_PADDING_PX;
          const halfH = ((bounds[3] - bounds[1]) / 2) * pxPerUnit + COLLISION_PADDING_PX;
          tmpBox.x0 = cx - halfW;
          tmpBox.y0 = cy - halfH;
          tmpBox.x1 = cx + halfW;
          tmpBox.y1 = cy + halfH;
          if (!tryPlace(placed, tmpBox)) {
            target = 0;
          }
        }
      } else {
        target = 0;
      }

      const opacity = labels.opacity[i] + (target - labels.opacity[i]) * fade;
      labels.opacity[i] = opacity;
      text.fillOpacity = opacity;
      text.outlineOpacity = opacity;
    });
  });

  return <primitive object={batch} />;
};

export default CountryLabels;
