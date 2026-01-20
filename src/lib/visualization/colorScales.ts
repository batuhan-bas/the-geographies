import type { ColorScale } from "@/types/visualization";

// ==========================================
// Color Conversion Utilities
// ==========================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Handle rgba format
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) {
    const match = hex.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0]),
        g: parseInt(match[1]),
        b: parseInt(match[2]),
      };
    }
  }

  // Handle hex format (with or without #)
  const cleanHex = hex.replace("#", "");

  // Handle 8-character hex (with alpha)
  const hexValue = cleanHex.length === 8 ? cleanHex.slice(0, 6) : cleanHex;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexValue);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 128, g: 128, b: 128 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ==========================================
// Color Interpolation
// ==========================================

/**
 * Interpolate a color from a color scale based on value
 */
export function interpolateColor(value: number, scale: ColorScale): string {
  const { domain, colors } = scale;

  if (colors.length === 0) return "#808080";
  if (colors.length === 1) return colors[0];

  // Normalize value to 0-1
  const min = domain[0];
  const max = domain[1];
  const range = max - min;

  if (range === 0) return colors[0];

  const t = Math.max(0, Math.min(1, (value - min) / range));

  // Find color segment
  const segmentCount = colors.length - 1;
  const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
  const segmentT = t * segmentCount - segment;

  // Interpolate between two colors
  const color1 = hexToRgb(colors[segment]);
  const color2 = hexToRgb(colors[segment + 1]);

  const r = color1.r + (color2.r - color1.r) * segmentT;
  const g = color1.g + (color2.g - color1.g) * segmentT;
  const b = color1.b + (color2.b - color1.b) * segmentT;

  return rgbToHex(r, g, b);
}

/**
 * Interpolate size based on value
 */
export function interpolateSize(
  value: number,
  sizeRange: [number, number],
  valueRange: [number, number]
): number {
  const t = (value - valueRange[0]) / (valueRange[1] - valueRange[0]);
  const clampedT = Math.max(0, Math.min(1, t));
  return sizeRange[0] + (sizeRange[1] - sizeRange[0]) * clampedT;
}

/**
 * Get color with opacity
 */
export function colorWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

// ==========================================
// Predefined Color Scales
// ==========================================

export const COLOR_SCALES = {
  // Sequential (single hue)
  blues: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#f7fbff",
      "#deebf7",
      "#c6dbef",
      "#9ecae1",
      "#6baed6",
      "#4292c6",
      "#2171b5",
      "#08519c",
      "#08306b",
    ],
    name: "blues",
  },

  greens: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#f7fcf5",
      "#e5f5e0",
      "#c7e9c0",
      "#a1d99b",
      "#74c476",
      "#41ab5d",
      "#238b45",
      "#006d2c",
      "#00441b",
    ],
    name: "greens",
  },

  reds: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#fff5f0",
      "#fee0d2",
      "#fcbba1",
      "#fc9272",
      "#fb6a4a",
      "#ef3b2c",
      "#cb181d",
      "#a50f15",
      "#67000d",
    ],
    name: "reds",
  },

  oranges: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#fff5eb",
      "#fee6ce",
      "#fdd0a2",
      "#fdae6b",
      "#fd8d3c",
      "#f16913",
      "#d94801",
      "#a63603",
      "#7f2704",
    ],
    name: "oranges",
  },

  purples: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#fcfbfd",
      "#efedf5",
      "#dadaeb",
      "#bcbddc",
      "#9e9ac8",
      "#807dba",
      "#6a51a3",
      "#54278f",
      "#3f007d",
    ],
    name: "purples",
  },

  viridis: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#440154",
      "#482878",
      "#3e4989",
      "#31688e",
      "#26838f",
      "#1f9e89",
      "#35b779",
      "#6ece58",
      "#fde725",
    ],
    name: "viridis",
  },

  plasma: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#0d0887",
      "#46039f",
      "#7201a8",
      "#9c179e",
      "#bd3786",
      "#d8576b",
      "#ed7953",
      "#fb9f3a",
      "#f0f921",
    ],
    name: "plasma",
  },

  // Diverging
  rdbu: {
    type: "diverging" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#67001f",
      "#b2182b",
      "#d6604d",
      "#f4a582",
      "#fddbc7",
      "#f7f7f7",
      "#d1e5f0",
      "#92c5de",
      "#4393c3",
      "#2166ac",
      "#053061",
    ],
    name: "rdbu",
  },

  rdylgn: {
    type: "diverging" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#a50026",
      "#d73027",
      "#f46d43",
      "#fdae61",
      "#fee08b",
      "#ffffbf",
      "#d9ef8b",
      "#a6d96a",
      "#66bd63",
      "#1a9850",
      "#006837",
    ],
    name: "rdylgn",
  },

  // Heat map specific
  heat: {
    type: "sequential" as const,
    domain: [0, 1] as [number, number],
    colors: ["#000004", "#420a68", "#932667", "#dd513a", "#fca50a", "#fcffa4"],
    name: "heat",
  },

  // Population/density
  ylgnbu: {
    type: "sequential" as const,
    domain: [0, 100] as [number, number],
    colors: [
      "#ffffd9",
      "#edf8b1",
      "#c7e9b4",
      "#7fcdbb",
      "#41b6c4",
      "#1d91c0",
      "#225ea8",
      "#253494",
      "#081d58",
    ],
    name: "ylgnbu",
  },
};

/**
 * Get a color scale by name
 */
export function getColorScale(name: string): ColorScale {
  return (
    COLOR_SCALES[name as keyof typeof COLOR_SCALES] || COLOR_SCALES.blues
  );
}

/**
 * Create a custom color scale
 */
export function createColorScale(
  colors: string[],
  domain: [number, number],
  name: string = "custom"
): ColorScale {
  return {
    type: "sequential",
    domain,
    colors,
    name,
  };
}
