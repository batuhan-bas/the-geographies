"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useViewMode, useMorphAnimation, useLayers, morphProgressRef } from "@/store/hooks";
import type { MapLayer } from "@/types/geo";

// ==========================================
// Layer Configuration
// ==========================================

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: "political", label: "Political" },
  { id: "physical", label: "Physical" },
];

// ==========================================
// ControlPanel Component
// ==========================================

export function ControlPanel() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.3, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-6 z-10"
    >
      <div className="w-52 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-white/[0.06] shadow-2xl overflow-hidden">
        {/* View Mode Section */}
        <ViewModeSection />

        {/* Divider */}
        <div className="h-px bg-white/[0.06]" />

        {/* Layers Section */}
        <LayersSection />
      </div>
    </div>
  );
}

// ==========================================
// View Mode Section
// ==========================================

function ViewModeSection() {
  const { viewMode, setViewMode } = useViewMode();
  const { setMorphProgress, setIsAnimating, isAnimating } = useMorphAnimation();

  const handleToggle = (newMode: "globe" | "flat") => {
    if (viewMode === newMode || isAnimating) return;

    const targetProgress = newMode === "globe" ? 0 : 1;
    setIsAnimating(true);

    gsap.to(morphProgressRef, {
      current: targetProgress,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        setMorphProgress(targetProgress);
        setViewMode(newMode);
        setIsAnimating(false);
      },
    });
  };

  return (
    <div className="p-4">
      <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-500 mb-3 block">
        View
      </span>

      {/* Segmented Control */}
      <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
        <SegmentButton
          active={viewMode === "globe"}
          onClick={() => handleToggle("globe")}
        >
          <GlobeIcon className="w-3.5 h-3.5" />
          Globe
        </SegmentButton>
        <SegmentButton
          active={viewMode === "flat"}
          onClick={() => handleToggle("flat")}
        >
          <MapIcon className="w-3.5 h-3.5" />
          Flat
        </SegmentButton>
      </div>
    </div>
  );
}

// ==========================================
// Segment Button
// ==========================================

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200
        flex items-center justify-center gap-1.5
        ${active
          ? "bg-zinc-700 text-white shadow-sm"
          : "text-zinc-400 hover:text-zinc-200"
        }
      `}
    >
      {children}
    </button>
  );
}

// ==========================================
// Layers Section
// ==========================================

function LayersSection() {
  const { activeLayers, toggleLayer } = useLayers();

  return (
    <div className="p-4 pt-3">
      <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-500 mb-3 block">
        Layers
      </span>

      <div className="space-y-1">
        {LAYERS.map((layer) => (
          <LayerToggle
            key={layer.id}
            label={layer.label}
            active={activeLayers.has(layer.id)}
            onToggle={() => toggleLayer(layer.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Layer Toggle
// ==========================================

function LayerToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm
        transition-all duration-150
        ${active
          ? "text-white bg-zinc-800"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
        }
      `}
    >
      <span className="font-medium">{label}</span>

      {/* Custom Checkbox */}
      <div
        className={`
          w-4 h-4 rounded border-2 transition-all duration-150 flex items-center justify-center
          ${active
            ? "bg-blue-500 border-blue-500"
            : "border-zinc-600"
          }
        `}
      >
        {active && (
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

export default ControlPanel;
