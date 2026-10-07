"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import {
  loadKtx2,
  planTiers,
  releaseTexture,
  retainTexture,
  textureUrl,
} from "./progressiveTexture";

/** Camera distance (globe radius = 1) below which the on-demand tier is fetched */
const ON_DEMAND_DISTANCE = 2.3;

interface Options {
  /** Treat the texture as sRGB color (false for data such as elevation) */
  srgb?: boolean;
}

/**
 * Load a KTX2 texture progressively: smallest tier first, then the device's
 * base tier, then (desktop only) the largest tier once the camera zooms in.
 * Returns null until the first tier is ready.
 */
export function useProgressiveTexture(
  name: string,
  availableK: number[],
  { srgb = true }: Options = {},
): THREE.Texture | null {
  const { gl, camera } = useThree();
  const plan = useMemo(() => planTiers(gl, availableK), [gl, availableK]);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [wantOnDemand, setWantOnDemand] = useState(false);
  const shownKRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const tiers = [plan.preview, plan.base];
    if (wantOnDemand && plan.onDemand) {
      tiers.push(plan.onDemand);
    }
    const urls = [...new Set(tiers)].map((k) => ({ k, url: textureUrl(name, k) }));
    urls.forEach(({ url }) => retainTexture(url));

    // Load sequentially so the preview is never stuck behind a large download
    void (async () => {
      for (const { k, url } of urls) {
        try {
          const loaded = await loadKtx2(url, gl);
          if (cancelled) {
            return;
          }
          if (srgb) {
            loaded.colorSpace = "srgb";
          }
          if (k > shownKRef.current) {
            shownKRef.current = k;
            setTexture(loaded);
          }
        } catch (error) {
          console.warn(`Failed to load ${url}`, error);
        }
      }
    })();

    return () => {
      cancelled = true;
      urls.forEach(({ url }) => releaseTexture(url));
    };
  }, [gl, name, plan, srgb, wantOnDemand]);

  useFrame(() => {
    if (!wantOnDemand && plan.onDemand && camera.position.length() < ON_DEMAND_DISTANCE) {
      setWantOnDemand(true);
    }
  });

  return texture;
}
