import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { MapStore, MapState } from "@/types/map";
import type { ViewMode, MapLayer, CountryFeature, CameraState, RealtimeDataPoint, LODLevel } from "@/types/geo";

// ==========================================
// Initial State
// ==========================================

const initialCameraState: CameraState = {
  position: { x: 0, y: 0, z: 5 },
  target: { x: 0, y: 0, z: 0 },
  zoom: 1,
  polarAngle: Math.PI / 2,
  azimuthAngle: 0,
};

const initialState: MapState = {
  viewMode: "globe",
  activeLayers: new Set<MapLayer>(["political"]),
  lodLevel: "medium",
  enableDayNight: true,
  morphProgress: 0,
  isAnimating: false,
  interaction: {
    hoveredFeatureId: null,
    selectedFeatureId: null,
    isDragging: false,
    isTransitioning: false,
  },
  camera: initialCameraState,
  countries: [],
  realtimeData: [],
  selectedCountry: null,
  isPanelOpen: false,
};

// ==========================================
// Store
// ==========================================

export const useMapStore = create<MapStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // View Mode
    setViewMode: (mode: ViewMode) => {
      set({
        viewMode: mode,
        morphProgress: mode === "globe" ? 0 : 1,
      });
    },

    toggleViewMode: () => {
      const current = get().viewMode;
      get().setViewMode(current === "globe" ? "flat" : "globe");
    },

    // Layers
    toggleLayer: (layer: MapLayer) => {
      set((state) => {
        const newLayers = new Set(state.activeLayers);
        if (newLayers.has(layer)) {
          newLayers.delete(layer);
        } else {
          newLayers.add(layer);
        }
        return { activeLayers: newLayers };
      });
    },

    setActiveLayers: (layers: MapLayer[]) => {
      set({ activeLayers: new Set(layers) });
    },

    // Morph
    setMorphProgress: (progress: number) => {
      set({ morphProgress: Math.max(0, Math.min(1, progress)) });
    },

    setIsAnimating: (animating: boolean) => {
      set({ isAnimating: animating });
    },

    // Interaction
    setHoveredFeature: (id: string | null) => {
      set((state) => ({
        interaction: { ...state.interaction, hoveredFeatureId: id },
      }));
    },

    setSelectedFeature: (id: string | null) => {
      set((state) => ({
        interaction: { ...state.interaction, selectedFeatureId: id },
      }));
    },

    selectCountry: (country: CountryFeature | null) => {
      set({
        selectedCountry: country,
        isPanelOpen: country !== null,
        interaction: {
          ...get().interaction,
          selectedFeatureId: country?.properties?.iso_a3 ?? null,
        },
      });
    },

    // Camera
    updateCamera: (updates: Partial<CameraState>) => {
      set((state) => ({
        camera: { ...state.camera, ...updates },
      }));
    },

    focusOnCountry: (country: CountryFeature) => {
      // Camera focus logic will be handled by GSAP animation
      set({ selectedCountry: country, isPanelOpen: true });
    },

    resetCamera: () => {
      set({ camera: initialCameraState });
    },

    // LOD
    setLODLevel: (level: LODLevel) => {
      set({ lodLevel: level });
    },

    // Day/Night
    setEnableDayNight: (enabled: boolean) => {
      set({ enableDayNight: enabled });
    },

    toggleDayNight: () => {
      set((state) => ({ enableDayNight: !state.enableDayNight }));
    },

    // Panel
    openPanel: () => set({ isPanelOpen: true }),
    closePanel: () => set((state) => ({
      isPanelOpen: false,
      selectedCountry: null,
      interaction: { ...state.interaction, selectedFeatureId: null },
    })),
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

    // Data
    setCountries: (countries: CountryFeature[]) => {
      set({ countries });
    },

    addRealtimeData: (data: RealtimeDataPoint) => {
      set((state) => ({
        realtimeData: [...state.realtimeData, data],
      }));
    },

    updateRealtimeData: (data: RealtimeDataPoint[]) => {
      set({ realtimeData: data });
    },

    clearRealtimeData: () => {
      set({ realtimeData: [] });
    },
  }))
);

// ==========================================
// Selectors
// ==========================================

export const selectViewMode = (state: MapStore) => state.viewMode;
export const selectActiveLayers = (state: MapStore) => state.activeLayers;
export const selectMorphProgress = (state: MapStore) => state.morphProgress;
export const selectIsAnimating = (state: MapStore) => state.isAnimating;
export const selectCamera = (state: MapStore) => state.camera;
export const selectSelectedCountry = (state: MapStore) => state.selectedCountry;
export const selectIsPanelOpen = (state: MapStore) => state.isPanelOpen;
export const selectInteraction = (state: MapStore) => state.interaction;
export const selectLODLevel = (state: MapStore) => state.lodLevel;
export const selectEnableDayNight = (state: MapStore) => state.enableDayNight;
