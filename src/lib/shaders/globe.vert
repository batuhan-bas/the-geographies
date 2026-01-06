// Globe Vertex Shader - Morphable Geometry
// Interpolates between spherical and flat projections

attribute vec3 spherePosition;
attribute vec3 flatPosition;

uniform float uMorphProgress;
uniform float uTime;
uniform vec3 uHoverPosition;
uniform float uHoverRadius;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vElevation;

// Easing function for smooth morphing
float easeInOutCubic(float t) {
  return t < 0.5
    ? 4.0 * t * t * t
    : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

void main() {
  // Apply easing to morph progress
  float morphT = easeInOutCubic(uMorphProgress);

  // Interpolate between sphere and flat positions
  vec3 morphedPosition = mix(spherePosition, flatPosition, morphT);

  // Calculate normal based on current morphed state
  // For sphere: normal points outward from center
  // For flat: normal points in +Z direction
  vec3 sphereNormal = normalize(spherePosition);
  vec3 flatNormal = vec3(0.0, 0.0, 1.0);
  vec3 morphedNormal = normalize(mix(sphereNormal, flatNormal, morphT));

  // Optional: Add subtle hover effect
  float distToHover = distance(morphedPosition, uHoverPosition);
  float hoverInfluence = smoothstep(uHoverRadius, 0.0, distToHover);
  morphedPosition += morphedNormal * hoverInfluence * 0.02;

  // Pass to fragment shader
  vPosition = morphedPosition;
  vNormal = morphedNormal;
  vUv = uv;
  vElevation = morphedPosition.y;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
}
