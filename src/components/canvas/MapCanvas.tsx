"use client";

import { Suspense, useEffect, useRef, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stats } from "@react-three/drei";
import { gsap } from "gsap";
import * as THREE from "three";
import { Globe } from "./Globe";
import { useMapStore } from "@/store/mapStore";
import { useMorphAnimation } from "@/store/hooks";
import { getFeatureCentroid } from "@/lib/geo/projections";
import { geoToSphere, GLOBE_RADIUS } from "@/lib/geo/coordinates";
import type { CountryFeature } from "@/types/geo";

// ==========================================
// Camera Controller Component
// ==========================================

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { selectedCountry, viewMode } = useMapStore();
  const { morphProgress } = useMorphAnimation();

  // Animate camera to focus on selected country
  useEffect(() => {
    if (!selectedCountry || !controlsRef.current) return;

    const centroid = getFeatureCentroid(selectedCountry);
    if (!centroid) return;

    let targetPosition: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    if (viewMode === "globe") {
      // Globe mode: move camera to look at country from outside
      const spherePos = geoToSphere(centroid.longitude, centroid.latitude, GLOBE_RADIUS);
      const countryVec = new THREE.Vector3(spherePos.x, spherePos.y, spherePos.z);

      // Camera position: same direction but further out
      const cameraDistance = 2.5;
      targetPosition = countryVec.clone().normalize().multiplyScalar(cameraDistance);

      // Look at the center of the globe
      targetLookAt = new THREE.Vector3(0, 0, 0);
    } else {
      // Flat view - zoom closer to the country
      // Scale: longitude -180 to 180 maps to x -2 to 2
      // Scale: latitude -90 to 90 maps to y -1 to 1
      const x = (centroid.longitude / 180) * 2;
      const y = (centroid.latitude / 90);

      // Zoom in close - z=1.5 for nice detail view
      targetPosition = new THREE.Vector3(x, y, 1.5);
      targetLookAt = new THREE.Vector3(x, y, 0);
    }

    // Kill any existing animations
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controlsRef.current.target);

    // Animate camera position
    gsap.to(camera.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 1.2,
      ease: "power3.out",
    });

    // Animate look-at target
    gsap.to(controlsRef.current.target, {
      x: targetLookAt.x,
      y: targetLookAt.y,
      z: targetLookAt.z,
      duration: 1.2,
      ease: "power3.out",
    });
  }, [selectedCountry, viewMode, camera]);

  // Adjust camera for view mode transition
  useEffect(() => {
    if (!controlsRef.current) return;

    if (viewMode === "flat") {
      // Flat mode: orthographic-like view from front
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: 4,
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    } else {
      // Globe mode: angled view
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: 3,
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [viewMode, camera]);

  // Globe mode: only rotation, fixed distance
  // Flat mode: pan and zoom enabled
  const isGlobeMode = morphProgress < 0.5;

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={!isGlobeMode}
      enableZoom={true}
      enableRotate={true}
      minDistance={isGlobeMode ? 1.8 : 0.5}
      maxDistance={isGlobeMode ? 6 : 8}
      dampingFactor={0.08}
      enableDamping
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.8}
      // Globe mode: free rotation around the globe
      // Flat mode: limit rotation to almost flat view
      minPolarAngle={isGlobeMode ? 0.1 : Math.PI / 2 - 0.05}
      maxPolarAngle={isGlobeMode ? Math.PI - 0.1 : Math.PI / 2 + 0.05}
      // Flat mode: limit azimuth rotation
      minAzimuthAngle={isGlobeMode ? -Infinity : -0.05}
      maxAzimuthAngle={isGlobeMode ? Infinity : 0.05}
    />
  );
}

// ==========================================
// Loading Fallback
// ==========================================

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#2a2a4a" wireframe />
    </mesh>
  );
}

// ==========================================
// Scene Content
// ==========================================

interface SceneProps {
  countries: CountryFeature[];
}

function Scene({ countries }: SceneProps) {
  const { morphProgress } = useMorphAnimation();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.3} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={45} />
      <CameraController />

      {/* Globe with countries */}
      <Suspense fallback={<LoadingFallback />}>
        <Globe
          countries={countries}
          morphProgress={morphProgress}
        />
      </Suspense>

      {/* Background */}
      <color attach="background" args={["#0a0a1a"]} />
    </>
  );
}

// ==========================================
// MapCanvas Component
// ==========================================

export interface MapCanvasProps {
  countries: CountryFeature[];
  className?: string;
  showStats?: boolean;
}

export function MapCanvas({
  countries,
  className = "",
  showStats = false,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        ref={canvasRef}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        shadows={false}
      >
        <Scene countries={countries} />
        {showStats && <Stats />}
      </Canvas>
    </div>
  );
}

export default MapCanvas;
