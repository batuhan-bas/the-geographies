"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { morphProgressRef, sunDirectionRef, useDayNight } from "@/store/hooks";
import { useProgressiveTexture } from "@/lib/textures/useProgressiveTexture";

// ==========================================
// Constants - Must match coordinates.ts
// ==========================================

const GLOBE_RADIUS = 1.0;
const FLAT_SCALE = 2.0;
const SEGMENTS = 128;
const DEG_TO_RAD = Math.PI / 180;

// Physical globe renders slightly inside/behind political layer to avoid z-fighting
const SPHERE_OFFSET = 0.998; // Sphere radius multiplier (slightly smaller)
const FLAT_Z_OFFSET = -0.01; // Z offset in flat mode (behind political layer)

// Available KTX2 tiers (see scripts/build-textures.mjs)
const DAYMAP_TIERS_K = [2, 4, 8, 16];
const NIGHT_TIERS_K = [2, 4, 8];
// Elevation is only used as a water mask for ocean specular, so low tiers suffice
const WATER_MASK_TIERS_K = [2, 4];

// ==========================================
// PhysicalGlobe Component
// ==========================================

export const PhysicalGlobe = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { enableDayNight } = useDayNight();

  // Progressive KTX2: 2K preview → device tier → 16K when zoomed in (desktop)
  const dayTexture = useProgressiveTexture("earth_daymap", DAYMAP_TIERS_K);
  // NASA Black Marble city lights for the night side
  const nightTexture = useProgressiveTexture("earth_night", NIGHT_TIERS_K);
  const elevationTexture = useProgressiveTexture("earth_elevation", WATER_MASK_TIERS_K, {
    srgb: false,
  });

  // Create morphable geometry with sphere and flat positions
  // Uses same coordinate system as coordinates.ts for alignment with political layer
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const widthSegments = SEGMENTS;
    const heightSegments = SEGMENTS / 2;

    const vertices: number[] = [];
    const spherePositions: number[] = [];
    const flatPositions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= heightSegments; y++) {
      // latitude: 90 (north pole) to -90 (south pole)
      const latitude = 90 - (y / heightSegments) * 180;

      for (let x = 0; x <= widthSegments; x++) {
        // longitude: -180 to 180
        const longitude = (x / widthSegments) * 360 - 180;

        // Sphere position - matches geoToSphere() in coordinates.ts
        const phi = (90 - latitude) * DEG_TO_RAD;
        const theta = (longitude + 180) * DEG_TO_RAD;

        // Apply offset to render inside/behind political layer
        const radius = GLOBE_RADIUS * SPHERE_OFFSET;
        const sphereX = -radius * Math.sin(phi) * Math.cos(theta);
        const sphereY = radius * Math.cos(phi);
        const sphereZ = radius * Math.sin(phi) * Math.sin(theta);

        spherePositions.push(sphereX, sphereY, sphereZ);

        // Flat position - matches geoToFlat() in coordinates.ts
        const flatX = (longitude / 180) * FLAT_SCALE;
        const flatY = (latitude / 90) * FLAT_SCALE * 0.5;
        const flatZ = FLAT_Z_OFFSET; // Behind political layer

        flatPositions.push(flatX, flatY, flatZ);
        vertices.push(sphereX, sphereY, sphereZ);

        // UV for texture mapping
        const u = (longitude + 180) / 360;
        const v = (90 - latitude) / 180;
        uvs.push(u, 1 - v);
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x;
        const b = a + 1;
        const c = a + (widthSegments + 1);
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("spherePosition", new THREE.Float32BufferAttribute(spherePositions, 3));
    geo.setAttribute("flatPosition", new THREE.Float32BufferAttribute(flatPositions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, []);

  // Update uniforms every frame
  useFrame(() => {
    if (materialRef.current) {
      const progress = morphProgressRef.current;
      materialRef.current.uniforms.morphProgress.value = progress;
      materialRef.current.uniforms.enableDayNight.value = enableDayNight && progress < 0.5;
    }
  });

  // Custom shader material with day/night effect
  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          morphProgress: { value: morphProgressRef.current },
          dayMap: { value: null },
          nightMap: { value: null },
          elevationMap: { value: null },
          hasNightMap: { value: false },
          hasElevationMap: { value: false },
          // Shared reference: Globe mutates it in place, no per-frame copy needed
          sunDirection: { value: sunDirectionRef.current },
          enableDayNight: { value: enableDayNight },
        },
        vertexShader: `
        attribute vec3 spherePosition;
        attribute vec3 flatPosition;

        uniform float morphProgress;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;

          vec3 morphedPosition = mix(spherePosition, flatPosition, morphProgress);

          vec3 sphereNormal = normalize(spherePosition);
          vec3 flatNormal = vec3(0.0, 0.0, 1.0);
          vNormal = normalize(mix(sphereNormal, flatNormal, morphProgress));

          vWorldPosition = (modelMatrix * vec4(morphedPosition, 1.0)).xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
        }
      `,
        fragmentShader: `
        uniform sampler2D dayMap;
        uniform sampler2D nightMap;
        uniform sampler2D elevationMap;
        uniform bool hasNightMap;
        uniform bool hasElevationMap;
        uniform float morphProgress;
        uniform vec3 sunDirection;
        uniform bool enableDayNight;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec4 texColor = texture2D(dayMap, vUv);

          // Flat mode: show clean texture with gentle lighting
          float flatBlend = smoothstep(0.3, 0.7, morphProgress);
          vec3 flatColor = texColor.rgb * 0.85;
          flatColor = flatColor / (flatColor + vec3(0.6));
          if (flatBlend > 0.99) {
            gl_FragColor = vec4(flatColor, 1.0);
            return;
          }

          vec3 normal = normalize(vNormal);
          if (!gl_FrontFacing) {
            normal = -normal;
          }
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          float dayNightFactor = 1.0;
          if (enableDayNight && morphProgress < 0.5) {
            float sunDot = dot(normalize(vWorldPosition), sunDirection);
            dayNightFactor = smoothstep(-0.1, 0.15, sunDot);
          }

          // Day side - bright and colorful
          float diffuse = max(dot(normal, sunDirection), 0.0);
          vec3 dayColor = texColor.rgb * (0.5 + diffuse * 0.7);

          // Ocean sun glint: water = sea-level elevation AND blue-dominant color
          if (hasElevationMap) {
            float elevation = texture2D(elevationMap, vUv).r;
            float water = (1.0 - smoothstep(0.0, 0.01, elevation))
              * smoothstep(0.0, 0.06, texColor.b - texColor.r);
            vec3 halfDir = normalize(sunDirection + viewDir);
            float nDotH = max(dot(normal, halfDir), 0.0);
            // Sharp sun glint + broad sheen
            float specular = pow(nDotH, 160.0) * 2.5 + pow(nDotH, 18.0) * 0.3;
            // Sky reflection grows toward the limb (Schlick fresnel)
            float fresnelSea = 0.02 + 0.98 * pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
            dayColor += water * diffuse * (vec3(1.0, 0.92, 0.78) * specular + vec3(0.12, 0.25, 0.45) * fresnelSea);
          }

          // Night side - very dark blue
          vec3 nightColor = texColor.rgb * 0.02 + vec3(0.01, 0.02, 0.06);

          // City lights: NASA Black Marble (boosted so lights pop against the dark side)
          vec3 cityLights = vec3(0.0);
          if (hasNightMap) {
            vec3 lights = texture2D(nightMap, vUv).rgb;
            cityLights = pow(lights, vec3(1.4)) * vec3(1.6, 1.35, 1.0);
          }
          cityLights *= (1.0 - smoothstep(0.0, 0.6, dayNightFactor));

          // Twilight band
          float twilightBand = smoothstep(0.0, 0.35, dayNightFactor) * (1.0 - smoothstep(0.35, 0.8, dayNightFactor));
          vec3 twilightGlow = vec3(1.0, 0.45, 0.2) * twilightBand * texColor.rgb * 0.6;

          // Atmosphere rim on the limb
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
          vec3 atmosphereRim = vec3(0.3, 0.55, 1.0) * fresnel * mix(0.12, 0.35, dayNightFactor);

          // Combine globe lighting
          vec3 globeColor = mix(nightColor, dayColor, dayNightFactor);
          globeColor += cityLights + twilightGlow + atmosphereRim;
          globeColor = globeColor / (globeColor + vec3(0.6));

          gl_FragColor = vec4(mix(globeColor, flatColor, flatBlend), 1.0);
        }
      `,
        side: THREE.DoubleSide,
      }),
    // enableDayNight is pushed via uniform in useFrame, textures via the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Swap in higher-resolution tiers as they arrive, without rebuilding the material
  useEffect(() => {
    const { uniforms } = shaderMaterial;
    uniforms.dayMap.value = dayTexture;
    uniforms.nightMap.value = nightTexture;
    uniforms.hasNightMap.value = nightTexture !== null;
    uniforms.elevationMap.value = elevationTexture;
    uniforms.hasElevationMap.value = elevationTexture !== null;
  }, [shaderMaterial, dayTexture, nightTexture, elevationTexture]);

  // <primitive> objects are not auto-disposed by R3F
  useEffect(() => () => shaderMaterial.dispose(), [shaderMaterial]);

  if (!dayTexture) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
};

export default PhysicalGlobe;
