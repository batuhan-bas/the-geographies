// Atmosphere Vertex Shader
// Creates the glowing halo effect around the globe

uniform float uMorphProgress;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);

  // Scale atmosphere based on morph progress
  // Sphere: full atmosphere, Flat: compressed/faded
  float scale = mix(1.15, 1.02, uMorphProgress);
  vec3 scaledPosition = position * scale;

  vec4 worldPosition = modelMatrix * vec4(scaledPosition, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
