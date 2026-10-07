"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildGlobeGrid } from "@/lib/geo/globeGrid";
import { createMorphUniforms, morphVertexGlsl, syncMorphUniforms } from "@/lib/geo/morphShader";

// Ocean sits below every other layer
const SEGMENTS = 96;
const SPHERE_OFFSET = 0.995;
const FLAT_Z_OFFSET = -0.015;
const OCEAN_COLOR = new THREE.Color("#1a4a7a");
// Fixed key light (the previous scene's directional light at (5, 5, 5))
const KEY_LIGHT = new THREE.Vector3(1, 1, 1).normalize();

const vertexShader = /* glsl */ `
  ${morphVertexGlsl}

  varying vec3 vNormal;

  void main() {
    vNormal = morphNormal();
    gl_Position = projectionMatrix * modelViewMatrix * vec4(morphPosition(), 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform vec3 keyLight;

  varying vec3 vNormal;

  void main() {
    float diffuse = max(dot(normalize(vNormal), keyLight), 0.0);
    gl_FragColor = vec4(color * (0.35 + 0.65 * diffuse), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Ocean backdrop for the political layer. A morphable grid instead of a
 * sphere + rectangle, so in flat mode its outline follows the active
 * projection (Robinson / Natural Earth are not rectangular).
 */
export const OceanLayer = () => {
  const geometry = useMemo(() => buildGlobeGrid(SEGMENTS, SPHERE_OFFSET), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...createMorphUniforms(FLAT_Z_OFFSET),
          color: { value: OCEAN_COLOR },
          keyLight: { value: KEY_LIGHT },
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => syncMorphUniforms(material.uniforms));

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
};

export default OceanLayer;
