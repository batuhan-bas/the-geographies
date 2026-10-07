// ==========================================
// Flat map projections (CPU + GPU)
// ==========================================
//
// Every layer morphs between its sphere position and a flat projection that is
// computed in the vertex shader from a per-vertex `lonLat` attribute, so the
// projection can change (and animate) without rebuilding any geometry.
//
// All projections are scaled so the equator spans x ∈ [-2, 2], matching the
// original equirectangular layout (and therefore the camera framing and the
// per-layer z offsets). Formulas follow d3-geo / d3-geo-projection.

export const PROJECTIONS = ["naturalEarth", "robinson", "equirectangular", "mercator"] as const;
export type ProjectionType = (typeof PROJECTIONS)[number];

export const PROJECTION_LABELS: Record<ProjectionType, string> = {
  naturalEarth: "Natural Earth",
  robinson: "Robinson",
  equirectangular: "Equirect",
  mercator: "Mercator",
};

/** Numeric ids shared with the GLSL implementation */
export const PROJECTION_IDS: Record<ProjectionType, number> = {
  equirectangular: 0,
  mercator: 1,
  robinson: 2,
  naturalEarth: 3,
};

/** Mercator diverges at the poles; clamp like web maps do */
const MERCATOR_MAX_LAT = 85;

/** Scale so the equator is 4 units wide: 4 / (2π · rawXScaleAtEquator) */
const SCALE_UNIT = 4 / (2 * Math.PI);
const SCALE_NATURAL_EARTH = 4 / (2 * Math.PI * 0.8707);

// Robinson table (d3-geo-projection), starting at -5° for quadratic interpolation;
// y values pre-multiplied by 1.593415793900743
const ROBINSON_X = [
  0.9986, 1.0, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835,
  0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322,
];
const ROBINSON_Y = [
  -0.062, 0.0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769,
  0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1.0,
].map((y) => y * 1.593415793900743);

const DEG = Math.PI / 180;

/** Project lon/lat (degrees) with the given projection id into `out` [x, y] */
export function projectLonLat(id: number, lon: number, lat: number, out: [number, number]): void {
  const lambda = lon * DEG;
  switch (id) {
    case 1: {
      const phi = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat)) * DEG;
      out[0] = lambda * SCALE_UNIT;
      out[1] = Math.log(Math.tan(Math.PI / 4 + phi / 2)) * SCALE_UNIT;
      return;
    }
    case 2: {
      const phi = lat * DEG;
      const i = Math.min(18, (Math.abs(phi) * 36) / Math.PI);
      const i0 = Math.floor(i);
      const di = i - i0;
      const [ax, bx, cx] = [ROBINSON_X[i0], ROBINSON_X[i0 + 1], ROBINSON_X[Math.min(19, i0 + 2)]];
      const [ay, by, cy] = [ROBINSON_Y[i0], ROBINSON_Y[i0 + 1], ROBINSON_Y[Math.min(19, i0 + 2)]];
      const x = bx + (di * (cx - ax)) / 2 + (di * di * (cx - 2 * bx + ax)) / 2;
      const y = by + (di * (cy - ay)) / 2 + (di * di * (cy - 2 * by + ay)) / 2;
      out[0] = lambda * x * SCALE_UNIT;
      out[1] = Math.sign(phi) * y * SCALE_UNIT;
      return;
    }
    case 3: {
      const phi = lat * DEG;
      const phi2 = phi * phi;
      const phi4 = phi2 * phi2;
      const x =
        lambda *
        (0.8707 -
          0.131979 * phi2 +
          phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4)));
      const y =
        phi *
        (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4)));
      out[0] = x * SCALE_NATURAL_EARTH;
      out[1] = y * SCALE_NATURAL_EARTH;
      return;
    }
    default:
      out[0] = lambda * SCALE_UNIT;
      out[1] = lat * DEG * SCALE_UNIT;
  }
}

// ==========================================
// Animated projection state
// ==========================================

/**
 * Mutable projection state animated by GSAP (like morphProgressRef): layers
 * read it every frame and blend from `from` to `to` by `blend`.
 */
export const projectionRef = {
  from: PROJECTION_IDS.naturalEarth,
  to: PROJECTION_IDS.naturalEarth,
  blend: 0,
};

const tmpA: [number, number] = [0, 0];
const tmpB: [number, number] = [0, 0];

/** CPU version of the shader's blended projection (labels, camera focus) */
export function projectBlended(lon: number, lat: number, out: [number, number]): [number, number] {
  projectLonLat(projectionRef.from, lon, lat, tmpA);
  projectLonLat(projectionRef.to, lon, lat, tmpB);
  const t = projectionRef.blend;
  out[0] = tmpA[0] + (tmpB[0] - tmpA[0]) * t;
  out[1] = tmpA[1] + (tmpB[1] - tmpA[1]) * t;
  return out;
}

// ==========================================
// GLSL
// ==========================================

const glslFloats = (values: number[]) => values.map((v) => v.toFixed(7)).join(", ");

/** Uniform declarations + `projectBlended(vec2 lonLatDegrees)` for vertex shaders */
export const projectionGlsl = /* glsl */ `
  uniform int projectionFrom;
  uniform int projectionTo;
  uniform float projectionBlend;

  const float PROJ_DEG = 0.017453292519943295;
  const float PROJ_SCALE_UNIT = ${SCALE_UNIT.toFixed(9)};
  const float PROJ_SCALE_NE = ${SCALE_NATURAL_EARTH.toFixed(9)};
  const float ROBINSON_X[20] = float[20](${glslFloats(ROBINSON_X)});
  const float ROBINSON_Y[20] = float[20](${glslFloats(ROBINSON_Y)});

  vec2 projectLonLat(int id, vec2 lonLat) {
    float lambda = lonLat.x * PROJ_DEG;
    if (id == 1) {
      float phi = clamp(lonLat.y, -${MERCATOR_MAX_LAT.toFixed(1)}, ${MERCATOR_MAX_LAT.toFixed(1)}) * PROJ_DEG;
      return vec2(lambda, log(tan(0.7853981633974483 + phi * 0.5))) * PROJ_SCALE_UNIT;
    }
    if (id == 2) {
      float phi = lonLat.y * PROJ_DEG;
      float fi = min(18.0, abs(phi) * 36.0 / 3.141592653589793);
      int i0 = int(floor(fi));
      float di = fi - float(i0);
      int i2 = min(19, i0 + 2);
      float ax = ROBINSON_X[i0], bx = ROBINSON_X[i0 + 1], cx = ROBINSON_X[i2];
      float ay = ROBINSON_Y[i0], by = ROBINSON_Y[i0 + 1], cy = ROBINSON_Y[i2];
      float x = bx + di * (cx - ax) * 0.5 + di * di * (cx - 2.0 * bx + ax) * 0.5;
      float y = by + di * (cy - ay) * 0.5 + di * di * (cy - 2.0 * by + ay) * 0.5;
      return vec2(lambda * x, sign(phi) * y) * PROJ_SCALE_UNIT;
    }
    if (id == 3) {
      float phi = lonLat.y * PROJ_DEG;
      float phi2 = phi * phi;
      float phi4 = phi2 * phi2;
      float x = lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4)));
      float y = phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4)));
      return vec2(x, y) * PROJ_SCALE_NE;
    }
    return vec2(lambda, lonLat.y * PROJ_DEG) * PROJ_SCALE_UNIT;
  }

  vec2 projectBlended(vec2 lonLat) {
    return mix(projectLonLat(projectionFrom, lonLat), projectLonLat(projectionTo, lonLat), projectionBlend);
  }
`;

/** Uniforms required by `projectionGlsl` (spread into a ShaderMaterial's uniforms) */
export function createProjectionUniforms() {
  return {
    projectionFrom: { value: projectionRef.from },
    projectionTo: { value: projectionRef.to },
    projectionBlend: { value: projectionRef.blend },
  };
}

/** Copy the current projection state into a material's uniforms (call in useFrame) */
export function syncProjectionUniforms(uniforms: Record<string, { value: unknown }>): void {
  uniforms.projectionFrom.value = projectionRef.from;
  uniforms.projectionTo.value = projectionRef.to;
  uniforms.projectionBlend.value = projectionRef.blend;
}

/** Projections where Antarctica is too distorted to show in flat mode */
export function hidesAntarctica(projection: ProjectionType): boolean {
  return projection === "equirectangular" || projection === "mercator";
}
