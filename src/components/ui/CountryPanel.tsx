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

  // Slide animation
  useEffect(() => {
    if (!panelRef.current) return;

    if (isPanelOpen && selectedCountry) {
      gsap.to(panelRef.current, {
        x: 0,
        duration: 0.5,
        ease: "power3.out",
      });

      // Stagger content animation
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.1,
            delay: 0.2,
          }
        );
      }
    } else {
      gsap.to(panelRef.current, {
        x: "100%",
        duration: 0.4,
        ease: "power3.in",
      });
    }
  }, [isPanelOpen, selectedCountry]);

  const properties = selectedCountry?.properties;

  return (
    <>
      {/* Backdrop - click to close */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={closePanel}
        />
      )}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-96 bg-black/60 backdrop-blur-xl border-l border-white/10 z-20 transform translate-x-full"
      >
      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          closePanel();
        }}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-50"
        aria-label="Close panel"
      >
        <CloseIcon className="w-5 h-5" />
      </button>

      {/* Content */}
      <div ref={contentRef} className="p-8 pt-16 h-full overflow-y-auto">
        {properties && (
          <>
            {/* Country Name */}
            <div className="mb-6">
              <span className="text-xs text-white/40 uppercase tracking-wider">
                Country
              </span>
              <h2 className="text-3xl font-bold text-white mt-1">
                {properties.name}
              </h2>
              {properties.formal_name && properties.formal_name !== properties.name && (
                <p className="text-white/50 text-sm mt-1">{properties.formal_name}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">
                  {properties.iso_a2}
                </span>
                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">
                  {properties.iso_a3}
                </span>
                {properties.type && (
                  <span className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-400">
                    {properties.type}
                  </span>
                )}
              </div>
            </div>

            {/* Geographic Info */}
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 text-white/40 mb-3">
                <GlobeIcon className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Location</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Continent</span>
                  <span className="text-white text-sm font-medium">{properties.continent}</span>
                </div>
                {properties.region && (
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Region</span>
                    <span className="text-white text-sm font-medium">{properties.region}</span>
                  </div>
                )}
                {properties.subregion && (
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Subregion</span>
                    <span className="text-white text-sm font-medium">{properties.subregion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {properties.pop_est !== undefined && properties.pop_est > 0 && (
                <StatCard
                  label="Population"
                  value={formatNumber(properties.pop_est)}
                  icon={<UsersIcon className="w-4 h-4" />}
                />
              )}
              {properties.gdp_md !== undefined && properties.gdp_md > 0 && (
                <StatCard
                  label="GDP"
                  value={`$${formatNumber(properties.gdp_md)}M`}
                  icon={<DollarIcon className="w-4 h-4" />}
                />
              )}
            </div>

            {/* Economic Info */}
            {(properties.economy || properties.income_grp) && (
              <>
                <div className="h-px bg-white/10 my-6" />
                <div className="space-y-3">
                  <h3 className="text-xs text-white/40 uppercase tracking-wider">
                    Economic Classification
                  </h3>
                  {properties.economy && (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <span className="text-white/60 text-xs">Economy Type</span>
                      <p className="text-white text-sm mt-1">{properties.economy}</p>
                    </div>
                  )}
                  {properties.income_grp && (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <span className="text-white/60 text-xs">Income Group</span>
                      <p className="text-white text-sm mt-1">{properties.income_grp}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <ExternalLinkIcon className="w-4 h-4" />
                View Full Profile
              </button>
              <button className="w-full py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <ChartIcon className="w-4 h-4" />
                View Statistics
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}

// ==========================================
// StatCard Component
// ==========================================

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center gap-2 text-white/40 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export default CountryPanel;
