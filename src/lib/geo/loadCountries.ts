import type { FeatureCollection, Geometry } from "geojson";
import type { CountryFeature } from "@/types/geo";

/**
 * Generic properties interface that handles multiple data sources
 */
interface GeoProperties {
  // Natural Earth format
  NAME?: string;
  NAME_LONG?: string;
  ADMIN?: string;
  ISO_A2?: string;
  ISO_A3?: string;
  CONTINENT?: string;
  REGION_UN?: string;
  SUBREGION?: string;
  POP_EST?: number;
  GDP_MD?: number;
  ECONOMY?: string;
  INCOME_GRP?: string;
  SOVEREIGNT?: string;
  TYPE?: string;
  FORMAL_EN?: string;
  // datasets/geo-countries format
  COUNTRY?: string;
  ISO2?: string;
  ISO3?: string;
  [key: string]: unknown;
}

/**
 * Load countries from GeoJSON
 * Supports multiple data sources
 */
export async function loadCountriesFromGeoJSON(): Promise<CountryFeature[]> {
  try {
    // Use 50m Natural Earth data - good balance between detail and triangulation reliability
    // The 110m is too low detail, and countries-clean has too many points (22k+ per country)
    let response = await fetch("/data/ne_50m_countries.geojson");
    if (!response.ok) {
      response = await fetch("/data/ne_110m_countries.geojson");
    }

    const geojson = (await response.json()) as FeatureCollection<Geometry, GeoProperties>;

    // Map to CountryFeature with clean properties
    const countries: CountryFeature[] = geojson.features
      .filter((feature) => feature.geometry !== null)
      .map((feature) => {
        const props = feature.properties || {};

        // Handle different property naming conventions
        const name = props.NAME || props.ADMIN || props.COUNTRY || "Unknown";
        const iso_a2 = props.ISO_A2 || props.ISO2 || "--";
        const iso_a3 = props.ISO_A3 || props.ISO3 || "---";

        return {
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            // Basic info
            name: name,
            name_long: props.NAME_LONG || name,
            formal_name: props.FORMAL_EN,

            // ISO codes
            iso_a2: iso_a2,
            iso_a3: iso_a3,

            // Geographic
            continent: props.CONTINENT || "Unknown",
            region: props.REGION_UN,
            subregion: props.SUBREGION,

            // Economic data
            pop_est: props.POP_EST || 0,
            gdp_md: props.GDP_MD || 0,
            economy: props.ECONOMY,
            income_grp: props.INCOME_GRP,

            // Sovereignty
            sovereignty: props.SOVEREIGNT,
            type: props.TYPE,
          },
        } as CountryFeature;
      });

    console.log(`Loaded ${countries.length} countries`);
    return countries;
  } catch (error) {
    console.error("Failed to load countries:", error);
    return [];
  }
}

// Backward compatibility alias
export const loadCountriesFromTopoJSON = loadCountriesFromGeoJSON;
