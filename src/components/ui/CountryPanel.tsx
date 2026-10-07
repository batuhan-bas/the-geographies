"use client";

import { useEffect, useMemo, useState } from "react";
import { useCountrySelection } from "@/store/hooks";
import { useMapStore } from "@/store/mapStore";
import { getCountryColor } from "@/lib/geo/countryColors";
import { formatCoordinates, formatGdp, formatPopulation, stripRank } from "@/lib/geo/format";
import { buildSilhouette } from "@/lib/geo/silhouette";
import type { CountryFeature, CountryGeometryData } from "@/types/geo";

interface CountryPanelProps {
  /** Prebuilt geometry, used to draw the country silhouette */
  geometryData?: CountryGeometryData;
}

// ==========================================
// CountryPanel — Apple Maps style place card (MASTER.md › Place card)
// ==========================================

export const CountryPanel = ({ geometryData }: CountryPanelProps) => {
  const { selectedCountry, isPanelOpen, closePanel } = useCountrySelection();
  const open = isPanelOpen && selectedCountry !== null;

  // Keep the last country rendered while the card animates out
  const [shown, setShown] = useState<CountryFeature | null>(selectedCountry);
  if (selectedCountry && selectedCountry !== shown) {
    setShown(selectedCountry);
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  return (
    <aside
      aria-label={shown ? `${shown.properties.name} details` : "Country details"}
      aria-hidden={!open}
      inert={!open}
      className={`glass fixed inset-x-3 bottom-3 z-20 flex h-[min(62vh,560px)] flex-col overflow-hidden rounded-panel sm:inset-x-auto sm:top-5 sm:right-5 sm:bottom-5 sm:h-auto sm:w-[360px] ${
        open
          ? "translate-x-0 opacity-100 transition-[transform,opacity] duration-(--dur-spring) ease-(--ease-spring)"
          : "pointer-events-none translate-y-4 opacity-0 transition-[transform,opacity] duration-(--dur-exit) ease-(--ease-exit) sm:translate-x-6 sm:translate-y-0"
      }`}
    >
      {shown ? (
        <PlaceCard
          key={shown.index}
          country={shown}
          geometryData={geometryData}
          onClose={closePanel}
        />
      ) : null}
    </aside>
  );
};

// ==========================================
// Card content
// ==========================================

const PlaceCard = ({
  country,
  geometryData,
  onClose,
}: {
  country: CountryFeature;
  geometryData?: CountryGeometryData;
  onClose: () => void;
}) => {
  const p = country.properties;
  const color = getCountryColor(p.continent, country.index);
  const silhouette = useMemo(
    () => (geometryData ? buildSilhouette(geometryData, country.index) : null),
    [geometryData, country.index],
  );
  const population = formatPopulation(p.pop_est);
  const gdp = formatGdp(p.gdp_md);
  const coordinates = formatCoordinates(country.label);
  const codes = [p.iso_a2, p.iso_a3].filter((c) => c && !/^-|^--/.test(c));

  return (
    <>
      {/* Hero: continent-tinted wash + silhouette from real geometry */}
      <div
        className="relative grid h-[150px] flex-none place-items-center border-b-[0.5px] border-sep"
        style={{
          background: `radial-gradient(120% 120% at 20% 0%, color-mix(in srgb, ${color} 50%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in srgb, ${color} 16%, transparent), transparent)`,
        }}
      >
        {silhouette ? (
          <svg
            viewBox={`-4 -4 ${silhouette.width + 8} ${silhouette.height + 8}`}
            className="enter-spring h-[104px] w-[70%] drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]"
            role="img"
            aria-label={`Outline of ${p.name}`}
          >
            <path
              d={silhouette.path}
              fill={color}
              stroke={color}
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="pressable absolute top-3 right-3 grid size-[30px] place-items-center rounded-full bg-fill-2 text-label-2 hover:bg-fill-3"
          aria-label="Close"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="grid content-start gap-4 overflow-y-auto px-5 pt-4 pb-5">
        {/* Title */}
        <div className="enter-spring">
          <h2 className="font-display text-[30px] leading-[1.1] font-bold tracking-[-0.02em] text-label">
            {p.name}
          </h2>
          <p className="mt-1 text-[14px] text-label-2">
            {[
              p.formal_name && p.formal_name !== p.name ? p.formal_name : null,
              p.subregion ?? p.continent,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {codes.map((code) => (
              <span
                key={code}
                className="rounded-md bg-fill-1 px-[7px] py-0.5 font-mono text-[11px] text-label-2"
              >
                {code}
              </span>
            ))}
            {p.type ? (
              <span className="rounded-md bg-fill-1 px-[7px] py-0.5 text-[11px] text-label-2">
                {p.type}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <CardActions country={country} coordinates={coordinates} />

        {/* Stats */}
        {population || gdp ? (
          <div className="enter-spring grid grid-cols-2 gap-2 [animation-delay:calc(2*var(--stagger))]">
            {population ? (
              <Stat label="Population" value={population.value} unit={population.unit} />
            ) : null}
            {gdp ? <Stat label="GDP" value={gdp.value} unit={gdp.unit} /> : null}
          </div>
        ) : null}

        {/* Details */}
        <dl className="enter-spring rounded-control bg-fill-1 [animation-delay:calc(3*var(--stagger))]">
          <Row label="Continent" value={p.continent} />
          {p.region && p.region !== p.continent ? <Row label="Region" value={p.region} /> : null}
          {p.subregion ? <Row label="Subregion" value={p.subregion} /> : null}
          <Row label="Coordinates" value={coordinates} mono />
          {p.economy ? <Row label="Economy" value={stripRank(p.economy)} /> : null}
          {p.income_grp ? <Row label="Income group" value={stripRank(p.income_grp)} /> : null}
          {p.sovereignty && p.sovereignty !== p.name ? (
            <Row label="Sovereignty" value={p.sovereignty} />
          ) : null}
        </dl>
      </div>
    </>
  );
};

const CardActions = ({
  country,
  coordinates,
}: {
  country: CountryFeature;
  coordinates: string;
}) => {
  const requestFocus = useMapStore((state) => state.requestFocus);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard
      .writeText(coordinates)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const wikiTitle = encodeURIComponent(
    (country.properties.name_long ?? country.properties.name).replace(/ /g, "_"),
  );
  const tile =
    "pressable grid justify-items-center gap-1 rounded-control pt-2.5 pb-2 text-[12px] font-semibold";

  return (
    <div className="enter-spring grid grid-cols-3 gap-2 [animation-delay:var(--stagger)]">
      <button
        type="button"
        onClick={requestFocus}
        className={`${tile} bg-accent text-white hover:brightness-110`}
      >
        <ActionIcon d="M12 2v4M12 18v4M2 12h4M18 12h4" circle />
        Focus
      </button>
      <button
        type="button"
        onClick={copy}
        className={`${tile} bg-fill-1 text-accent hover:bg-fill-2`}
        aria-live="polite"
      >
        <ActionIcon d={copied ? "M5 12l5 5L20 7" : "M9 9h11v11H9zM5 15H4V4h11v1"} />
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={`https://en.wikipedia.org/wiki/${wikiTitle}`}
        target="_blank"
        rel="noreferrer"
        className={`${tile} bg-fill-1 text-accent hover:bg-fill-2`}
      >
        <ActionIcon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
        Wikipedia
      </a>
    </div>
  );
};

const ActionIcon = ({ d, circle = false }: { d: string; circle?: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {circle ? <circle cx="12" cy="12" r="3" /> : null}
    <path d={d} />
  </svg>
);

const Stat = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
  <div className="rounded-control bg-fill-1 p-3">
    <span className="block text-[12px] text-label-2">{label}</span>
    <span className="mt-0.5 block font-display text-[24px] font-semibold tracking-[-0.01em] text-label tabular-nums">
      {value}
      <span className="ml-0.5 text-[14px] font-medium text-label-2">{unit}</span>
    </span>
  </div>
);

const Row = ({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) => (
  <div className="grid grid-cols-[auto_1fr] gap-3 px-3 py-[11px] text-[14px] not-first:border-t-[0.5px] not-first:border-sep">
    <dt className="text-label-2">{label}</dt>
    <dd className={`text-right text-label ${mono ? "font-mono text-[12.5px]" : ""}`}>
      {value ?? "—"}
    </dd>
  </div>
);

export default CountryPanel;
