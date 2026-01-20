"use client";

import { useMemo } from "react";
import type { ColorScale } from "@/types/visualization";

// ==========================================
// Legend Component
// ==========================================

interface LegendProps {
  title: string;
  colorScale: ColorScale;
  domain: [number, number];
  format?: (value: number) => string;
  position?: "top-right" | "bottom-right" | "bottom-left";
}

export function Legend({
  title,
  colorScale,
  domain,
  format = (v) => v.toLocaleString(),
  position = "bottom-right",
}: LegendProps) {
  const positionClasses = {
    "top-right": "top-6 right-6",
    "bottom-right": "bottom-24 right-6",
    "bottom-left": "bottom-24 left-64",
  };

  const gradient = useMemo(() => {
    return `linear-gradient(to right, ${colorScale.colors.join(", ")})`;
  }, [colorScale.colors]);

  return (
    <div
      className={`absolute ${positionClasses[position]} z-10 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 p-3 min-w-[180px]`}
    >
      {/* Title */}
      <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2">
        {title}
      </div>

      {/* Gradient bar */}
      <div
        className="h-2.5 rounded-sm mb-1.5"
        style={{ background: gradient }}
      />

      {/* Scale labels */}
      <div className="flex justify-between text-[11px] text-white/70">
        <span>{format(domain[0])}</span>
        <span>{format(domain[1])}</span>
      </div>
    </div>
  );
}

// ==========================================
// Choropleth Legend (connected to store)
// ==========================================

import { useChoropleth, useHeatmap, useLayers } from "@/store/hooks";

export function ChoroplethLegend() {
  const { config } = useChoropleth();
  const { activeLayers } = useLayers();

  if (
    !activeLayers.has("choropleth") ||
    !config.enabled ||
    !config.showLegend
  ) {
    return null;
  }

  return (
    <Legend
      title={config.legendTitle}
      colorScale={config.colorScale}
      domain={config.colorScale.domain}
    />
  );
}

// ==========================================
// Heatmap Legend (connected to store)
// ==========================================

export function HeatmapLegend() {
  const { config } = useHeatmap();
  const { activeLayers } = useLayers();

  if (!activeLayers.has("heatmap") || !config.enabled) {
    return null;
  }

  return (
    <Legend
      title="Intensity"
      colorScale={config.colorScale}
      domain={[0, config.maxIntensity]}
      position="bottom-left"
    />
  );
}

export default Legend;
