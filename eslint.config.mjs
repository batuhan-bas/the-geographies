import { defineConfig, globalIgnores } from "eslint/config";
import { createRequire } from "node:module";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const require = createRequire(import.meta.url);
const customReact = require("@batuhan-bas/configs/eslint/react");

// Extract only the rules from @batuhan-bas/configs to avoid plugin re-registration
// (eslint-config-next already registers @typescript-eslint and react plugins)
const customRules = customReact.reduce((acc, config) => {
  if (config.rules) {
    Object.assign(acc, config.rules);
  }
  return acc;
}, {});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // @batuhan-bas/configs — base TS + React rules (override Next defaults where stricter)
  // Enable type-aware linting required by rules like dot-notation, no-floating-promises, etc.
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      ...customRules,

      // React Three Fiber uses custom JSX properties (geometry, attach, args, etc.)
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            "geometry",
            "material",
            "attach",
            "args",
            "position",
            "rotation",
            "scale",
            "castShadow",
            "receiveShadow",
            "dispose",
            "object",
            "renderOrder",
            "frustumCulled",
            "intensity",
            "color",
            "transparent",
            "opacity",
            "side",
            "depthWrite",
            "depthTest",
            "blending",
            "toneMapped",
            "map",
            "vertexColors",
            "wireframe",
            "emissive",
            "emissiveIntensity",
            "metalness",
            "roughness",
            "visible",
            "fragmentShader",
            "vertexShader",
            "uniforms",
            "morphProgress",
            "sunDirection",
            "enableDayNight",
          ],
        },
      ],

      // Components, icons, and helpers defined after main export — common React pattern
      "@typescript-eslint/no-use-before-define": [
        "error",
        { functions: false, classes: false, variables: false },
      ],
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
