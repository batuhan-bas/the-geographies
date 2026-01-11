"use client";

import { useRef, useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { morphProgressRef, useDayNight } from "@/store/hooks";

// ==========================================
// PhysicalGlobe Component Props
// ==========================================

interface PhysicalGlobeProps {
  morphProgress: number;
  sunDirection?: THREE.Vector3;
}

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

// ==========================================
// PhysicalGlobe Component
// ==========================================

export function PhysicalGlobe({
  morphProgress,
  sunDirection = new THREE.Vector3(1, 0.3, 0.5).normalize()
}: PhysicalGlobeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { enableDayNight } = useDayNight();

  // Load textures
  const dayTexture = useLoader(THREE.TextureLoader, "/textures/earth_daymap.jpg");
  const bumpTexture = useLoader(THREE.TextureLoader, "/textures/earth_topology.png");

  // Configure textures
  dayTexture.colorSpace = THREE.SRGBColorSpace;

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
      materialRef.current.uniforms.sunDirection.value.copy(sunDirection);
      materialRef.current.uniforms.enableDayNight.value = enableDayNight && progress < 0.5;
    }
  });

  // Custom shader material with day/night effect
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        morphProgress: { value: morphProgressRef.current },
        dayMap: { value: dayTexture },
        bumpMap: { value: bumpTexture },
        sunDirection: { value: sunDirection.clone() },
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
        uniform sampler2D bumpMap;
        uniform float morphProgress;
        uniform vec3 sunDirection;
        uniform bool enableDayNight;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec4 texColor = texture2D(dayMap, vUv);
          vec3 normal = normalize(vNormal);

          if (!gl_FrontFacing) {
            normal = -normal;
          }

          float dayNightFactor = 1.0;

          if (enableDayNight && morphProgress < 0.5) {
            vec3 surfaceDir = normalize(vWorldPosition);
            float sunDot = dot(surfaceDir, sunDirection);
            // Sharper terminator line
            dayNightFactor = smoothstep(-0.1, 0.15, sunDot);
          }

          // Day side - bright and colorful
          float diffuse = max(dot(normal, sunDirection), 0.0);
          vec3 dayColor = texColor.rgb * (0.5 + diffuse * 0.7);

          // Night side - very dark blue
          vec3 nightColor = texColor.rgb * 0.02 + vec3(0.01, 0.02, 0.06);

          // City lights simulation
          float cityNoise = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
          float landMask = step(0.3, texColor.g - texColor.b * 0.5); // Rough land detection
          vec3 cityLights = vec3(1.0, 0.9, 0.5) * step(0.985, cityNoise) * landMask * 0.5;
          cityLights *= (1.0 - dayNightFactor);

          // Twilight band - orange glow at terminator
          float twilightBand = smoothstep(0.0, 0.25, dayNightFactor) * (1.0 - smoothstep(0.25, 0.5, dayNightFactor));
          vec3 twilightGlow = vec3(1.0, 0.5, 0.2) * twilightBand * 0.2;

          // Atmosphere rim on night side
          float fresnel = pow(1.0 - max(dot(normalize(-vWorldPosition), normal), 0.0), 3.0);
          vec3 atmosphereRim = vec3(0.2, 0.4, 1.0) * fresnel * 0.2 * (1.0 - dayNightFactor);

          // Combine
          vec3 finalColor = mix(nightColor, dayColor, dayNightFactor);
          finalColor += cityLights + twilightGlow + atmosphereRim;

          // Subtle tone mapping
          finalColor = finalColor / (finalColor + vec3(0.6));

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, [dayTexture, bumpTexture, sunDirection, enableDayNight]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default PhysicalGlobe;
