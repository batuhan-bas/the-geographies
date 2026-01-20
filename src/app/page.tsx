"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { CountryPanel } from "@/components/ui/CountryPanel";
import { CountrySearch } from "@/components/ui/CountrySearch";
import { ChoroplethLegend, HeatmapLegend } from "@/components/visualization";
import { loadCountriesFromTopoJSON } from "@/lib/geo/loadCountries";
import { useMapStore } from "@/store/mapStore";
import { useVisualizationStore } from "@/store/visualizationStore";
import { generateClusteredHeatmapPoints } from "@/lib/visualization";
import { COLOR_SCALES } from "@/lib/visualization/colorScales";
import type { CountryFeature } from "@/types/geo";
import type { ChoroplethDataPoint } from "@/types/visualization";

// Dynamic import for MapCanvas to avoid SSR issues with Three.js
const MapCanvas = dynamic(
  () => import("@/components/canvas/MapCanvas").then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Loading Globe...</p>
        </div>
      </div>
    ),
  }
);

// Demo data for visualization
function generateDemoData(countries: CountryFeature[]) {
  // Choropleth: Use population estimates
  const choroplethData: ChoroplethDataPoint[] = countries
    .filter((c) => c.properties?.pop_est && c.properties?.iso_a3)
    .map((c) => ({
      countryCode: c.properties!.iso_a3,
      value: Math.log10(c.properties!.pop_est || 1) * 10, // Log scale for better distribution
    }));

  // Heatmap: Clustered around populated areas
  const heatmapCenters = [
    { longitude: -74, latitude: 40 },   // US East Coast
    { longitude: -118, latitude: 34 },  // US West Coast
    { longitude: 0, latitude: 51 },     // Europe
    { longitude: 116, latitude: 35 },   // East Asia
    { longitude: 77, latitude: 20 },    // India
    { longitude: -46, latitude: -23 },  // South America
  ];
  const heatmapPoints = generateClusteredHeatmapPoints(heatmapCenters, 30, 15, [0.3, 1]);

  return { choroplethData, heatmapPoints };
}

export default function HomePage() {
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const setStoreCountries = useMapStore((state) => state.setCountries);

  // Visualization store actions
  const setChoroplethData = useVisualizationStore((state) => state.setChoroplethData);
  const setChoroplethConfig = useVisualizationStore((state) => state.setChoroplethConfig);
  const setHeatmapPoints = useVisualizationStore((state) => state.setHeatmapPoints);

  useEffect(() => {
    loadCountriesFromTopoJSON().then((data) => {
      setCountries(data);
      setStoreCountries(data);

      // Generate and set demo visualization data
      const demoData = generateDemoData(data);
      setChoroplethData(demoData.choroplethData);
      setChoroplethConfig({
        legendTitle: "Population (log)",
        colorScale: { ...COLOR_SCALES.viridis, domain: [50, 100] as [number, number] },
      });
      setHeatmapPoints(demoData.heatmapPoints);

      setIsLoading(false);
    });
  }, [setStoreCountries, setChoroplethData, setChoroplethConfig, setHeatmapPoints]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      {/* 3D Map Canvas */}
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-zinc-500 text-sm">Initializing...</p>
          </div>
        }
      >
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm font-medium">Loading World Data...</p>
            </div>
          </div>
        ) : (
          <MapCanvas
            countries={countries}
            className="absolute inset-0"
            showStats={process.env.NODE_ENV === "development"}
          />
        )}
      </Suspense>

      {/* UI Overlay */}
      <CountrySearch />
      <ControlPanel />
      <CountryPanel />
      <ChoroplethLegend />
      <HeatmapLegend />

      {/* Instructions */}
      <div className="absolute bottom-6 right-6 z-10 text-right">
        <p className="text-zinc-600 text-xs">
          Drag to rotate · Scroll to zoom · Click for details
        </p>
      </div>
    </main>
  );
}
