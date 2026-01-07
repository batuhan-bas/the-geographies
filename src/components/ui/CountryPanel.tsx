"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useCountrySelection } from "@/store/hooks";

// ==========================================
// CountryPanel Component
// ==========================================

export function CountryPanel() {
  const { selectedCountry, isPanelOpen, closePanel } = useCountrySelection();
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) return;

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
          }
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

  return (
    <>
      {/* Backdrop */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/20"
          onClick={closePanel}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-[380px] bg-zinc-950 border-l border-white/[0.06] z-20 transform translate-x-full"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 border-b border-white/[0.06]">
          <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-500">
            Country Details
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closePanel();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close panel"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="pt-18 pb-8 px-6 h-full overflow-y-auto" style={{ paddingTop: '72px' }}>
          {properties && (
            <>
              {/* Country Name */}
              <div className="mb-8">
                <h2 className="text-3xl font-semibold tracking-tight text-white leading-tight">
                  {properties.name}
                </h2>
                {properties.formal_name && properties.formal_name !== properties.name && (
                  <p className="text-zinc-400 text-sm mt-1.5">{properties.formal_name}</p>
                )}

                {/* ISO Codes */}
                <div className="flex items-center gap-2 mt-4">
                  <span className="px-2 py-1 bg-zinc-800 rounded text-xs font-mono text-zinc-300">
                    {properties.iso_a2}
                  </span>
                  <span className="px-2 py-1 bg-zinc-800 rounded text-xs font-mono text-zinc-300">
                    {properties.iso_a3}
                  </span>
                  {properties.type && (
                    <span className="px-2 py-1 bg-blue-500/10 rounded text-xs text-blue-400 font-medium">
                      {properties.type}
                    </span>
                  )}
                </div>
              </div>

              {/* Location Section */}
              <Section title="Location">
                <InfoRow label="Continent" value={properties.continent} />
                {properties.region && (
                  <InfoRow label="Region" value={properties.region} />
                )}
                {properties.subregion && (
                  <InfoRow label="Subregion" value={properties.subregion} />
                )}
              </Section>

              {/* Statistics Section */}
              {(properties.pop_est || properties.gdp_md) && (
                <Section title="Statistics">
                  <div className="grid grid-cols-2 gap-3">
                    {properties.pop_est !== undefined && properties.pop_est > 0 && (
                      <StatCard
                        label="Population"
                        value={formatNumber(properties.pop_est)}
                      />
                    )}
                    {properties.gdp_md !== undefined && properties.gdp_md > 0 && (
                      <StatCard
                        label="GDP"
                        value={`$${formatNumber(properties.gdp_md)}M`}
                      />
                    )}
                  </div>
                </Section>
              )}

              {/* Economic Classification */}
              {(properties.economy || properties.income_grp) && (
                <Section title="Economic Classification">
                  {properties.economy && (
                    <InfoCard label="Economy Type" value={properties.economy} />
                  )}
                  {properties.income_grp && (
                    <InfoCard label="Income Group" value={properties.income_grp} />
                  )}
                </Section>
              )}

              {/* Actions */}
              <div className="mt-8 space-y-2">
                <ActionButton variant="secondary">
                  View Full Profile
                </ActionButton>
                <ActionButton variant="primary">
                  View Statistics
                </ActionButton>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ==========================================
// Sub-components
// ==========================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-medium tracking-wider uppercase text-zinc-500 mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-zinc-900 rounded-lg border border-white/[0.04] mb-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <p className="text-sm text-white mt-1 font-medium">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-zinc-900 rounded-lg border border-white/[0.04]">
      <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-500 block mb-1">
        {label}
      </span>
      <p className="text-xl font-semibold text-white tracking-tight">{value}</p>
    </div>
  );
}

function ActionButton({
  variant,
  children,
}: {
  variant: "primary" | "secondary";
  children: React.ReactNode;
}) {
  const baseClasses =
    "w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2";

  const variantClasses =
    variant === "primary"
      ? "bg-blue-500 hover:bg-blue-600 text-white"
      : "bg-zinc-800 hover:bg-zinc-700 text-white";

  return (
    <button className={`${baseClasses} ${variantClasses}`}>
      {children}
    </button>
  );
}

// ==========================================
// Helper Functions
// ==========================================

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

// ==========================================
// Icons
// ==========================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default CountryPanel;
