"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useViewMode, useMorphAnimation } from "@/store/hooks";

// ==========================================
// ViewToggle Component
// ==========================================

export function ViewToggle() {
  const { viewMode, setViewMode } = useViewMode();
  const { setMorphProgress, setIsAnimating } = useMorphAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const newMode = viewMode === "globe" ? "flat" : "globe";
    const targetProgress = newMode === "globe" ? 0 : 1;
    const currentProgress = viewMode === "globe" ? 0 : 1;

    setIsAnimating(true);

    // Animate morph progress with GSAP - smooth elastic easing
    gsap.to(
      { progress: currentProgress },
      {
        progress: targetProgress,
        duration: 2.5,
        ease: "power3.inOut",
        onUpdate: function () {
          setMorphProgress(this.targets()[0].progress);
        },
        onComplete: () => {
          setViewMode(newMode);
          setIsAnimating(false);
        },
      }
    );
  };

  // Entrance animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.3 }
      );
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-10"
    >
      <div className="flex items-center gap-1 p-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
        <button
          onClick={() => viewMode !== "globe" && handleToggle()}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
            viewMode === "globe"
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <GlobeIcon className="w-4 h-4" />
            Globe
          </span>
        </button>

        <button
          onClick={() => viewMode !== "flat" && handleToggle()}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
            viewMode === "flat"
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <MapIcon className="w-4 h-4" />
            Flat
          </span>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Icons
// ==========================================

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export default ViewToggle;
