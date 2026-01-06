// Atmosphere Fragment Shader
// Realistic atmospheric scattering effect

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
  // View direction from camera
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

  // Fresnel-based atmospheric glow
  float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), uPower);

  // Sun-side brightness variation
  float sunInfluence = max(dot(vNormal, uSunDirection), 0.0);
  sunInfluence = sunInfluence * 0.5 + 0.5; // Soften

  // Animated subtle shimmer
  float shimmer = sin(uTime * 0.5 + vPosition.x * 10.0) * 0.05 + 1.0;

  // Combine effects
  float atmosphereStrength = fresnel * uIntensity * sunInfluence * shimmer;

  // Fade atmosphere during morph to flat
  atmosphereStrength *= (1.0 - uMorphProgress * 0.8);

  // Color with slight blue shift at edges
  vec3 edgeColor = mix(uAtmosphereColor, vec3(0.4, 0.6, 1.0), fresnel * 0.3);

  gl_FragColor = vec4(edgeColor, atmosphereStrength);
}
