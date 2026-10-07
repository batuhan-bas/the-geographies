// ==========================================
// Country Color Palette - Warm tones
// ==========================================

// Continent-based color palette with warmer, more vibrant colors
export const CONTINENT_COLORS: Record<string, string> = {
  Europe: "#5d9b6b", // Sage green
  Asia: "#d4a574", // Warm sand/terracotta
  Africa: "#e8a83c", // Golden amber
  "North America": "#7eb5a6", // Teal green
  "South America": "#6bc268", // Fresh green
  Oceania: "#c287a5", // Dusty rose
  Antarctica: "#b8c4ce", // Ice blue-gray
  Unknown: "#8a9a8a", // Neutral sage
};

const FALLBACK_COLORS = ["#7eb5a6", "#6bc268", "#d4a574", "#e8a83c", "#c287a5", "#5d9b6b"];

export function getCountryColor(continent: string | undefined, index: number): string {
  if (continent && CONTINENT_COLORS[continent]) {
    return CONTINENT_COLORS[continent];
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}
