"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useLayers } from "@/store/hooks";
import type { MapLayer } from "@/types/geo";

// ==========================================
// Layer Configuration
// ==========================================

const LAYERS: { id: MapLayer; label: string; icon: React.ReactNode }[] = [
  {
    id: "political",
    label: "Political",
    icon: <FlagIcon className="w-4 h-4" />,
  },
  {
    id: "physical",
    label: "Physical",
    icon: <MountainIcon className="w-4 h-4" />,
  },
  {
    id: "topography",
    label: "Topography",
    icon: <WavesIcon className="w-4 h-4" />,
  },
  {
    id: "administrative",
    label: "Administrative",
    icon: <BuildingIcon className="w-4 h-4" />,
  },
];

// ==========================================
// LayerControls Component
// ==========================================

export function LayerControls() {
  const { activeLayers, toggleLayer } = useLayers();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5, delay: 0.4 }
      );
    }
  }, []);

  // Expand/collapse animation
  useEffect(() => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        width: isExpanded ? "auto" : 0,
        opacity: isExpanded ? 1 : 0,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
  }, [isExpanded]);

  return (
    <div
      ref={containerRef}
      className="absolute left-6 top-1/2 -translate-y-1/2 z-10"
    >
      <div className="flex items-center gap-2">
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/80 hover:text-white transition-colors"
          title="Toggle Layers"
        >
          <LayersIcon className="w-5 h-5" />
        </button>

        {/* Layer Panel */}
        <div
          ref={panelRef}
          className="overflow-hidden"
          style={{ width: 0, opacity: 0 }}
        >
          <div className="flex flex-col gap-2 p-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
            <span className="text-xs text-white/40 uppercase tracking-wider px-2">
              Layers
            </span>
            {LAYERS.map((layer) => (
              <LayerButton
                key={layer.id}
                layer={layer}
                isActive={activeLayers.has(layer.id)}
                onToggle={() => toggleLayer(layer.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Layer Button
// ==========================================

interface LayerButtonProps {
  layer: { id: MapLayer; label: string; icon: React.ReactNode };
  isActive: boolean;
  onToggle: () => void;
}

function LayerButton({ layer, isActive, onToggle }: LayerButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
        isActive
          ? "bg-white/20 text-white"
          : "text-white/60 hover:text-white hover:bg-white/10"
      }`}
    >
      {layer.icon}
      <span>{layer.label}</span>
      <span
        className={`ml-auto w-2 h-2 rounded-full transition-colors ${
          isActive ? "bg-green-400" : "bg-white/20"
        }`}
      />
    </button>
  );
}

// ==========================================
// Icons
// ==========================================

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function MountainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function WavesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}

export default LayerControls;
