"use client";

import { useRef, useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { morphProgressRef } from "@/store/hooks";

// ==========================================
// TopographyLayer Component Props
// ==========================================

interface TopographyLayerProps {
  morphProgress: number;
}

// ==========================================
// Constants - Must match coordinates.ts
// ==========================================

const GLOBE_RADIUS = 1.0;
const FLAT_SCALE = 2.0;
const SEGMENTS = 128;
const DEG_TO_RAD = Math.PI / 180;

// Topography renders between physical (0.998) and political (1.0) layers
const SPHERE_OFFSET = 0.999;
const FLAT_Z_OFFSET = -0.005;

// ==========================================
// TopographyLayer Component
// ==========================================

export const TopographyLayer = ({ morphProgress }: TopographyLayerProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Load textures
  const hypsometricTexture = useLoader(THREE.TextureLoader, "/textures/earth_hypsometric.jpg");
  const elevationTexture = useLoader(THREE.TextureLoader, "/textures/earth_topology.png");

  // Configure textures
  hypsometricTexture.colorSpace = THREE.SRGBColorSpace;

  // Create morphable geometry with sphere and flat positions
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
      const latitude = 90 - (y / heightSegments) * 180;

      for (let x = 0; x <= widthSegments; x++) {
        const longitude = (x / widthSegments) * 360 - 180;

        // Sphere position - matches geoToSphere() in coordinates.ts
        const phi = (90 - latitude) * DEG_TO_RAD;
        const theta = (longitude + 180) * DEG_TO_RAD;

        const radius = GLOBE_RADIUS * SPHERE_OFFSET;
        const sphereX = -radius * Math.sin(phi) * Math.cos(theta);
        const sphereY = radius * Math.cos(phi);
        const sphereZ = radius * Math.sin(phi) * Math.sin(theta);

        spherePositions.push(sphereX, sphereY, sphereZ);

        // Flat position - matches geoToFlat() in coordinates.ts
        const flatX = (longitude / 180) * FLAT_SCALE;
        const flatY = (latitude / 90) * FLAT_SCALE * 0.5;
        const flatZ = FLAT_Z_OFFSET;

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
      materialRef.current.uniforms.morphProgress.value = morphProgressRef.current;
    }
  });

  // Custom shader material with hypsometric tint + contour lines
  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          morphProgress: { value: morphProgressRef.current },
          hypsometricMap: { value: hypsometricTexture },
          elevationMap: { value: elevationTexture },
          contourCount: { value: 20.0 },
          contourColor: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
          contourOpacity: { value: 0.3 },
        },
        vertexShader: `
        attribute vec3 spherePosition;
        attribute vec3 flatPosition;

        uniform float morphProgress;

        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 morphedPosition = mix(spherePosition, flatPosition, morphProgress);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
        }
      `,
        fragmentShader: `
        uniform sampler2D hypsometricMap;
        uniform sampler2D elevationMap;
        uniform float contourCount;
        uniform vec3 contourColor;
        uniform float contourOpacity;

        varying vec2 vUv;

        void main() {
          // Base color from hypsometric tint texture
          vec4 baseColor = texture2D(hypsometricMap, vUv);

          // Elevation from grayscale DEM texture
          float elevation = texture2D(elevationMap, vUv).r;

          // Contour lines using fract + fwidth for antialiasing
          float contourVal = fract(elevation * contourCount);
          float fw = fwidth(elevation * contourCount);
          float contourLine = smoothstep(fw * 1.5, 0.0, contourVal) + smoothstep(1.0 - fw * 1.5, 1.0, contourVal);
          contourLine = clamp(contourLine, 0.0, 1.0);

          // Composite: base color with contour overlay
          vec3 finalColor = mix(baseColor.rgb, contourColor, contourLine * contourOpacity);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
        side: THREE.DoubleSide,
      }),
    [hypsometricTexture, elevationTexture],
  );

  return (
    <mesh geometry={geometry} material={shaderMaterial}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
};

export default TopographyLayer;
