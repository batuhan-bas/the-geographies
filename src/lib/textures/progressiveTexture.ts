import type * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

// ==========================================
// KTX2 loading with device-aware resolution tiers
// ==========================================
//
// Textures are pre-built by `pnpm textures` into public/textures as
// `<name>_<n>k.ktx2` (Basis ETC1S for color, zstd R8 for data). Each texture
// starts at the smallest tier and is upgraded to the best tier the device can
// afford; the largest tier can be deferred until the camera zooms in.

const TRANSCODER_PATH = "/basis/";

let loader: KTX2Loader | null = null;

function getLoader(renderer: THREE.WebGLRenderer): KTX2Loader {
  loader ??= new KTX2Loader().setTranscoderPath(TRANSCODER_PATH).detectSupport(renderer);
  return loader;
}

// One texture object per URL. Textures are disposed (GPU memory freed) when no
// component uses them anymore, but the CPU-side data stays cached so a layer
// toggled back on re-uploads instantly instead of re-downloading.
const cache = new Map<string, Promise<THREE.Texture>>();
const users = new Map<string, number>();

export function textureUrl(name: string, widthK: number): string {
  return `/textures/${name}_${widthK}k.ktx2`;
}

export function loadKtx2(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  let promise = cache.get(url);
  if (!promise) {
    promise = getLoader(renderer)
      .loadAsync(url)
      .then((texture) => {
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return texture;
      });
    promise.catch(() => cache.delete(url));
    cache.set(url, promise);
  }
  return promise;
}

export function retainTexture(url: string): void {
  users.set(url, (users.get(url) ?? 0) + 1);
}

export function releaseTexture(url: string): void {
  const count = (users.get(url) ?? 1) - 1;
  users.set(url, count);
  if (count <= 0) {
    void cache.get(url)?.then((texture) => {
      if ((users.get(url) ?? 0) <= 0) {
        texture.dispose();
      }
    });
  }
}

// ==========================================
// Tier selection
// ==========================================

export interface TierPlan {
  /** Loaded first, as fast as possible */
  preview: number;
  /** Loaded right after the preview */
  base: number;
  /** Loaded only when the camera zooms in (null if not allowed on this device) */
  onDemand: number | null;
}

function isConstrainedDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return coarsePointer || (memory !== undefined && memory <= 4);
}

/**
 * Pick resolution tiers (in K, e.g. 8 = 8192px wide) from what exists for a
 * texture and what the device supports.
 */
export function planTiers(renderer: THREE.WebGLRenderer, availableK: number[]): TierPlan {
  const sorted = [...availableK].sort((a, b) => a - b);
  const maxSizeK = renderer.capabilities.maxTextureSize / 1024;
  const fits = sorted.filter((k) => k <= maxSizeK);
  const preview = fits[0] ?? sorted[0];

  const baseCapK = isConstrainedDevice() ? 4 : 8;
  const base = [...fits].reverse().find((k) => k <= baseCapK) ?? preview;

  const largest = fits[fits.length - 1];
  const onDemand = !isConstrainedDevice() && largest > base ? largest : null;

  return { preview, base, onDemand };
}
