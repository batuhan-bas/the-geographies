"use client";

// three.js uniforms, textures and render targets are mutated imperatively by design (R3F pattern)
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMapStore } from "@/store/mapStore";
import { useVisualizationStore } from "@/store/visualizationStore";
import { morphProgressRef, sunDirectionRef } from "@/store/hooks";
import { interpolateColor } from "@/lib/visualization/colorScales";
import { getCountryColor } from "@/lib/geo/countryColors";
import { buildMergedCountryGeometry } from "@/lib/geo/mergeCountries";
import type { CountryFeature } from "@/types/geo";

// ==========================================
// Constants
// ==========================================

const NO_COUNTRY = -1;
const CLICK_MOVE_TOLERANCE_PX = 5;
const SELECTED_COLOR = new THREE.Color("#ffd700");

// ==========================================
// Shaders
// ==========================================

// Shared vertex stage: GPU morph between sphere and flat positions
const morphVertexShader = /* glsl */ `
  attribute vec3 spherePosition;
  attribute vec3 flatPosition;
  attribute float countryIndex;

  uniform float morphProgress;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vCountryIndex;

  void main() {
    vec3 morphedPosition = mix(spherePosition, flatPosition, morphProgress);

    // Sphere normal points outward from center, flat normal points towards +Z
    vec3 sphereNormal = normalize(spherePosition);
    vec3 flatNormal = vec3(0.0, 0.0, 1.0);
    vNormal = normalMatrix * normalize(mix(sphereNormal, flatNormal, morphProgress));

    vec4 mvPosition = modelViewMatrix * vec4(morphedPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(morphedPosition, 1.0)).xyz;
    vCountryIndex = countryIndex;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Per-country style lookup: rgb = base color (linear), a = visibility
const styleLookupChunk = /* glsl */ `
  uniform sampler2D styleMap;
  uniform float countryCount;

  float countryId() {
    return floor(vCountryIndex + 0.5);
  }

  vec4 countryStyle(float id) {
    return texture2D(styleMap, vec2((id + 0.5) / countryCount, 0.5));
  }
`;

const colorFragmentShader = /* glsl */ `
  uniform float morphProgress;
  uniform vec3 sunDirection;
  uniform bool enableDayNight;
  uniform float hoveredIndex;
  uniform float selectedIndex;
  uniform vec3 selectedColor;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vCountryIndex;

  ${styleLookupChunk}

  void main() {
    float id = countryId();
    vec4 style = countryStyle(id);
    if (style.a < 0.5) {
      discard;
    }

    vec3 color = style.rgb;
    vec3 emissive = vec3(0.0);
    float emissiveIntensity = 0.0;

    if (abs(id - selectedIndex) < 0.5) {
      color = selectedColor;
      emissive = selectedColor;
      emissiveIntensity = 0.3;
    } else if (abs(id - hoveredIndex) < 0.5) {
      emissive = vec3(1.0);
      emissiveIntensity = 0.2;
    }

    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    if (!gl_FrontFacing) {
      normal = -normal;
    }

    // Flat mode: clean uniform color
    float flatBlend = smoothstep(0.3, 0.7, morphProgress);
    vec3 flatColor = color * 0.75 + emissive * emissiveIntensity;
    flatColor = flatColor / (flatColor + vec3(0.5));

    if (flatBlend > 0.99) {
      gl_FragColor = vec4(flatColor, 1.0);
      return;
    }

    // Day/night factor
    float dayNightFactor = 1.0;
    if (enableDayNight && morphProgress < 0.5) {
      float sunDot = dot(normalize(vWorldPosition), sunDirection);
      float twilightWidth = 0.15;
      dayNightFactor = smoothstep(-twilightWidth, twilightWidth, sunDot);
    }

    // Day lighting - vibrant
    float diffuseStrength = max(dot(normal, sunDirection), 0.0);
    vec3 dayColor = color * (0.4 + diffuseStrength * 0.8);

    // Night - very dark with blue tint
    vec3 nightColor = color * 0.05 + vec3(0.02, 0.04, 0.12);

    // City lights effect on night side
    float cityNoise = fract(sin(dot(vWorldPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 cityLights = vec3(1.0, 0.8, 0.4) * step(0.97, cityNoise) * 0.3 * (1.0 - dayNightFactor);

    // Twilight glow
    float twilightGlow = smoothstep(0.0, 0.3, dayNightFactor) * (1.0 - smoothstep(0.3, 0.6, dayNightFactor));
    vec3 twilightColor = vec3(1.0, 0.4, 0.2) * twilightGlow * 0.15;

    vec3 globeColor = mix(nightColor, dayColor, dayNightFactor);
    globeColor += cityLights + twilightColor;

    // Rim light for atmosphere effect
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    globeColor += vec3(0.3, 0.5, 1.0) * pow(rim, 3.0) * 0.15 * (1.0 - dayNightFactor);

    // Emissive for hover/selection
    globeColor += emissive * emissiveIntensity;

    // Tone mapping
    globeColor = globeColor / (globeColor + vec3(0.5));

    gl_FragColor = vec4(mix(globeColor, flatColor, flatBlend), 1.0);
  }
`;

// Picking pass: encode (countryIndex + 1) into RG, 0 = no country
const pickFragmentShader = /* glsl */ `
  uniform float morphProgress;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vCountryIndex;

  ${styleLookupChunk}

  void main() {
    float id = countryId();
    if (countryStyle(id).a < 0.5) {
      discard;
    }

    // Globe mode: ignore the far hemisphere (visible through ocean gaps)
    if (morphProgress < 0.5 && dot(normalize(vWorldPosition), cameraPosition - vWorldPosition) <= 0.0) {
      discard;
    }

    float encoded = id + 1.0;
    gl_FragColor = vec4(mod(encoded, 256.0) / 255.0, floor(encoded / 256.0) / 255.0, 0.0, 1.0);
  }
`;

// ==========================================
// Helpers
// ==========================================

function getFeatureId(feature: CountryFeature, index: number): string {
  const iso = feature.properties?.iso_a3;
  return iso && iso !== "-99" ? iso : `country-${index}`;
}

// ==========================================
// CountriesLayer Component
// ==========================================

interface CountriesLayerProps {
  countries: CountryFeature[];
  /** Hide Antarctica (flat mode) without rebuilding geometry */
  hideAntarctica?: boolean;
}

/**
 * Political layer: all countries merged into one mesh (one draw call).
 * Hover/selection use GPU picking against a 1×1 ID render target.
 */
export const CountriesLayer = ({ countries, hideAntarctica = false }: CountriesLayerProps) => {
  const { gl, camera, size } = useThree();

  const setHoveredFeature = useMapStore((state) => state.setHoveredFeature);
  const selectCountry = useMapStore((state) => state.selectCountry);
  const selectedCountry = useMapStore((state) => state.selectedCountry);
  const enableDayNight = useMapStore((state) => state.enableDayNight);
  const choroplethLayerActive = useMapStore((state) => state.activeLayers.has("choropleth"));
  const choroplethConfig = useVisualizationStore((state) => state.choroplethConfig);
  const choroplethData = useVisualizationStore((state) => state.choroplethData);

  const countryCount = Math.max(1, countries.length);

  // ---------- Geometry (built once per country set) ----------
  const geometry = useMemo(() => buildMergedCountryGeometry(countries), [countries]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // ---------- Style texture (color + visibility per country) ----------
  const styleTexture = useMemo(() => {
    const texture = new THREE.DataTexture(
      new Float32Array(countryCount * 4),
      countryCount,
      1,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }, [countryCount]);
  useEffect(() => () => styleTexture.dispose(), [styleTexture]);

  useEffect(() => {
    const data = styleTexture.image.data as Float32Array;
    const showChoropleth = choroplethLayerActive && choroplethConfig.enabled;
    const tmpColor = new THREE.Color();

    countries.forEach((feature, i) => {
      let hex = getCountryColor(feature.properties?.continent, i);
      if (showChoropleth) {
        const dataPoint = choroplethData.get(feature.properties?.iso_a3 || `country-${i}`);
        hex = dataPoint
          ? interpolateColor(dataPoint.value, choroplethConfig.colorScale)
          : choroplethConfig.nullColor;
      }
      // THREE.Color converts sRGB hex to linear, matching the previous uniform-based colors
      tmpColor.set(hex);
      const hidden = hideAntarctica && feature.properties?.continent === "Antarctica";
      data[i * 4] = tmpColor.r;
      data[i * 4 + 1] = tmpColor.g;
      data[i * 4 + 2] = tmpColor.b;
      data[i * 4 + 3] = hidden ? 0 : 1;
    });
    styleTexture.needsUpdate = true;
  }, [
    countries,
    styleTexture,
    hideAntarctica,
    choroplethLayerActive,
    choroplethConfig,
    choroplethData,
  ]);

  // ---------- Materials ----------
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          morphProgress: { value: morphProgressRef.current },
          sunDirection: { value: sunDirectionRef.current },
          enableDayNight: { value: true },
          hoveredIndex: { value: NO_COUNTRY },
          selectedIndex: { value: NO_COUNTRY },
          selectedColor: { value: SELECTED_COLOR },
          styleMap: { value: styleTexture },
          countryCount: { value: countryCount },
        },
        vertexShader: morphVertexShader,
        fragmentShader: colorFragmentShader,
        side: THREE.DoubleSide,
      }),
    [styleTexture, countryCount],
  );
  useEffect(() => () => material.dispose(), [material]);

  const pick = useMemo(() => {
    const pickMaterial = new THREE.ShaderMaterial({
      uniforms: {
        morphProgress: { value: morphProgressRef.current },
        styleMap: { value: styleTexture },
        countryCount: { value: countryCount },
      },
      vertexShader: morphVertexShader,
      fragmentShader: pickFragmentShader,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, pickMaterial);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    return {
      scene,
      material: pickMaterial,
      target: new THREE.WebGLRenderTarget(1, 1),
      pixel: new Uint8Array(4),
    };
  }, [geometry, styleTexture, countryCount]);
  useEffect(
    () => () => {
      pick.material.dispose();
      pick.target.dispose();
    },
    [pick],
  );

  // ---------- GPU picking ----------
  const clearColorRef = useRef(new THREE.Color());

  /** Returns the country index under the given canvas pixel, or NO_COUNTRY */
  const pickAt = (x: number, y: number): number => {
    const progress = morphProgressRef.current;
    // Skip while morphing: hover mid-transition is not meaningful
    if (progress > 0.001 && progress < 0.999) {
      return NO_COUNTRY;
    }
    const cam = camera as THREE.PerspectiveCamera;
    pick.material.uniforms.morphProgress.value = progress;

    gl.getClearColor(clearColorRef.current);
    const clearAlpha = gl.getClearAlpha();

    cam.updateMatrixWorld();
    cam.setViewOffset(size.width, size.height, Math.floor(x), Math.floor(y), 1, 1);
    gl.setRenderTarget(pick.target);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(pick.scene, cam);
    gl.readRenderTargetPixels(pick.target, 0, 0, 1, 1, pick.pixel);
    gl.setRenderTarget(null);
    cam.clearViewOffset();
    gl.setClearColor(clearColorRef.current, clearAlpha);

    return pick.pixel[0] + pick.pixel[1] * 256 - 1;
  };

  // Hover is resolved once per frame from the latest pointer position
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredRef = useRef(NO_COUNTRY);

  const setHovered = (index: number) => {
    if (index === hoveredRef.current) {
      return;
    }
    hoveredRef.current = index;
    material.uniforms.hoveredIndex.value = index;
    setHoveredFeature(index === NO_COUNTRY ? null : getFeatureId(countries[index], index));
    document.body.style.cursor = index === NO_COUNTRY ? "auto" : "pointer";
  };

  // DOM listeners are attached once; they call the latest handlers through this ref
  const handlersRef = useRef({ pickAt, setHovered, select: (_index: number) => {} });
  useEffect(() => {
    handlersRef.current = {
      pickAt,
      setHovered,
      select: (index: number) => selectCountry(countries[index]),
    };
  });

  useEffect(() => {
    const canvas = gl.domElement;
    let downX = 0;
    let downY = 0;

    const toLocal = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onPointerMove = (event: PointerEvent) => {
      // Skip picking while dragging the globe
      pendingPointerRef.current = event.buttons === 0 ? toLocal(event) : null;
    };
    const onPointerDown = (event: PointerEvent) => {
      downX = event.clientX;
      downY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > CLICK_MOVE_TOLERANCE_PX) {
        return;
      }
      const { x, y } = toLocal(event);
      const index = handlersRef.current.pickAt(x, y);
      if (index !== NO_COUNTRY) {
        handlersRef.current.select(index);
      }
    };
    const onPointerLeave = () => {
      pendingPointerRef.current = null;
      handlersRef.current.setHovered(NO_COUNTRY);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      document.body.style.cursor = "auto";
    };
  }, [gl]);

  // ---------- Selection ----------
  useEffect(() => {
    let index = NO_COUNTRY;
    if (selectedCountry) {
      index = countries.indexOf(selectedCountry);
      const iso = selectedCountry.properties?.iso_a3;
      if (index === NO_COUNTRY && iso && iso !== "-99") {
        index = countries.findIndex((c) => c.properties?.iso_a3 === iso);
      }
    }
    material.uniforms.selectedIndex.value = index;
  }, [selectedCountry, countries, material]);

  // ---------- Per-frame uniforms ----------
  useFrame(() => {
    const progress = morphProgressRef.current;
    material.uniforms.morphProgress.value = progress;
    material.uniforms.enableDayNight.value = enableDayNight && progress < 0.5;

    const pointer = pendingPointerRef.current;
    if (pointer) {
      pendingPointerRef.current = null;
      setHovered(pickAt(pointer.x, pointer.y));
    }
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
};

export default CountriesLayer;
