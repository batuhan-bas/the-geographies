// Globe Fragment Shader - Multi-layer Rendering
// Supports political, physical, topography layers with transitions

precision highp float;

uniform float uTime;
uniform float uMorphProgress;
uniform vec3 uBaseColor;
uniform vec3 uHoverColor;
uniform vec3 uSelectedColor;
uniform float uIsHovered;
uniform float uIsSelected;
uniform float uOpacity;

// Layer visibility
uniform float uPoliticalOpacity;
uniform float uPhysicalOpacity;
uniform float uTopographyOpacity;

// Textures (optional)
uniform sampler2D uPhysicalTexture;
uniform sampler2D uTopographyTexture;
uniform bool uHasTextures;

// Lighting
uniform vec3 uLightPosition;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vElevation;

// Fresnel effect for edge glow
float fresnel(vec3 viewDirection, vec3 normal, float power) {
  return pow(1.0 - max(dot(viewDirection, normal), 0.0), power);
}

void main() {
  // Base political color
  vec3 color = uBaseColor;

  // Physical layer (texture-based)
  if (uHasTextures && uPhysicalOpacity > 0.0) {
    vec3 physicalColor = texture2D(uPhysicalTexture, vUv).rgb;
    color = mix(color, physicalColor, uPhysicalOpacity);
  }

  // Topography layer (height-based coloring)
  if (uTopographyOpacity > 0.0) {
    float elevation = vElevation * 0.5 + 0.5; // Normalize to 0-1
    vec3 lowColor = vec3(0.2, 0.5, 0.3);  // Green valleys
    vec3 midColor = vec3(0.6, 0.5, 0.3);  // Brown hills
    vec3 highColor = vec3(0.9, 0.9, 0.95); // White peaks

    vec3 topoColor = mix(lowColor, midColor, smoothstep(0.0, 0.5, elevation));
    topoColor = mix(topoColor, highColor, smoothstep(0.5, 1.0, elevation));

    color = mix(color, topoColor, uTopographyOpacity);
  }

  // Hover effect
  if (uIsHovered > 0.5) {
    color = mix(color, uHoverColor, 0.3 + sin(uTime * 3.0) * 0.1);
  }

  // Selected effect
  if (uIsSelected > 0.5) {
    color = mix(color, uSelectedColor, 0.4);
  }

  // Calculate lighting
  vec3 lightDir = normalize(uLightPosition - vPosition);
  vec3 viewDir = normalize(cameraPosition - vPosition);

  // Diffuse lighting
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  diffuse = diffuse * 0.6 + 0.4; // Soften shadows

  // Rim lighting for edge definition
  float rim = fresnel(viewDir, vNormal, 2.0);

  // Combine lighting
  vec3 ambient = uAmbientColor * uAmbientIntensity;
  vec3 finalColor = color * (ambient + diffuse) + rim * 0.1;

  // Morph transition effect - slight desaturation during morph
  float morphEffect = sin(uMorphProgress * 3.14159);
  finalColor = mix(finalColor, vec3(dot(finalColor, vec3(0.299, 0.587, 0.114))), morphEffect * 0.2);

  gl_FragColor = vec4(finalColor, uOpacity);
}
