"use client";

import { useRef, useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { morphProgressRef } from "@/store/hooks";

// ==========================================
// PhysicalGlobe Component Props
// ==========================================

interface PhysicalGlobeProps {
  morphProgress: number;
}

// ==========================================
// Constants
// ==========================================

const SPHERE_RADIUS = 0.998;
const FLAT_SCALE = 2.0; // Scale for flat map width
const SEGMENTS = 128; // Higher resolution for smooth morphing

// ==========================================
// PhysicalGlobe Component
// ==========================================

export function PhysicalGlobe({ morphProgress }: PhysicalGlobeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Load textures
  const dayTexture = useLoader(THREE.TextureLoader, "/textures/earth_daymap.jpg");
  const bumpTexture = useLoader(THREE.TextureLoader, "/textures/earth_topology.png");

  // Configure textures
  dayTexture.colorSpace = THREE.SRGBColorSpace;

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

    // Generate vertices
    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const theta = v * Math.PI; // 0 to PI (top to bottom)

      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        const phi = u * Math.PI * 2 - Math.PI; // -PI to PI (full rotation)

        // Sphere position
        const sphereX = -SPHERE_RADIUS * Math.sin(theta) * Math.cos(phi);
        const sphereY = SPHERE_RADIUS * Math.cos(theta);
        const sphereZ = SPHERE_RADIUS * Math.sin(theta) * Math.sin(phi);

        spherePositions.push(sphereX, sphereY, sphereZ);

        // Flat position (Equirectangular projection)
        // Map longitude (-180 to 180) to x (-FLAT_SCALE to FLAT_SCALE)
        // Map latitude (90 to -90) to y (FLAT_SCALE/2 to -FLAT_SCALE/2)
        const flatX = (u - 0.5) * FLAT_SCALE * 2;
        const flatY = (0.5 - v) * FLAT_SCALE;
        const flatZ = 0;

        flatPositions.push(flatX, flatY, flatZ);

        // Start with sphere positions
        vertices.push(sphereX, sphereY, sphereZ);

        // UV coordinates
        uvs.push(u, 1 - v);
      }
    }

    // Generate indices
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

  // Update morph progress every frame
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.morphProgress.value = morphProgressRef.current;
    }
  });

  // Custom shader material for morphing with texture
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        morphProgress: { value: morphProgressRef.current },
        dayMap: { value: dayTexture },
        bumpMap: { value: bumpTexture },
        bumpScale: { value: 0.02 },
      },
      vertexShader: `
        attribute vec3 spherePosition;
        attribute vec3 flatPosition;

        uniform float morphProgress;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;

          // Interpolate between sphere and flat positions
          vec3 morphedPosition = mix(spherePosition, flatPosition, morphProgress);

          // Calculate morphed normal
          vec3 sphereNormal = normalize(spherePosition);
          vec3 flatNormal = vec3(0.0, 0.0, 1.0);
          vNormal = normalize(mix(sphereNormal, flatNormal, morphProgress));

          vPosition = morphedPosition;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayMap;
        uniform sampler2D bumpMap;
        uniform float bumpScale;
        uniform float morphProgress;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Sample the day texture
          vec4 dayColor = texture2D(dayMap, vUv);

          // Simple lighting
          vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
          vec3 normal = normalize(vNormal);

          // Flip normal for back faces
          if (!gl_FrontFacing) {
            normal = -normal;
          }

          float diffuse = max(dot(normal, lightDir), 0.0);
          float ambient = 0.3;

          vec3 finalColor = dayColor.rgb * (ambient + diffuse * 0.7);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, [dayTexture, bumpTexture]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default PhysicalGlobe;
