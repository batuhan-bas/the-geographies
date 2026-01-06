"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { CountryFeature } from "@/types/geo";
import type { Position, Polygon, MultiPolygon } from "geojson";
import { geoToSphere, geoToFlat, GLOBE_RADIUS } from "@/lib/geo/coordinates";

interface CountryBordersProps {
  countries: CountryFeature[];
  morphProgress: number;
  color?: string;
  opacity?: number;
}

/**
 * Extract border coordinates from a country feature
 */
function extractBorderRings(feature: CountryFeature): Position[][] {
  const geometry = feature.geometry;
  if (!geometry) return [];

  const rings: Position[][] = [];

  if (geometry.type === "Polygon") {
    // Only outer ring for borders
    rings.push((geometry as Polygon).coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of (geometry as MultiPolygon).coordinates) {
      rings.push(polygon[0]); // Outer ring of each polygon
    }
  }

  return rings;
}

/**
 * Convert a ring of coordinates to 3D points with morphing
 */
function ringToPoints(ring: Position[], morphProgress: number): THREE.Vector3[] {
  return ring.map(([lon, lat]) => {
    const sphere = geoToSphere(lon, lat, GLOBE_RADIUS * 1.001); // Slightly above surface
    const flat = geoToFlat(lon, lat);

    // Interpolate
    const x = sphere.x + (flat.x - sphere.x) * morphProgress;
    const y = sphere.y + (flat.y - sphere.y) * morphProgress;
    const z = sphere.z + (flat.z - sphere.z) * morphProgress;

    return new THREE.Vector3(x, y, z + 0.001); // Slight z offset to prevent z-fighting
  });
}

/**
 * Single border line component
 */
function BorderLine({
  ring,
  morphProgress,
  color,
  opacity,
}: {
  ring: Position[];
  morphProgress: number;
  color: string;
  opacity: number;
}) {
  const points = useMemo(
    () => ringToPoints(ring, morphProgress),
    [ring, morphProgress]
  );

  if (points.length < 3) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={0.5}
      opacity={opacity}
      transparent
    />
  );
}

/**
 * All country borders
 */
export function CountryBorders({
  countries,
  morphProgress,
  color = "#ffffff",
  opacity = 0.15,
}: CountryBordersProps) {
  // Extract all border rings from all countries
  const allRings = useMemo(() => {
    const rings: Position[][] = [];
    for (const country of countries) {
      rings.push(...extractBorderRings(country));
    }
    return rings;
  }, [countries]);

  return (
    <group>
      {allRings.map((ring, index) => (
        <BorderLine
          key={index}
          ring={ring}
          morphProgress={morphProgress}
          color={color}
          opacity={opacity}
        />
      ))}
    </group>
  );
}

export default CountryBorders;
