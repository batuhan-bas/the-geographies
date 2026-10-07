#!/usr/bin/env node
/**
 * Pre-build country geometry so the browser never triangulates at runtime.
 *
 *   pnpm geometry
 *
 * Input:  assets/geo-src/ne_50m_countries.geojson (Natural Earth admin-0, 50m)
 * Output: public/data/countries.json  (properties, label anchors, per-country counts, layout)
 *         public/data/countries.bin   (delta-encoded uint16 streams, little-endian)
 *
 * - Polygons are triangulated with earcut INCLUDING holes (enclaves such as
 *   Lesotho inside South Africa, San Marino / Vatican inside Italy)
 * - Triangles with great-circle edges longer than MAX_EDGE_DEG are subdivided
 *   so they follow the sphere's curvature in globe mode
 * - Coordinates are quantized to uint16 (~0.0055° ≈ 600 m, well below the 50m
 *   dataset's resolution); indices are local to each country (uint16)
 * - Every stream is zigzag delta-encoded, which roughly halves the gzipped size
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import earcut from "earcut";
import { geoArea, geoCentroid } from "d3-geo";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "assets/geo-src/ne_50m_countries.geojson");
const OUT_JSON = join(ROOT, "public/data/countries.json");
const OUT_BIN = join(ROOT, "public/data/countries.bin");

const FORMAT_VERSION = 1;
const MAX_EDGE_DEG = 5;
const MAX_SUBDIVISIONS = 5;
const DEG = Math.PI / 180;

// ---------- Properties (same normalization the runtime loader used) ----------

function normalizeProperties(props) {
  const name = props.NAME || props.ADMIN || props.COUNTRY || "Unknown";
  return {
    name,
    name_long: props.NAME_LONG || name,
    formal_name: props.FORMAL_EN ?? undefined,
    iso_a2: props.ISO_A2 || props.ISO2 || "--",
    iso_a3: props.ISO_A3 || props.ISO3 || "---",
    continent: props.CONTINENT || "Unknown",
    region: props.REGION_UN ?? undefined,
    subregion: props.SUBREGION ?? undefined,
    pop_est: props.POP_EST || 0,
    gdp_md: props.GDP_MD || 0,
    economy: props.ECONOMY ?? undefined,
    income_grp: props.INCOME_GRP ?? undefined,
    sovereignty: props.SOVEREIGNT ?? undefined,
    type: props.TYPE ?? undefined,
  };
}

// ---------- Quantization + encoding ----------

const quantLon = (lon) => Math.round(((lon + 180) / 360) * 65535);
const quantLat = (lat) => Math.round(((lat + 90) / 180) * 65535);

/**
 * Zigzag delta encoding over 16-bit wrap-around arithmetic.
 * `stride` interleaved channels (e.g. 2 for lon/lat) are delta-coded separately.
 * Decoder: src/lib/geo/countryData.ts
 */
function deltaEncode16(values, stride = 1) {
  const out = new Uint16Array(values.length);
  const prev = new Array(stride).fill(0);
  for (let i = 0; i < values.length; i++) {
    const channel = i % stride;
    const delta = (((values[i] - prev[channel]) & 0xffff) << 16) >> 16; // signed 16-bit
    out[i] = ((delta << 1) ^ (delta >> 15)) & 0xffff;
    prev[channel] = values[i];
  }
  return out;
}

// ---------- Triangulation ----------

/**
 * Great-circle distance in degrees. Subdivision only exists to follow the
 * sphere's curvature, so edges are measured on the sphere: an edge along the
 * south pole line spans 360° of longitude but has zero length there.
 */
function edgeLength(a, b) {
  const [lon1, lat1] = [a[0] * DEG, a[1] * DEG];
  const [lon2, lat2] = [b[0] * DEG, b[1] * DEG];
  const h =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / DEG;
}

/**
 * Crack-free subdivision: the split decision is made per EDGE (edges longer
 * than MAX_EDGE_DEG get a midpoint), so both triangles sharing an edge always
 * agree and no T-junctions are created. Each triangle is then split into 2, 3
 * or 4 depending on how many of its edges were marked.
 */
function subdivide(vertices, triangles) {
  let current = triangles;
  for (let iter = 0; iter < MAX_SUBDIVISIONS; iter++) {
    const midpoints = new Map();
    // Midpoint index for a long edge, or -1 if the edge is short enough
    const midpoint = (i, j) => {
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      let idx = midpoints.get(key);
      if (idx === undefined) {
        idx = -1;
        if (edgeLength(vertices[i], vertices[j]) > MAX_EDGE_DEG) {
          idx = vertices.length;
          vertices.push([
            (vertices[i][0] + vertices[j][0]) / 2,
            (vertices[i][1] + vertices[j][1]) / 2,
          ]);
        }
        midpoints.set(key, idx);
      }
      return idx;
    };

    const next = [];
    let changed = false;
    for (let t = 0; t < current.length; t += 3) {
      let [a, b, c] = [current[t], current[t + 1], current[t + 2]];
      let [mab, mbc, mca] = [midpoint(a, b), midpoint(b, c), midpoint(c, a)];
      const marked = (mab >= 0) + (mbc >= 0) + (mca >= 0);

      if (marked === 0) {
        next.push(a, b, c);
        continue;
      }
      changed = true;

      if (marked === 3) {
        next.push(a, mab, mca, mab, b, mbc, mca, mbc, c, mab, mbc, mca);
        continue;
      }

      // Rotate (preserving winding) into a canonical pattern
      const rotate = () => {
        [a, b, c] = [b, c, a];
        [mab, mbc, mca] = [mbc, mca, mab];
      };
      if (marked === 1) {
        // Marked edge becomes a-b
        while (mab < 0) {
          rotate();
        }
        next.push(a, mab, c, mab, b, c);
      } else {
        // Unmarked edge becomes c-a (a-b and b-c are marked)
        while (mca >= 0) {
          rotate();
        }
        next.push(a, mab, mbc, mab, b, mbc, a, mbc, c);
      }
    }
    current = next;
    if (!changed) {
      break;
    }
  }
  return current;
}

/** Triangulate one polygon (outer ring + holes) into lon/lat vertices + indices */
function triangulatePolygon(rings) {
  const flat = [];
  const holeIndices = [];
  for (let r = 0; r < rings.length; r++) {
    if (r > 0) {
      holeIndices.push(flat.length / 2);
    }
    // Drop the closing duplicate point
    for (const [lon, lat] of rings[r].slice(0, -1)) {
      flat.push(lon, lat);
    }
  }
  const triangles = earcut(flat, holeIndices, 2);
  const vertices = [];
  for (let i = 0; i < flat.length; i += 2) {
    vertices.push([flat[i], flat[i + 1]]);
  }
  return { vertices, triangles: subdivide(vertices, triangles) };
}

/**
 * Label / focus anchor: centroid of the largest polygon, so overseas
 * territories (French Guiana, Alaska, ...) don't drag it into the ocean
 */
function labelAnchor(polygons) {
  let largest = polygons[0];
  let largestArea = -1;
  for (const rings of polygons) {
    const area = geoArea({ type: "Polygon", coordinates: rings });
    if (area > largestArea) {
      largestArea = area;
      largest = rings;
    }
  }
  const [lon, lat] = geoCentroid({ type: "Polygon", coordinates: largest });
  return [Number(lon.toFixed(4)), Number(lat.toFixed(4))];
}

// ---------- Main ----------

const geojson = JSON.parse(readFileSync(SRC, "utf8"));
const features = geojson.features.filter((f) => f.geometry);

const fillLonLat = [];
const fillIndex = [];
const borderLonLat = [];
const countries = [];

for (const feature of features) {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

  let vertexCount = 0;
  let indexCount = 0;
  let borderSegments = 0;

  for (const rings of polygons) {
    // Fill (with holes); indices are local to the country
    const { vertices, triangles } = triangulatePolygon(rings);
    for (const [lon, lat] of vertices) {
      fillLonLat.push(quantLon(lon), quantLat(lat));
    }
    for (const idx of triangles) {
      fillIndex.push(idx + vertexCount);
    }
    vertexCount += vertices.length;
    indexCount += triangles.length;

    // Borders: every ring, so enclave outlines are drawn too
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lon0, lat0] = ring[i];
        const [lon1, lat1] = ring[i + 1];
        // Skip edges jumping across the antimeridian (none in Natural Earth today)
        if (Math.abs(lon1 - lon0) > 180) {
          continue;
        }
        borderLonLat.push(quantLon(lon0), quantLat(lat0), quantLon(lon1), quantLat(lat1));
        borderSegments++;
      }
    }
  }

  if (vertexCount > 0xffff) {
    throw new Error(`${feature.properties?.NAME}: ${vertexCount} vertices exceed uint16 indices`);
  }

  countries.push({
    properties: normalizeProperties(feature.properties ?? {}),
    label: labelAnchor(polygons),
    vertexCount,
    indexCount,
    borderSegments,
  });
}

// ---------- Binary layout ----------

const sections = [
  { name: "fillLonLat", data: deltaEncode16(fillLonLat, 2) },
  { name: "fillIndex", data: deltaEncode16(fillIndex) },
  { name: "borderLonLat", data: deltaEncode16(borderLonLat, 2) },
];

const layout = {};
let byteOffset = 0;
for (const { name, data } of sections) {
  layout[name] = { byteOffset, length: data.length };
  byteOffset += data.byteLength;
}
const buffer = Buffer.alloc(byteOffset);
for (const { name, data } of sections) {
  Buffer.from(data.buffer).copy(buffer, layout[name].byteOffset);
}

mkdirSync(dirname(OUT_BIN), { recursive: true });
writeFileSync(OUT_BIN, buffer);
const json = JSON.stringify({
  version: FORMAT_VERSION,
  encoding: "zigzag-delta-u16",
  layout,
  countries,
});
writeFileSync(OUT_JSON, json);

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
console.log(
  `countries: ${countries.length}, fill vertices: ${fillLonLat.length / 2}, ` +
    `triangles: ${fillIndex.length / 3}, border segments: ${borderLonLat.length / 4}`,
);
console.log(`wrote ${OUT_BIN} (${kb(buffer.byteLength)})`);
console.log(`wrote ${OUT_JSON} (${kb(Buffer.byteLength(json))})`);
