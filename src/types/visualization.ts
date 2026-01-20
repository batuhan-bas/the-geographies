import type { GeoCoordinate } from "./geo";

// ==========================================
// Color Scale Types
// ==========================================

export type ColorScaleType = "sequential" | "diverging" | "categorical";

export interface ColorScale {
  type: ColorScaleType;
  domain: [number, number];
  colors: string[];
  name: string;
}

// ==========================================
// Choropleth Types
// ==========================================

export interface ChoroplethDataPoint {
  countryCode: string; // ISO A3 code
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ChoroplethConfig {
  enabled: boolean;
  colorScale: ColorScale;
  nullColor: string;
  showLegend: boolean;
  legendTitle: string;
}

// ==========================================
// Heat Map Types
// ==========================================

export interface HeatmapPoint {
  position: GeoCoordinate;
  intensity: number;
}

export interface HeatmapConfig {
  enabled: boolean;
  radius: number;
  maxIntensity: number;
  colorScale: ColorScale;
  opacity: number;
  blur: number;
  resolution: number;
}

// ==========================================
// Visualization Store State
// ==========================================

export interface VisualizationState {
  // Choropleth
  choroplethConfig: ChoroplethConfig;
  choroplethData: Map<string, ChoroplethDataPoint>;

  // Heatmap
  heatmapConfig: HeatmapConfig;
  heatmapPoints: HeatmapPoint[];
}

export interface VisualizationActions {
  // Choropleth
  setChoroplethConfig: (config: Partial<ChoroplethConfig>) => void;
  setChoroplethData: (data: ChoroplethDataPoint[]) => void;
  clearChoroplethData: () => void;

  // Heatmap
  setHeatmapConfig: (config: Partial<HeatmapConfig>) => void;
  setHeatmapPoints: (points: HeatmapPoint[]) => void;
  addHeatmapPoint: (point: HeatmapPoint) => void;
  clearHeatmap: () => void;
}

export type VisualizationStore = VisualizationState & VisualizationActions;

// ==========================================
// Legend Types
// ==========================================

export interface LegendProps {
  title: string;
  colorScale: ColorScale;
  domain: [number, number];
  format?: (value: number) => string;
  position?: "top-right" | "bottom-right" | "bottom-left";
}
