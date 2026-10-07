// Minimal typings for the parts of troika-three-text used directly (the package ships none)
declare module "troika-three-text" {
  import type { Color, Material, Mesh } from "three";

  type ColorValue = string | number | Color;

  export interface TextRenderInfo {
    /** [minX, minY, maxX, maxY] of the laid-out text block in local units */
    blockBounds: [number, number, number, number];
  }

  export class Text extends Mesh {
    text: string;
    fontSize: number;
    color: ColorValue;
    anchorX: number | "left" | "center" | "right" | string;
    anchorY: number | "top" | "top-baseline" | "middle" | "bottom-baseline" | "bottom" | string;
    maxWidth: number;
    textAlign: "left" | "right" | "center" | "justify";
    outlineWidth: number | string;
    outlineColor: ColorValue;
    outlineOpacity: number;
    fillOpacity: number;
    material: Material;
    readonly textRenderInfo: TextRenderInfo | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }

  export class BatchedText extends Text {
    addText(text: Text): void;
    removeText(text: Text): void;
  }
}
