import { useShallow } from "zustand/react/shallow";
import { useMapStore } from "./mapStore";
import type { MapLayer } from "@/types/geo";

// ==========================================
// Global morph progress ref (avoids re-renders)
// ==========================================

export const morphProgressRef = { current: 0 };

// ==========================================
// Custom Hooks for Map Store
// ==========================================

/**
 * Hook for view mode state and actions
 */
export function useViewMode() {
  return useMapStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      setViewMode: state.setViewMode,
      toggleViewMode: state.toggleViewMode,
    }))
  );
}

/**
 * Hook for morph animation state
 */
export function useMorphAnimation() {
  return useMapStore(
    useShallow((state) => ({
      morphProgress: state.morphProgress,
      isAnimating: state.isAnimating,
      setMorphProgress: state.setMorphProgress,
      setIsAnimating: state.setIsAnimating,
    }))
  );
}

/**
 * Hook for layer management
 */
export function useLayers() {
  return useMapStore(
    useShallow((state) => ({
      activeLayers: state.activeLayers,
      toggleLayer: state.toggleLayer,
      setActiveLayers: state.setActiveLayers,
    }))
  );
}

/**
 * Hook for country selection and panel
 */
export function useCountrySelection() {
  return useMapStore(
    useShallow((state) => ({
      selectedCountry: state.selectedCountry,
      isPanelOpen: state.isPanelOpen,
      selectCountry: state.selectCountry,
      openPanel: state.openPanel,
      closePanel: state.closePanel,
      togglePanel: state.togglePanel,
    }))
  );
}

/**
 * Hook for interaction state
 */
export function useInteraction() {
  return useMapStore(
    useShallow((state) => ({
      interaction: state.interaction,
      setHoveredFeature: state.setHoveredFeature,
      setSelectedFeature: state.setSelectedFeature,
    }))
  );
}

/**
 * Hook for camera control
 */
export function useCamera() {
  return useMapStore(
    useShallow((state) => ({
      camera: state.camera,
      updateCamera: state.updateCamera,
      focusOnCountry: state.focusOnCountry,
      resetCamera: state.resetCamera,
    }))
  );
}

/**
 * Hook for realtime data
 */
export function useRealtimeData() {
  return useMapStore(
    useShallow((state) => ({
      realtimeData: state.realtimeData,
      addRealtimeData: state.addRealtimeData,
      updateRealtimeData: state.updateRealtimeData,
      clearRealtimeData: state.clearRealtimeData,
    }))
  );
}

/**
 * Check if a specific layer is active
 */
export function useIsLayerActive(layer: MapLayer): boolean {
  return useMapStore((state) => state.activeLayers.has(layer));
}

/**
 * Check if currently in globe view
 */
export function useIsGlobeView(): boolean {
  return useMapStore((state) => state.viewMode === "globe");
}

/**
 * Hook for day/night setting
 */
export function useDayNight() {
  return useMapStore(
    useShallow((state) => ({
      enableDayNight: state.enableDayNight,
      setEnableDayNight: state.setEnableDayNight,
      toggleDayNight: state.toggleDayNight,
    }))
  );
}

/**
 * Hook for accessing all countries
 */
export function useCountries() {
  return useMapStore((state) => state.countries);
}
