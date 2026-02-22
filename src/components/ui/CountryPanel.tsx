"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useCountrySelection } from "@/store/hooks";

// ==========================================
// Continent Colors (matching CountryMesh)
// ==========================================

const CONTINENT_COLORS: Record<string, string> = {
  Europe: "#5d9b6b",
  Asia: "#d4a574",
  Africa: "#e8a83c",
  "North America": "#7eb5a6",
  "South America": "#6bc268",
  Oceania: "#c287a5",
  Antarctica: "#b8c4ce",
};

// ==========================================
// CountryPanel Component
// ==========================================

export const CountryPanel = () => {
  const { selectedCountry, isPanelOpen, closePanel } = useCountrySelection();
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) {
      return;
    }

    if (isPanelOpen && selectedCountry) {
      gsap.to(panelRef.current, {
        x: 0,
        duration: 0.4,
        ease: "power3.out",
      });

      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current.children,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.05,
            delay: 0.15,
            ease: "power2.out",
          },
        );
      }
    } else {
      gsap.to(panelRef.current, {
        x: "100%",
        duration: 0.3,
        ease: "power3.in",
      });
    }
  }, [isPanelOpen, selectedCountry]);

  const properties = selectedCountry?.properties;
  const continentColor = CONTINENT_COLORS[properties?.continent || ""] || "#6b7c93";
  const initial = (properties?.name || "?")[0].toUpperCase();

  return (
    <>
      {/* Backdrop */}
      {isPanelOpen ? (
        <div
          className="fixed inset-0 z-10"
          style={{ background: "rgba(0,0,0,0.18)" }}
          onClick={closePanel}
        />
      ) : null}

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-[360px] z-20 transform translate-x-full flex flex-col"
        style={{
          background: "rgba(7, 10, 22, 0.90)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.07)",
          boxShadow: "-20px 0 60px rgba(0, 0, 0, 0.45)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-[14px] flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span
            className="text-[10px] font-semibold tracking-[0.15em] uppercase"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Country Details
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closePanel();
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label="Close panel"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-5 py-5"
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          {properties ? (
            <>
              {/* Country Hero */}
              <div className="flex items-start gap-4">
                {/* Country Avatar */}
                <div
                  className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center text-[18px] font-bold flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${continentColor}30 0%, ${continentColor}14 100%)`,
                    border: `1px solid ${continentColor}30`,
                    color: continentColor,
                  }}
                >
                  {initial}
                </div>

                {/* Name + Formal name */}
                <div className="min-w-0 flex-1">
                  <h2
                    className="text-[22px] font-semibold tracking-tight leading-tight"
                    style={{ color: "rgba(255,255,255,0.95)" }}
                  >
                    {properties.name}
                  </h2>
                  {properties.formal_name && properties.formal_name !== properties.name ? (
                    <p
                      className="text-[11px] mt-0.5 leading-tight"
                      style={{ color: "rgba(255,255,255,0.32)" }}
                    >
                      {properties.formal_name}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {properties.iso_a2 && properties.iso_a2 !== "-1" ? (
                      <Badge>{properties.iso_a2}</Badge>
                    ) : null}
                    {properties.iso_a3 && properties.iso_a3 !== "-99" ? (
                      <Badge>{properties.iso_a3}</Badge>
                    ) : null}
                    {properties.type ? <Badge accent>{properties.type}</Badge> : null}
                  </div>
                </div>
              </div>

              {/* Location */}
              <GlassCard title="Location">
                <InfoRow label="Continent" value={properties.continent} />
                {properties.region ? (
                  <InfoRow label="Region" value={properties.region} divider />
                ) : null}
                {properties.subregion ? (
                  <InfoRow label="Subregion" value={properties.subregion} divider />
                ) : null}
              </GlassCard>

              {/* Statistics */}
              {properties.pop_est || properties.gdp_md ? (
                <div>
                  <SectionLabel>Statistics</SectionLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    {properties.pop_est !== undefined && properties.pop_est > 0 && (
                      <StatCard
                        label="Population"
                        value={formatNumber(properties.pop_est)}
                        accent="#60a5fa"
                      />
                    )}
                    {properties.gdp_md !== undefined && properties.gdp_md > 0 && (
                      <StatCard
                        label="GDP"
                        value={`$${formatNumber(properties.gdp_md)}M`}
                        accent="#34d399"
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {/* Economic Classification */}
              {properties.economy || properties.income_grp ? (
                <GlassCard title="Economic Classification">
                  {properties.economy ? (
                    <div>
                      <p
                        className="text-[9px] font-semibold tracking-[0.12em] uppercase"
                        style={{ color: "rgba(255,255,255,0.22)" }}
                      >
                        Economy Type
                      </p>
                      <p
                        className="text-xs mt-1 font-medium"
                        style={{ color: "rgba(255,255,255,0.72)" }}
                      >
                        {properties.economy}
                      </p>
                    </div>
                  ) : null}
                  {properties.economy && properties.income_grp ? (
                    <div
                      className="my-3"
                      style={{
                        height: "1px",
                        background: "rgba(255,255,255,0.05)",
                      }}
                    />
                  ) : null}
                  {properties.income_grp ? (
                    <div>
                      <p
                        className="text-[9px] font-semibold tracking-[0.12em] uppercase"
                        style={{ color: "rgba(255,255,255,0.22)" }}
                      >
                        Income Group
                      </p>
                      <p
                        className="text-xs mt-1 font-medium"
                        style={{ color: "rgba(255,255,255,0.72)" }}
                      >
                        {properties.income_grp}
                      </p>
                    </div>
                  ) : null}
                </GlassCard>
              ) : null}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                  }
                >
                  View Full Profile
                </button>
                <button
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    background: "rgba(59, 130, 246, 0.18)",
                    border: "1px solid rgba(59, 130, 246, 0.28)",
                    color: "rgba(147, 197, 253, 0.92)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(59, 130, 246, 0.26)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(59, 130, 246, 0.18)")
                  }
                >
                  View Statistics
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

// ==========================================
// Sub-components
// ==========================================

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    className="text-[9px] font-semibold tracking-[0.14em] uppercase"
    style={{ color: "rgba(255,255,255,0.22)" }}
  >
    {children}
  </p>
);

const GlassCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div
    className="rounded-xl px-3.5 py-3"
    style={{
      background: "rgba(255,255,255,0.035)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <p
      className="text-[9px] font-semibold tracking-[0.14em] uppercase mb-3"
      style={{ color: "rgba(255,255,255,0.22)" }}
    >
      {title}
    </p>
    {children}
  </div>
);

const InfoRow = ({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) => (
  <>
    {divider ? <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} /> : null}
    <div className="flex justify-between items-center py-[9px]">
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.36)" }}>
        {label}
      </span>
      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.78)" }}>
        {value}
      </span>
    </div>
  </>
);

const StatCard = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div
    className="rounded-xl px-3 py-3"
    style={{
      background: "rgba(255,255,255,0.035)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderTop: `2px solid ${accent}40`,
    }}
  >
    <p
      className="text-[9px] font-semibold tracking-[0.1em] uppercase mb-1.5"
      style={{ color: "rgba(255,255,255,0.28)" }}
    >
      {label}
    </p>
    <p className="text-xl font-semibold tracking-tight" style={{ color: accent }}>
      {value}
    </p>
  </div>
);

const Badge = ({ children, accent }: { children: React.ReactNode; accent?: boolean }) => (
  <span
    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
    style={
      accent
        ? {
            background: "rgba(59, 130, 246, 0.12)",
            color: "rgba(147, 197, 253, 0.85)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }
        : {
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.42)",
            border: "1px solid rgba(255,255,255,0.06)",
          }
    }
  >
    {children}
  </span>
);

// ==========================================
// Helper Functions
// ==========================================

function formatNumber(num: number): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
}

// ==========================================
// Icons
// ==========================================

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default CountryPanel;
