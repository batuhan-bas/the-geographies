import { morphProgressRef } from "@/store/hooks";
import { createProjectionUniforms, projectionGlsl, syncProjectionUniforms } from "./projection";

// ==========================================
// Shared globe ⇄ flat morph for vertex shaders
// ==========================================

/**
 * Declares the `spherePosition` / `lonLat` attributes and the morph +
 * projection uniforms, and provides:
 *   vec3 morphPosition()  sphere → projected flat position (z = flatZ)
 *   vec3 morphNormal()    sphere normal → +Z
 */
export const morphVertexGlsl = /* glsl */ `
  attribute vec3 spherePosition;
  attribute vec2 lonLat;

  uniform float morphProgress;
  uniform float flatZ;

  ${projectionGlsl}

  vec3 morphPosition() {
    return mix(spherePosition, vec3(projectBlended(lonLat), flatZ), morphProgress);
  }

  vec3 morphNormal() {
    return normalize(mix(normalize(spherePosition), vec3(0.0, 0.0, 1.0), morphProgress));
  }
`;

/**
 * Uniforms required by `morphVertexGlsl`.
 * @param flatZ z offset of this layer in flat mode (keeps layers ordered)
 */
export function createMorphUniforms(flatZ: number) {
  return {
    morphProgress: { value: morphProgressRef.current },
    flatZ: { value: flatZ },
    ...createProjectionUniforms(),
  };
}

/** Push the current morph + projection state into a material (call in useFrame) */
export function syncMorphUniforms(uniforms: Record<string, { value: unknown }>): void {
  uniforms.morphProgress.value = morphProgressRef.current;
  syncProjectionUniforms(uniforms);
}
