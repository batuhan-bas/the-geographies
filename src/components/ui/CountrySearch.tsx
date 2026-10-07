"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useCountries, useCountrySelection } from "@/store/hooks";
import { getCountryColor } from "@/lib/geo/countryColors";
import { formatCoordinates } from "@/lib/geo/format";
import type { CountryFeature } from "@/types/geo";

const MAX_RESULTS = 6;

function matchScore(country: CountryFeature, q: string): number {
  const name = country.properties.name.toLowerCase();
  if (name.startsWith(q)) {
    return 0;
  }
  if (name.includes(q)) {
    return 1;
  }
  const { iso_a2: iso2, iso_a3: iso3 } = country.properties;
  if (iso2?.toLowerCase() === q || iso3?.toLowerCase() === q) {
    return 2;
  }
  return -1;
}

/** Country name with the matched part highlighted */
const HighlightedName = ({ name, query }: { name: string; query: string }) => {
  const at = name.toLowerCase().indexOf(query);
  if (at < 0) {
    return name;
  }
  return (
    <>
      {name.slice(0, at)}
      <mark className="bg-transparent text-accent">{name.slice(at, at + query.length)}</mark>
      {name.slice(at + query.length)}
    </>
  );
};

// ==========================================
// CountrySearch — Apple Maps style search field (MASTER.md › Search field)
// ==========================================

export const CountrySearch = () => {
  const countries = useCountries();
  const { selectCountry } = useCountrySelection();

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) {
      return [];
    }
    return countries
      .map((country) => ({ country, score: matchScore(country, normalized) }))
      .filter((r) => r.score >= 0)
      .sort(
        (a, b) =>
          a.score - b.score || a.country.properties.name.localeCompare(b.country.properties.name),
      )
      .slice(0, MAX_RESULTS)
      .map((r) => r.country);
  }, [countries, normalized]);

  const isOpen = isFocused && normalized.length > 0;
  const activeIndex = Math.min(highlightedIndex, Math.max(0, results.length - 1));

  // ⌘K / Ctrl+K / "/" focus the field from anywhere
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close on outside click
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const handleSelect = useCallback(
    (country: CountryFeature) => {
      selectCountry(country);
      setQuery("");
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [selectCountry],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(Math.min(activeIndex + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(Math.max(activeIndex - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        setQuery("");
        setIsFocused(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-5 left-1/2 z-20 w-[min(440px,calc(100%-32px))] -translate-x-1/2 sm:left-5 sm:w-[min(360px,calc(100%-420px))] sm:translate-x-0 xl:left-1/2 xl:w-[440px] xl:-translate-x-1/2"
    >
      <label
        className="glass flex h-11 items-center gap-2 rounded-control pl-4 pr-3 transition-shadow duration-(--dur-hover) focus-within:shadow-[var(--shadow-panel),inset_0_1px_0_var(--glass-hi),0_0_0_3px_var(--accent-soft)]"
        htmlFor="country-search"
      >
        <SearchIcon className="size-[17px] shrink-0 text-label-2" />
        <input
          id="country-search"
          ref={inputRef}
          type="text"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          placeholder="Search countries"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-label caret-accent outline-none placeholder:text-label-3"
          aria-expanded={isOpen}
          aria-controls="country-search-results"
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && results[activeIndex] ? `country-option-${activeIndex}` : undefined
          }
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="pressable grid size-6 shrink-0 place-items-center rounded-full bg-fill-2 text-label-2 hover:bg-fill-3"
            aria-label="Clear search"
          >
            <CloseIcon className="size-3" />
          </button>
        ) : (
          <kbd className="shrink-0 rounded-md border-[0.5px] border-sep bg-fill-1 px-1.5 py-0.5 font-mono text-[11px] text-label-3">
            ⌘K
          </kbd>
        )}
      </label>

      {isOpen ? (
        <div
          id="country-search-results"
          role="listbox"
          aria-label="Countries"
          className="glass enter-spring mt-2 overflow-hidden rounded-control p-1"
        >
          {results.length > 0 ? (
            results.map((country, index) => {
              const { name, iso_a3: iso3, subregion, continent } = country.properties;
              const active = index === activeIndex;
              return (
                <button
                  key={country.index}
                  id={`country-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(country)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{ animationDelay: `calc(${index} * var(--stagger))` }}
                  className={`pressable enter-spring grid w-full grid-cols-[32px_1fr_auto] items-center gap-3 rounded-row px-3 py-2 text-left ${
                    active ? "bg-fill-2" : ""
                  }`}
                >
                  <span
                    className="grid size-8 place-items-center rounded-full text-[13px] font-semibold text-black/80"
                    style={{ background: getCountryColor(continent, country.index) }}
                    aria-hidden="true"
                  >
                    {name.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-label">
                      <HighlightedName name={name} query={normalized} />
                    </span>
                    <span className="block truncate text-[13px] text-label-2">
                      {[subregion ?? continent, iso3 !== "-99" ? iso3 : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="hidden font-mono text-[11.5px] whitespace-nowrap text-label-3 sm:block">
                    {formatCoordinates(country.label)}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-3 text-[14px] text-label-2">
              No country matches “{query.trim()}”
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};

// ==========================================
// Icons
// ==========================================

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export default CountrySearch;
