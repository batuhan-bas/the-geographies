"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { CountryPanel } from "@/components/ui/CountryPanel";
import { loadCountriesFromTopoJSON } from "@/lib/geo/loadCountries";
import type { CountryFeature } from "@/types/geo";

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
      <ControlPanel />
      <CountryPanel />

      {/* Instructions */}
      <div className="absolute bottom-6 right-6 z-10 text-right">
        <p className="text-zinc-600 text-xs">
          Drag to rotate · Scroll to zoom · Click for details
        </p>
      </div>
    </main>
  );
}
