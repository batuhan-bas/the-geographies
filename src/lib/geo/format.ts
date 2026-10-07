import type { GeoCoordinate } from "@/types/geo";

// ==========================================
// Display formatting (MASTER.md › Number formatting)
// ==========================================

/** One axis in degrees–minutes, e.g. 39°03′ N */
function formatAxis(value: number, positive: string, negative: string): string {
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = Math.round((abs - degrees) * 60);
  if (minutes === 60) {
    degrees += 1;
    minutes = 0;
  }
  return `${degrees}°${String(minutes).padStart(2, "0")}′ ${value >= 0 ? positive : negative}`;
}

/** "39°03′ N, 35°10′ E" */
export function formatCoordinates({ latitude, longitude }: GeoCoordinate): string {
  return `${formatAxis(latitude, "N", "S")}, ${formatAxis(longitude, "E", "W")}`;
}

/** Value and unit separately, so the unit can be styled smaller */
export interface FormattedQuantity {
  value: string;
  unit: string;
}

function compact(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
}

/** 83_400_000 → { value: "83.4", unit: "M" } */
export function formatPopulation(count: number | undefined): FormattedQuantity | null {
  if (!count || count <= 0) {
    return null;
  }
  if (count >= 1e9) {
    return { value: compact(count / 1e9), unit: "B" };
  }
  if (count >= 1e6) {
    return { value: compact(count / 1e6), unit: "M" };
  }
  if (count >= 1e3) {
    return { value: compact(count / 1e3), unit: "K" };
  }
  return { value: String(count), unit: "" };
}

/** GDP in millions of USD (Natural Earth `GDP_MD`) → { value: "$761", unit: "B" } */
export function formatGdp(millionsUsd: number | undefined): FormattedQuantity | null {
  if (!millionsUsd || millionsUsd <= 0) {
    return null;
  }
  if (millionsUsd >= 1e6) {
    return { value: `$${compact(millionsUsd / 1e6)}`, unit: "T" };
  }
  if (millionsUsd >= 1e3) {
    return { value: `$${compact(millionsUsd / 1e3)}`, unit: "B" };
  }
  return { value: `$${compact(millionsUsd)}`, unit: "M" };
}

/** Natural Earth prefixes ordinal codes ("4. Emerging region: MIKT") — strip them */
export function stripRank(value: string | undefined): string | undefined {
  return value?.replace(/^\d+\.\s*/, "");
}
