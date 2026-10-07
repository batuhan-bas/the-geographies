"use client";

import { useState } from "react";
import { gsap } from "gsap";
import {
  useViewMode,
  useMorphAnimation,
  useLayers,
  useDayNight,
  morphProgressRef,
} from "@/store/hooks";
import { useMapStore } from "@/store/mapStore";
import { PROJECTIONS, PROJECTION_LABELS, type ProjectionType } from "@/lib/geo/projection";
import { transitionProjection } from "@/lib/geo/projectionTransition";
import type { MapLayer, ViewMode } from "@/types/geo";

// ==========================================
// Layer configuration (icon tile colors: MASTER.md › Color)
// ==========================================

interface LayerConfig {
  id: MapLayer;
  label: string;
  tile: string;
  icon: React.ReactNode;
  /** Only meaningful while this other layer is on */
  requires?: MapLayer;
}

const LAYERS: LayerConfig[] = [
  { id: "political", label: "Political", tile: "#5e5ce6", icon: <FlagIcon /> },
  { id: "physical", label: "Physical", tile: "#30a46c", icon: <MountainIcon /> },
  { id: "topography", label: "Topography", tile: "#bf8b2e", icon: <ContourIcon /> },
  { id: "choropleth", label: "Data", tile: "#0a84ff", icon: <ChartIcon />, requires: "political" },
  { id: "heatmap", label: "Heatmap", tile: "#ff6b3d", icon: <FlameIcon /> },
];

// ==========================================
// ControlPanel — Apple Maps style map controls (bottom-left)
// ==========================================

export const ControlPanel = () => {
  const { viewMode, setViewMode } = useViewMode();
  const { setMorphProgress, setIsAnimating, isAnimating } = useMorphAnimation();

  // The view the user picked; updates immediately (the store's viewMode
  // only flips once the morph animation completes)
  const [selectedView, setSelectedView] = useState<ViewMode>(viewMode);
  const isFlat = selectedView === "flat";

  const handleViewChange = (next: ViewMode) => {
    if (next === selectedView || isAnimating) {
      return;
    }
    setSelectedView(next);
    setIsAnimating(true);
    gsap.to(morphProgressRef, {
      current: next === "globe" ? 0 : 1,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        setMorphProgress(next === "globe" ? 0 : 1);
        setViewMode(next);
        setIsAnimating(false);
      },
    });
  };

  return (
    <div className="glass enter-spring absolute bottom-5 left-5 z-20 grid w-[268px] gap-3 rounded-panel p-3 [--enter-y:10px]">
      <ViewSegment value={selectedView} onChange={handleViewChange} />
      <ProjectionRow open={isFlat} />
      <SectionLabel>Map layers</SectionLabel>
      <LayerList isFlat={isFlat} />
    </div>
  );
};

// ==========================================
// Globe / Flat segmented control
// ==========================================

const ViewSegment = ({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) => (
  <div
    className="relative grid grid-cols-2 rounded-[10px] bg-fill-1 p-0.5"
    role="radiogroup"
    aria-label="View"
  >
    <span
      aria-hidden="true"
      className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-thumb bg-fill-3 shadow-(--shadow-thumb) transition-transform duration-(--dur-spring) ease-(--ease-spring) ${
        value === "flat" ? "translate-x-full" : ""
      }`}
    />
    {(["globe", "flat"] as const).map((mode) => {
      const active = value === mode;
      return (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(mode)}
          className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 py-[7px] text-[13px] font-semibold transition-colors duration-(--dur-hover) ${
            active ? "text-label" : "text-label-2 hover:text-label"
          }`}
        >
          {mode === "globe" ? <GlobeIcon /> : <MapIcon />}
          {mode === "globe" ? "Globe" : "Flat"}
        </button>
      );
    })}
  </div>
);

// ==========================================
// Projection chips (flat mode only)
// ==========================================

const ProjectionRow = ({ open }: { open: boolean }) => {
  const projection = useMapStore((state) => state.projection);
  const setProjection = useMapStore((state) => state.setProjection);

  const select = (next: ProjectionType) => {
    if (next === projection) {
      return;
    }
    setProjection(next);
    transitionProjection(next);
  };

  return (
    // Collapses to zero height in globe mode; hidden content leaves the tab order
    <div
      className={`grid transition-[grid-template-rows,opacity,margin] ease-(--ease-spring) ${
        open
          ? "grid-rows-[1fr] opacity-100 duration-(--dur-spring)"
          : "-mt-3 grid-rows-[0fr] opacity-0 duration-(--dur-exit)"
      }`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="grid min-h-0 gap-2 overflow-hidden">
        <SectionLabel>Projection</SectionLabel>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Projection">
          {PROJECTIONS.map((id) => {
            const active = id === projection;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => select(id)}
                className={`pressable rounded-full px-2.5 py-1.5 text-[12.5px] font-medium ${
                  active ? "bg-accent text-white" : "bg-fill-1 text-label-2 hover:bg-fill-2"
                }`}
              >
                {PROJECTION_LABELS[id]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Layer list (grouped rows with switches)
// ==========================================

const LayerList = ({ isFlat }: { isFlat: boolean }) => {
  const { activeLayers, toggleLayer } = useLayers();
  const { enableDayNight, toggleDayNight } = useDayNight();

  return (
    <div className="overflow-hidden rounded-control bg-fill-1">
      {LAYERS.map((layer) => {
        const disabled = layer.requires ? !activeLayers.has(layer.requires) : false;
        return (
          <SwitchRow
            key={layer.id}
            label={layer.label}
            tile={layer.tile}
            icon={layer.icon}
            checked={activeLayers.has(layer.id) && !disabled}
            disabled={disabled}
            hint={disabled ? "Needs Political" : undefined}
            onToggle={() => toggleLayer(layer.id)}
          />
        );
      })}
      <SwitchRow
        label="Day / Night"
        tile="#3a3a8c"
        icon={<MoonIcon />}
        checked={enableDayNight && !isFlat}
        disabled={isFlat}
        hint={isFlat ? "Globe only" : undefined}
        onToggle={toggleDayNight}
      />
    </div>
  );
};

const SwitchRow = ({
  label,
  tile,
  icon,
  checked,
  disabled,
  hint,
  onToggle,
}: {
  label: string;
  tile: string;
  icon: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  onToggle: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onToggle}
    className="group grid w-full cursor-pointer grid-cols-[28px_1fr_auto] items-center gap-3 px-3 py-[9px] text-left transition-colors duration-(--dur-hover) not-first:shadow-[inset_52px_0.5px_0_-52px_var(--sep)] hover:bg-fill-1 disabled:cursor-default disabled:hover:bg-transparent"
  >
    <span
      className="grid size-7 place-items-center rounded-lg text-white group-disabled:opacity-40"
      style={{ background: tile }}
      aria-hidden="true"
    >
      {icon}
    </span>
    <span className="min-w-0 group-disabled:opacity-40">
      <span className="block text-[14px] font-medium text-label">{label}</span>
      {hint ? <span className="block text-[11.5px] text-label-3">{hint}</span> : null}
    </span>
    <span
      aria-hidden="true"
      className={`relative h-6 w-10 rounded-full transition-colors duration-(--dur-hover) group-disabled:opacity-40 ${
        checked ? "bg-on" : "bg-fill-3"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-(--dur-spring) ease-(--ease-spring) ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </span>
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="px-1 text-[12px] font-semibold text-label-3">{children}</span>
);

// ==========================================
// Icons (24px grid, stroke)
// ==========================================

function Icon({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function GlobeIcon() {
  return (
    <Icon size={14}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </Icon>
  );
}

function MapIcon() {
  return (
    <Icon size={14}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </Icon>
  );
}

function FlagIcon() {
  return (
    <Icon>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </Icon>
  );
}

function MountainIcon() {
  return (
    <Icon>
      <path d="m3 20 6-11 4 6 3-4 5 9z" />
    </Icon>
  );
}

function ContourIcon() {
  return (
    <Icon>
      <path d="M3 17c4-6 7 2 11-4s5-2 7-4M3 12c4-6 7 2 11-4" />
    </Icon>
  );
}

function ChartIcon() {
  return (
    <Icon>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  );
}

function FlameIcon() {
  return (
    <Icon>
      <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
    </Icon>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
    </svg>
  );
}

export default ControlPanel;
