import type { CountryGeometryData } from "@/types/geo";

export interface Silhouette {
  /** SVG path of all fill triangles, in a viewBox of `width × height` */
  path: string;
  width: number;
  height: number;
}

const VIEW_WIDTH = 240;
const MAX_HEIGHT = 120;

/**
 * Country silhouette from the prebuilt fill triangles (so holes and
 * enclaves stay correct). Equirectangular with a cos(latitude) x-scale so
 * shapes are not stretched; countries spanning the antimeridian (Russia,
 * Fiji) are unwrapped first.
 */
export function buildSilhouette(
  data: CountryGeometryData,
  countryIndex: number,
): Silhouette | null {
  const { fillIndex, fillCountry, fillLonLat } = data;

  // Collect this country's triangles (indices are contiguous per country)
  const triangles: number[] = [];
  for (let t = 0; t < fillIndex.length; t += 3) {
    if (fillCountry[fillIndex[t]] === countryIndex) {
      triangles.push(fillIndex[t], fillIndex[t + 1], fillIndex[t + 2]);
    }
  }
  if (triangles.length === 0) {
    return null;
  }

  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const v of triangles) {
    minLon = Math.min(minLon, fillLonLat[v * 2]);
    maxLon = Math.max(maxLon, fillLonLat[v * 2]);
  }
  const wraps = maxLon - minLon > 180;
  const lonOf = (v: number) => {
    const lon = fillLonLat[v * 2];
    return wraps && lon < 0 ? lon + 360 : lon;
  };

  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let latSum = 0;
  for (const v of triangles) {
    latSum += fillLonLat[v * 2 + 1];
  }
  const k = Math.cos(((latSum / triangles.length) * Math.PI) / 180);
  const project = (v: number): [number, number] => [lonOf(v) * k, -fillLonLat[v * 2 + 1]];
  for (const v of triangles) {
    const [x, y] = project(v);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }

  const scale = Math.min(
    VIEW_WIDTH / Math.max(x1 - x0, 1e-6),
    MAX_HEIGHT / Math.max(y1 - y0, 1e-6),
  );
  const width = (x1 - x0) * scale;
  const height = (y1 - y0) * scale;
  const pt = (v: number) => {
    const [x, y] = project(v);
    return `${((x - x0) * scale).toFixed(1)} ${((y - y0) * scale).toFixed(1)}`;
  };

  let path = "";
  for (let i = 0; i < triangles.length; i += 3) {
    path += `M${pt(triangles[i])}L${pt(triangles[i + 1])}L${pt(triangles[i + 2])}Z`;
  }
  return { path, width, height };
}
