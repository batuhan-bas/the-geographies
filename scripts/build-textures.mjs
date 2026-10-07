#!/usr/bin/env node
/**
 * Build GPU-compressed KTX2 texture tiers from the 16K source images.
 *
 *   pnpm textures            # build all tiers (skips up-to-date outputs)
 *   pnpm textures --force    # rebuild everything
 *
 * Requires `toktx` (KTX-Software >= 4.3) on PATH or in $TOKTX.
 * Sources live in assets/textures-src (not deployed); outputs go to public/textures.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const SRC_DIR = join(ROOT, "assets/textures-src");
const OUT_DIR = join(ROOT, "public/textures");
const TMP_DIR = join(tmpdir(), "the-geographies-textures");
const TOKTX = process.env.TOKTX ?? "toktx";
const FORCE = process.argv.includes("--force");

// Tier widths (height = width / 2, equirectangular)
const COLOR_TIERS = [2048, 4096, 8192, 16384];
const DATA_TIERS = [2048, 4096, 8192];

const TEXTURES = [
  { name: "earth_daymap", src: "earth_daymap.jpg", kind: "color", tiers: COLOR_TIERS },
  { name: "earth_hypsometric", src: "earth_hypsometric.jpg", kind: "color", tiers: COLOR_TIERS },
  { name: "earth_elevation", src: "earth_topology.png", kind: "data", tiers: DATA_TIERS },
  // NASA Black Marble 2016 (13500px source, so no 16K tier)
  { name: "earth_night", src: "earth_night.jpg", kind: "color", tiers: [2048, 4096, 8192] },
];

// Images are flipped at encode time because compressed textures can't use flipY
const COMMON_ARGS = ["--t2", "--genmipmap", "--lower_left_maps_to_s0t0"];
const KIND_ARGS = {
  // Basis ETC1S: smallest download, transcodes to BC1/ETC1/ASTC on the GPU
  color: ["--encode", "etc1s", "--clevel", "2", "--qlevel", "255", "--assign_oetf", "srgb"],
  // Uncompressed single-channel + zstd: exact elevation values for contour lines
  data: ["--target_type", "R", "--zcmp", "19", "--assign_oetf", "linear"],
};

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

for (const texture of TEXTURES) {
  const srcPath = join(SRC_DIR, texture.src);
  if (!existsSync(srcPath)) {
    console.error(`missing source: ${srcPath}`);
    process.exit(1);
  }
  const srcMtime = statSync(srcPath).mtimeMs;

  for (const width of texture.tiers) {
    const outPath = join(OUT_DIR, `${texture.name}_${width / 1024}k.ktx2`);
    if (!FORCE && existsSync(outPath) && statSync(outPath).mtimeMs > srcMtime) {
      console.log(`up to date  ${outPath}`);
      continue;
    }

    const started = Date.now();
    const resizedPath = join(TMP_DIR, `${texture.name}_${width}.png`);
    let image = sharp(srcPath, { limitInputPixels: false }).resize(width, width / 2, {
      kernel: "lanczos3",
    });
    image = texture.kind === "data" ? image.greyscale() : image.removeAlpha();
    await image.png({ compressionLevel: 1 }).toFile(resizedPath);

    execFileSync(
      TOKTX,
      [
        ...COMMON_ARGS,
        ...KIND_ARGS[texture.kind],
        "--threads",
        String(cpus().length),
        outPath,
        resizedPath,
      ],
      { stdio: "inherit" },
    );
    rmSync(resizedPath);

    const sizeMb = (statSync(outPath).size / 1024 / 1024).toFixed(2);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`built       ${outPath} (${sizeMb} MB, ${seconds}s)`);
  }
}
