"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { LayerControls } from "@/components/ui/LayerControls";
import { CountryPanel } from "@/components/ui/CountryPanel";
import { loadCountriesFromTopoJSON } from "@/lib/geo/loadCountries";
import type { CountryFeature } from "@/types/geo";

// Dynamic import for MapCanvas to avoid SSR issues with Three.js
const MapCanvas = dynamic(
  () => import("@/components/canvas/MapCanvas").then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Loading Globe...</p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCountriesFromTopoJSON().then((data) => {
      setCountries(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a0a1a]">
      {/* 3D Map Canvas */}
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-white/60">Initializing...</p>
          </div>
        }
      >
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              <p className="text-white/60 text-sm">Loading World Data...</p>
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
      <ViewToggle />
      <LayerControls />
      <CountryPanel />

      {/* Title & Info */}
      <div className="absolute bottom-6 left-6 z-10">
        <h1 className="text-2xl font-bold text-white mb-1">The Geographies</h1>
        <p className="text-white/40 text-sm">
          Interactive 3D World Map with Morphable Projections
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 right-6 z-10 text-right">
        <p className="text-white/30 text-xs">
          Drag to rotate / Scroll to zoom / Click country for details
        </p>
      </div>
    </main>
  );
}
