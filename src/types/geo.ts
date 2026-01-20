import type { Feature, Geometry } from "geojson";

// ==========================================
// Core Geographic Types
// ==========================================

export type ViewMode = "globe" | "flat";
export type MapLayer =
  | "political"
  | "physical"
  | "topography"
  | "administrative"
  | "choropleth"
  | "heatmap";

export interface GeoCoordinate {
  longitude: number;
  latitude: number;
}

export interface CartesianCoordinate {
  x: number;
  y: number;
  z: number;
}

// ==========================================
// Morphable Geometry Types
// ==========================================

export interface MorphablePosition {
  /** Spherical coordinates (for globe view) */
  sphere: CartesianCoordinate;
  /** Flat/projected coordinates (for mercator view) */
  flat: CartesianCoordinate;
  /** Original longitude/latitude */
  geo: GeoCoordinate;
}

export interface MorphableGeometry {
  positions: MorphablePosition[];
  indices: number[];
  featureId: string;
}

// ==========================================
// Country & Region Types
// ==========================================

export interface CountryProperties {
  // Basic info
  name: string;
  name_long?: string;
  formal_name?: string;

  // ISO codes
  iso_a2: string;
  iso_a3: string;

  // Geographic
  continent: string;
  region?: string;
  subregion?: string;

  // Economic data
  pop_est?: number;
  gdp_md?: number;
  economy?: string;
  income_grp?: string;

  // Sovereignty
  sovereignty?: string;
  type?: string;

  [key: string]: unknown;
}

export type CountryFeature = Feature<Geometry, CountryProperties>;

// ==========================================
// LOD (Level of Detail) Types
// ==========================================

export type LODLevel = "low" | "medium" | "high";

export interface LODConfig {
  /** Distance threshold for LOD switching */
  thresholds: {
    high: number;
    medium: number;
    low: number;
  };
  /** Point reduction factor per level */
  simplification: {
    high: number;
    medium: number;
    low: number;
  };
}

// ==========================================
// Realtime Data Types
// ==========================================

export interface RealtimeDataPoint {
  id: string;
  position: GeoCoordinate;
  type: "flight" | "event" | "user" | "custom";
  intensity: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface FlightRoute {
  id: string;
  from: GeoCoordinate;
  to: GeoCoordinate;
  progress: number;
  altitude: number;
}

// ==========================================
// Camera & Interaction Types
// ==========================================

export interface CameraState {
  position: CartesianCoordinate;
  target: CartesianCoordinate;
  zoom: number;
  polarAngle: number;
  azimuthAngle: number;
}

export interface InteractionState {
  hoveredFeatureId: string | null;
  selectedFeatureId: string | null;
  isDragging: boolean;
  isTransitioning: boolean;
}

// ==========================================
// Projection Config
// ==========================================

export interface ProjectionConfig {
  type: "orthographic" | "mercator" | "equirectangular";
  scale: number;
  center: [number, number];
  rotation: [number, number, number];
}
