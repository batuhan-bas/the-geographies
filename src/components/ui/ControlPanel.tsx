"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useViewMode, useMorphAnimation, useLayers, useDayNight, morphProgressRef } from "@/store/hooks";
import type { MapLayer } from "@/types/geo";

// ==========================================
// Layer Configuration
// ==========================================

const LAYERS: { id: MapLayer; label: string; icon: React.ReactNode }[] = [
  { id: "political", label: "Political", icon: <FlagIcon className="w-4 h-4" /> },
  { id: "physical", label: "Physical", icon: <MountainIcon className="w-4 h-4" /> },
];

// ==========================================
// ControlPanel Component
// ==========================================

export function ControlPanel() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: 0.2, ease: "power3.out" }
      );
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-6 z-10"
    >
      <div className="w-56 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        {/* View Mode */}
        <ViewModeSection />

        {/* Layers */}
        <LayersSection />

        {/* Effects */}
        <EffectsSection />
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
    <div className="p-3">
      <div className="flex bg-white/5 rounded-xl p-1">
        <ViewButton
          active={viewMode === "globe"}
          onClick={() => handleToggle("globe")}
          icon={<GlobeIcon className="w-4 h-4" />}
          label="Globe"
        />
        <ViewButton
          active={viewMode === "flat"}
          onClick={() => handleToggle("flat")}
          icon={<MapIcon className="w-4 h-4" />}
          label="Flat"
        />
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
        text-sm font-medium transition-all duration-200
        ${active
          ? "bg-white text-black shadow-lg"
          : "text-white/60 hover:text-white hover:bg-white/5"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

// ==========================================
// Layers Section
// ==========================================

function LayersSection() {
  const { activeLayers, toggleLayer } = useLayers();

  return (
    <div className="px-3 pb-2">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-2 px-1">
        Layers
      </div>
      <div className="space-y-1">
        {LAYERS.map((layer) => (
          <LayerButton
            key={layer.id}
            icon={layer.icon}
            label={layer.label}
            active={activeLayers.has(layer.id)}
            onToggle={() => toggleLayer(layer.id)}
          />
        ))}
      </div>
    </div>
  );
}

function LayerButton({
  icon,
  label,
  active,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm
        transition-all duration-200
        ${active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:text-white/80 hover:bg-white/5"
        }
      `}
    >
      <span className={`transition-colors ${active ? "text-blue-400" : ""}`}>
        {icon}
      </span>
      <span className="font-medium flex-1 text-left">{label}</span>
      <div
        className={`
          w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200
          ${active ? "bg-blue-500" : "bg-white/10"}
        `}
      >
        {active && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ==========================================
// Effects Section
// ==========================================

function EffectsSection() {
  const { enableDayNight, toggleDayNight } = useDayNight();
  const { viewMode } = useViewMode();
  const isDisabled = viewMode === "flat";

  return (
    <div className="px-3 pb-3">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-2 px-1">
        Effects
      </div>
      <button
        onClick={toggleDayNight}
        disabled={isDisabled}
        className={`
          w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm
          transition-all duration-200
          ${isDisabled
            ? "text-white/20 cursor-not-allowed"
            : enableDayNight
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }
        `}
      >
        <span className={`transition-colors ${enableDayNight && !isDisabled ? "text-amber-400" : ""}`}>
          <SunMoonIcon className="w-4 h-4" />
        </span>
        <span className="font-medium flex-1 text-left">Day / Night</span>

        {/* Toggle Switch */}
        <div
          className={`
            w-10 h-6 rounded-full p-0.5 transition-all duration-300
            ${isDisabled
              ? "bg-white/5"
              : enableDayNight
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-white/10"
            }
          `}
        >
          <div
            className={`
              w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300
              ${enableDayNight ? "translate-x-4" : "translate-x-0"}
              ${isDisabled ? "opacity-30" : ""}
            `}
          />
        </div>
      </button>
    </div>
  );
}

// ==========================================
// Icons
// ==========================================

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <path d="M2 12h20" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function MountainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function SunMoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export default ControlPanel;
