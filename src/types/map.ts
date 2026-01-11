import type {
  ViewMode,
  MapLayer,
  CountryFeature,
  RealtimeDataPoint,
  CameraState,
  InteractionState,
  LODLevel
} from "./geo";

// ==========================================
// Map Store State
// ==========================================

export interface MapState {
  // View Configuration
  viewMode: ViewMode;
  activeLayers: Set<MapLayer>;
  lodLevel: LODLevel;
  enableDayNight: boolean;

  // Morph Animation
  morphProgress: number;
  isAnimating: boolean;

  // Interaction State
  interaction: InteractionState;

  // Camera
  camera: CameraState;

  // Data
  countries: CountryFeature[];
  realtimeData: RealtimeDataPoint[];

  // Selected Country Panel
  selectedCountry: CountryFeature | null;
  isPanelOpen: boolean;
}

export interface MapActions {
  // View Mode
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;

  // Layers
  toggleLayer: (layer: MapLayer) => void;
  setActiveLayers: (layers: MapLayer[]) => void;

  // Morph
  setMorphProgress: (progress: number) => void;
  setIsAnimating: (animating: boolean) => void;

  // Interaction
  setHoveredFeature: (id: string | null) => void;
  setSelectedFeature: (id: string | null) => void;
  selectCountry: (country: CountryFeature | null) => void;

  // Camera
  updateCamera: (state: Partial<CameraState>) => void;
  focusOnCountry: (country: CountryFeature) => void;
  resetCamera: () => void;

  // LOD
  setLODLevel: (level: LODLevel) => void;

  // Day/Night
  setEnableDayNight: (enabled: boolean) => void;
  toggleDayNight: () => void;

  // Panel
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Data
  setCountries: (countries: CountryFeature[]) => void;
  addRealtimeData: (data: RealtimeDataPoint) => void;
  updateRealtimeData: (data: RealtimeDataPoint[]) => void;
  clearRealtimeData: () => void;
}

export type MapStore = MapState & MapActions;

// ==========================================
// Shader Uniforms
// ==========================================

export interface GlobeMaterialUniforms {
  uMorphProgress: { value: number };
  uTime: { value: number };
  uHoveredId: { value: number };
  uSelectedId: { value: number };
  uAtmosphereIntensity: { value: number };
  uLayerOpacity: {
    political: { value: number };
    physical: { value: number };
    topography: { value: number };
    administrative: { value: number };
  };
}

export interface AtmosphereUniforms {
  uSunDirection: { value: [number, number, number] };
  uAtmosphereColor: { value: [number, number, number] };
  uIntensity: { value: number };
  uPower: { value: number };
}

// ==========================================
// Component Props
// ==========================================

export interface MapCanvasProps {
  className?: string;
  initialViewMode?: ViewMode;
  initialLayers?: MapLayer[];
  onCountryClick?: (country: CountryFeature) => void;
  onCountryHover?: (country: CountryFeature | null) => void;
}

export interface GlobeProps {
  morphProgress: number;
  activeLayers: Set<MapLayer>;
}

export interface CountryMeshProps {
  feature: CountryFeature;
  morphProgress: number;
  isHovered: boolean;
  isSelected: boolean;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export interface LayerControlsProps {
  activeLayers: Set<MapLayer>;
  onToggleLayer: (layer: MapLayer) => void;
}

export interface CountryPanelProps {
  country: CountryFeature | null;
  isOpen: boolean;
  onClose: () => void;
}
