// Shader exports with raw GLSL loading

// Globe shaders - simplified version using standard position attribute
// Morphing is done on CPU via updateMorphProgress()
export const globeVertexShader = /* glsl */ `
uniform float uMorphProgress;
uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vElevation;

void main() {
  // Position is already morphed on CPU
  vec3 morphedPosition = position;

  // Calculate normal based on morph progress
  // Globe: normal points outward, Flat: normal points +Z
  vec3 sphereNormal = normalize(position);
  vec3 flatNormal = vec3(0.0, 0.0, 1.0);
  vec3 morphedNormal = normalize(mix(sphereNormal, flatNormal, uMorphProgress));

  vPosition = morphedPosition;
  vNormal = normalize(normalMatrix * morphedNormal);
  vUv = uv;
  vElevation = morphedPosition.y;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
}
`;

export const globeFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uMorphProgress;
uniform vec3 uBaseColor;
uniform vec3 uHoverColor;
uniform vec3 uSelectedColor;
uniform float uIsHovered;
uniform float uIsSelected;
uniform float uOpacity;
uniform float uTopographyOpacity;
uniform vec3 uLightPosition;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vElevation;

float fresnel(vec3 viewDirection, vec3 normal, float power) {
  return pow(1.0 - max(dot(viewDirection, normal), 0.0), power);
}

void main() {
  vec3 color = uBaseColor;

  if (uTopographyOpacity > 0.0) {
    float elevation = vElevation * 0.5 + 0.5;
    vec3 lowColor = vec3(0.2, 0.5, 0.3);
    vec3 midColor = vec3(0.6, 0.5, 0.3);
    vec3 highColor = vec3(0.9, 0.9, 0.95);

    vec3 topoColor = mix(lowColor, midColor, smoothstep(0.0, 0.5, elevation));
    topoColor = mix(topoColor, highColor, smoothstep(0.5, 1.0, elevation));

    color = mix(color, topoColor, uTopographyOpacity);
  }

  if (uIsHovered > 0.5) {
    color = mix(color, uHoverColor, 0.3 + sin(uTime * 3.0) * 0.1);
  }

  if (uIsSelected > 0.5) {
    color = mix(color, uSelectedColor, 0.4);
  }

  vec3 lightDir = normalize(uLightPosition - vPosition);
  vec3 viewDir = normalize(cameraPosition - vPosition);

  float diffuse = max(dot(vNormal, lightDir), 0.0);
  diffuse = diffuse * 0.6 + 0.4;

  float rim = fresnel(viewDir, vNormal, 2.0);

  vec3 ambient = uAmbientColor * uAmbientIntensity;
  vec3 finalColor = color * (ambient + diffuse) + rim * 0.1;

  float morphEffect = sin(uMorphProgress * 3.14159);
  finalColor = mix(finalColor, vec3(dot(finalColor, vec3(0.299, 0.587, 0.114))), morphEffect * 0.2);

  gl_FragColor = vec4(finalColor, uOpacity);
}
`;

export const atmosphereVertexShader = /* glsl */ `
uniform float uMorphProgress;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);

  float scale = mix(1.15, 1.02, uMorphProgress);
  vec3 scaledPosition = position * scale;

  vec4 worldPosition = modelMatrix * vec4(scaledPosition, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const atmosphereFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uSunDirection;
uniform vec3 uAtmosphereColor;
uniform float uIntensity;
uniform float uPower;
uniform float uMorphProgress;
uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

  float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), uPower);

  float sunInfluence = max(dot(vNormal, uSunDirection), 0.0);
  sunInfluence = sunInfluence * 0.5 + 0.5;

  float shimmer = sin(uTime * 0.5 + vPosition.x * 10.0) * 0.05 + 1.0;

  float atmosphereStrength = fresnel * uIntensity * sunInfluence * shimmer;
  atmosphereStrength *= (1.0 - uMorphProgress * 0.8);

  vec3 edgeColor = mix(uAtmosphereColor, vec3(0.4, 0.6, 1.0), fresnel * 0.3);

  gl_FragColor = vec4(edgeColor, atmosphereStrength);
}
`;
