import { gsap } from "gsap";
import { morphProgressRef } from "@/store/hooks";
import { PROJECTION_IDS, projectionRef, type ProjectionType } from "./projection";

/**
 * Animate the flat map to another projection. In globe mode the change is
 * applied instantly (it is invisible until the next flat morph).
 */
export function transitionProjection(target: ProjectionType, duration = 1.1): void {
  gsap.killTweensOf(projectionRef);

  // Interrupted mid-blend: continue from whichever side is closer
  if (projectionRef.blend > 0) {
    projectionRef.from = projectionRef.blend >= 0.5 ? projectionRef.to : projectionRef.from;
    projectionRef.blend = 0;
  }

  const targetId = PROJECTION_IDS[target];
  projectionRef.to = targetId;
  if (projectionRef.from === targetId || morphProgressRef.current < 0.5) {
    projectionRef.from = targetId;
    return;
  }

  gsap.to(projectionRef, {
    blend: 1,
    duration,
    ease: "power2.inOut",
    onComplete: () => {
      projectionRef.from = targetId;
      projectionRef.blend = 0;
    },
  });
}
