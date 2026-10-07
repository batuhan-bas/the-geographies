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
  /** Stack slot at the bottom center (0 = lowest), so two legends never overlap */
  slot?: 0 | 1;
}

/** Glass legend chip, bottom center between the controls and the country card */
export const Legend = ({
  title,
  colorScale,
  domain,
  format = (v) => v.toLocaleString(),
  slot = 0,
}: LegendProps) => {
  const gradient = useMemo(
    () => `linear-gradient(to right, ${colorScale.colors.join(", ")})`,
    [colorScale.colors],
  );

  return (
    <div
      className={`glass enter-spring absolute left-1/2 z-10 w-[220px] -translate-x-1/2 rounded-control px-3 pt-2.5 pb-2 ${
        slot === 0 ? "bottom-5" : "bottom-[92px]"
      }`}
    >
      <div className="mb-2 text-[12px] font-semibold text-label-2">{title}</div>
      <div className="mb-1.5 h-2 rounded-full" style={{ background: gradient }} />
      <div className="flex justify-between font-mono text-[11px] text-label-3 tabular-nums">
        <span>{format(domain[0])}</span>
        <span>{format(domain[1])}</span>
      </div>
    </div>
  );
};

// ==========================================
// Choropleth Legend (connected to store)
// ==========================================

import { useChoropleth, useHeatmap, useLayers } from "@/store/hooks";

export const ChoroplethLegend = () => {
  const { config } = useChoropleth();
  const { activeLayers } = useLayers();

  if (!activeLayers.has("choropleth") || !config.enabled || !config.showLegend) {
    return null;
  }

  return (
    <Legend
      title={config.legendTitle}
      colorScale={config.colorScale}
      domain={config.colorScale.domain}
    />
  );
};

// ==========================================
// Heatmap Legend (connected to store)
// ==========================================

export const HeatmapLegend = () => {
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
      slot={1}
    />
  );
};

export default Legend;
