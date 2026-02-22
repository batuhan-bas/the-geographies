"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import {
  useViewMode,
  useMorphAnimation,
  useLayers,
  useDayNight,
  morphProgressRef,
} from "@/store/hooks";
import type { MapLayer } from "@/types/geo";

// ==========================================
// Icons
// ==========================================

const FlagIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const MountainIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
  </svg>
);

const ContourIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10" />
    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6" />
    <path d="M12 10a2 2 0 0 0-2 2 2 2 0 0 0 2 2" />
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const FlameIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

// ==========================================
// Layer Configuration
// ==========================================

const LAYERS: { id: MapLayer; label: string; icon: React.ReactNode; requires?: MapLayer }[] = [
  { id: "political", label: "Political", icon: <FlagIcon className="w-[15px] h-[15px]" /> },
  { id: "physical", label: "Physical", icon: <MountainIcon className="w-[15px] h-[15px]" /> },
  { id: "topography", label: "Topography", icon: <ContourIcon className="w-[15px] h-[15px]" /> },
  {
    id: "choropleth",
    label: "Data",
    icon: <ChartIcon className="w-[15px] h-[15px]" />,
    requires: "political",
  },
  { id: "heatmap", label: "Heatmap", icon: <FlameIcon className="w-[15px] h-[15px]" /> },
];

const GLASS_STYLE = {
  background: "rgba(8, 13, 26, 0.84)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.07)",
  boxShadow:
    "0 20px 60px rgba(0, 0, 0, 0.55), 0 0 0 0.5px rgba(255, 255, 255, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
} as const;

// ==========================================
// ControlPanel Component
// ==========================================

export const ControlPanel = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: 0.2, ease: "power3.out" },
      );
    }
  }, []);

  return (
    <div ref={containerRef} className="absolute bottom-6 left-6 z-10">
      <div className="w-[214px] rounded-2xl overflow-hidden" style={GLASS_STYLE}>
        <ViewModeSection />

        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 10px" }} />

        <LayersSection />

        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 10px" }} />

        <EffectsSection />
      </div>
    </div>
  );
};

// ==========================================
// View Mode Section
// ==========================================

const ViewModeSection = () => {
  const { viewMode, setViewMode } = useViewMode();
  const { setMorphProgress, setIsAnimating, isAnimating } = useMorphAnimation();

  const handleToggle = (newMode: "globe" | "flat") => {
    if (viewMode === newMode || isAnimating) {
      return;
    }

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
    <div className="p-2.5">
      <div className="flex rounded-xl p-[3px]" style={{ background: "rgba(255,255,255,0.04)" }}>
        <ViewButton
          active={viewMode === "globe"}
          onClick={() => handleToggle("globe")}
          icon={<GlobeIcon className="w-3.5 h-3.5" />}
          label="Globe"
        />
        <ViewButton
          active={viewMode === "flat"}
          onClick={() => handleToggle("flat")}
          icon={<MapIcon className="w-3.5 h-3.5" />}
          label="Flat"
        />
      </div>
    </div>
  );
};

const ViewButton = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200"
    style={
      active
        ? {
            background: "rgba(255,255,255,0.11)",
            color: "rgba(255,255,255,0.95)",
            boxShadow: "0 1px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
          }
        : { color: "rgba(255,255,255,0.36)" }
    }
  >
    {icon}
    {label}
  </button>
);

// ==========================================
// Layers Section
// ==========================================

const LayersSection = () => {
  const { activeLayers, toggleLayer } = useLayers();

  return (
    <div className="px-2.5 py-3">
      <p
        className="text-[9px] font-semibold tracking-[0.14em] uppercase mb-2 px-1.5"
        style={{ color: "rgba(255,255,255,0.22)" }}
      >
        Layers
      </p>
      <div className="space-y-px">
        {LAYERS.filter((layer) => !layer.requires || activeLayers.has(layer.requires)).map(
          (layer) => (
            <LayerButton
              key={layer.id}
              icon={layer.icon}
              label={layer.label}
              active={activeLayers.has(layer.id)}
              onToggle={() => toggleLayer(layer.id)}
            />
          ),
        )}
      </div>
    </div>
  );
};

const LayerButton = ({
  icon,
  label,
  active,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-2.5 py-[9px] pl-3.5 pr-2.5 rounded-xl text-xs transition-all duration-150 relative"
    style={active ? { background: "rgba(59, 130, 246, 0.09)" } : {}}
  >
    {/* Left accent bar */}
    <span
      className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all duration-200"
      style={{
        height: "52%",
        background: active ? "rgba(96, 165, 250, 0.85)" : "rgba(255,255,255,0.07)",
      }}
    />

    {/* Icon */}
    <span
      className="transition-colors duration-150 flex-shrink-0"
      style={{ color: active ? "#60a5fa" : "rgba(255,255,255,0.28)" }}
    >
      {icon}
    </span>

    {/* Label */}
    <span
      className="font-medium flex-1 text-left transition-colors duration-150"
      style={{ color: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.4)" }}
    >
      {label}
    </span>

    {/* Status indicator */}
    <span
      className="w-[5px] h-[5px] rounded-full flex-shrink-0 transition-all duration-200"
      style={{ background: active ? "#60a5fa" : "rgba(255,255,255,0.1)" }}
    />
  </button>
);

// ==========================================
// Effects Section
// ==========================================

const EffectsSection = () => {
  const { enableDayNight, toggleDayNight } = useDayNight();
  const { viewMode } = useViewMode();
  const isDisabled = viewMode === "flat";

  return (
    <div className="px-2.5 py-3">
      <p
        className="text-[9px] font-semibold tracking-[0.14em] uppercase mb-2 px-1.5"
        style={{ color: "rgba(255,255,255,0.22)" }}
      >
        Effects
      </p>
      <button
        onClick={toggleDayNight}
        disabled={isDisabled}
        className="w-full flex items-center gap-2.5 py-[9px] pl-3.5 pr-2.5 rounded-xl text-xs transition-all duration-150 relative"
        style={
          isDisabled
            ? { cursor: "not-allowed" }
            : enableDayNight
              ? { background: "rgba(245, 158, 11, 0.08)" }
              : {}
        }
      >
        {/* Left accent bar */}
        <span
          className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all duration-200"
          style={{
            height: "52%",
            background:
              enableDayNight && !isDisabled ? "rgba(251, 191, 36, 0.85)" : "rgba(255,255,255,0.07)",
          }}
        />

        {/* Icon */}
        <span
          className="transition-colors duration-150 flex-shrink-0"
          style={{
            color: enableDayNight && !isDisabled ? "#fbbf24" : "rgba(255,255,255,0.28)",
          }}
        >
          <SunMoonIcon className="w-[15px] h-[15px]" />
        </span>

        {/* Label */}
        <span
          className="font-medium flex-1 text-left transition-colors duration-150"
          style={{
            color:
              enableDayNight && !isDisabled
                ? "rgba(255,255,255,0.88)"
                : isDisabled
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.4)",
          }}
        >
          Day / Night
        </span>

        {/* Toggle Switch */}
        <span
          className="flex-shrink-0 rounded-full p-[2px] transition-all duration-300 flex items-center"
          style={{
            width: "30px",
            height: "17px",
            background: isDisabled
              ? "rgba(255,255,255,0.06)"
              : enableDayNight
                ? "rgba(251, 191, 36, 0.6)"
                : "rgba(255,255,255,0.1)",
          }}
        >
          <span
            className="block rounded-full bg-white shadow-sm transition-all duration-300"
            style={{
              width: "13px",
              height: "13px",
              transform: enableDayNight ? "translateX(13px)" : "translateX(0)",
              opacity: isDisabled ? 0.25 : 1,
            }}
          />
        </span>
      </button>
    </div>
  );
};

const GlobeIcon = ({ className }: { className?: string }) => (
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
    <ellipse cx="12" cy="12" rx="4" ry="10" />
    <path d="M2 12h20" />
  </svg>
);

const MapIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

const SunMoonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
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

export default ControlPanel;
