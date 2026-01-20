import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  VisualizationStore,
  VisualizationState,
  ChoroplethConfig,
  ChoroplethDataPoint,
  HeatmapConfig,
  HeatmapPoint,
  ColorScale,
} from "@/types/visualization";

// ==========================================
// Default Color Scales
// ==========================================

const defaultSequentialScale: ColorScale = {
  type: "sequential",
  domain: [0, 100],
  colors: ["#f7fbff", "#deebf7", "#c6dbef", "#6baed6", "#2171b5", "#08306b"],
  name: "blues",
};

const defaultHeatScale: ColorScale = {
  type: "sequential",
  domain: [0, 1],
  colors: ["#00000000", "#0000ff80", "#00ff00a0", "#ffff00c0", "#ff0000ff"],
  name: "heat",
};

// ==========================================
// Default Configs
// ==========================================

const defaultChoroplethConfig: ChoroplethConfig = {
  enabled: true,
  colorScale: defaultSequentialScale,
  nullColor: "#3a3a3a",
  showLegend: true,
  legendTitle: "Value",
};

const defaultHeatmapConfig: HeatmapConfig = {
  enabled: true,
  radius: 8,
  maxIntensity: 1,
  colorScale: defaultHeatScale,
  opacity: 0.7,
  blur: 0.4,
  resolution: 256,
};

// ==========================================
// Initial State
// ==========================================

const initialState: VisualizationState = {
  choroplethConfig: defaultChoroplethConfig,
  choroplethData: new Map(),

  heatmapConfig: defaultHeatmapConfig,
  heatmapPoints: [],
};

// ==========================================
// Store
// ==========================================

export const useVisualizationStore = create<VisualizationStore>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    // Choropleth Actions
    setChoroplethConfig: (config) =>
      set((state) => ({
        choroplethConfig: { ...state.choroplethConfig, ...config },
      })),

    setChoroplethData: (data) => {
      const dataMap = new Map(data.map((d) => [d.countryCode, d]));
      set({ choroplethData: dataMap });
    },

    clearChoroplethData: () => set({ choroplethData: new Map() }),

    // Heatmap Actions
    setHeatmapConfig: (config) =>
      set((state) => ({
        heatmapConfig: { ...state.heatmapConfig, ...config },
      })),

    setHeatmapPoints: (points) => set({ heatmapPoints: points }),

    addHeatmapPoint: (point) =>
      set((state) => ({
        heatmapPoints: [...state.heatmapPoints, point],
      })),

    clearHeatmap: () => set({ heatmapPoints: [] }),
  }))
);

// ==========================================
// Selectors
// ==========================================

export const selectChoroplethConfig = (state: VisualizationStore) =>
  state.choroplethConfig;
export const selectChoroplethData = (state: VisualizationStore) =>
  state.choroplethData;
export const selectHeatmapConfig = (state: VisualizationStore) =>
  state.heatmapConfig;
export const selectHeatmapPoints = (state: VisualizationStore) =>
  state.heatmapPoints;
