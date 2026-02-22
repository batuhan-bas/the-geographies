"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useCountries, useCountrySelection } from "@/store/hooks";
import type { CountryFeature } from "@/types/geo";

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

const GLASS_STYLE = {
  background: "rgba(8, 13, 26, 0.84)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  boxShadow:
    "0 20px 60px rgba(0, 0, 0, 0.55), 0 0 0 0.5px rgba(255, 255, 255, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
} as const;

// ==========================================
// CountrySearch Component
// ==========================================

export const CountrySearch = () => {
  const countries = useCountries();
  const { selectCountry, selectedCountry } = useCountrySelection();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter countries based on query
  const filteredCountries = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    const q = query.toLowerCase();
    return countries
      .filter((c) => {
        const name = c.properties?.name?.toLowerCase() || "";
        const iso2 = c.properties?.iso_a2?.toLowerCase() || "";
        const iso3 = c.properties?.iso_a3?.toLowerCase() || "";
        return name.includes(q) || iso2.includes(q) || iso3.includes(q);
      })
      .sort((a, b) => {
        const aName = a.properties?.name?.toLowerCase() || "";
        const bName = b.properties?.name?.toLowerCase() || "";
        const aStartsWith = aName.startsWith(q);
        const bStartsWith = bName.startsWith(q);
        if (aStartsWith && !bStartsWith) {
          return -1;
        }
        if (!aStartsWith && bStartsWith) {
          return 1;
        }
        return aName.localeCompare(bName);
      })
      .slice(0, 8);
  }, [countries, query]);

  // Open dropdown when there are results
  useEffect(() => {
    setIsOpen(filteredCountries.length > 0);
    setHighlightedIndex(0);
  }, [filteredCountries]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle country selection
  const handleSelect = useCallback(
    (country: CountryFeature) => {
      selectCountry(country);
      setQuery("");
      setIsOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [selectCountry],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < filteredCountries.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCountries[highlightedIndex]) {
            handleSelect(filteredCountries[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setQuery("");
          setIsFocused(false);
          inputRef.current?.blur();
          break;
      }
    },
    [filteredCountries, highlightedIndex, handleSelect],
  );

  // Clear search
  const handleClear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div ref={containerRef} className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[360px]">
      {/* Search Input */}
      <div
        className="flex items-center rounded-2xl overflow-hidden transition-all duration-200"
        style={{
          ...GLASS_STYLE,
          border: isFocused
            ? "1px solid rgba(59, 130, 246, 0.35)"
            : "1px solid rgba(255, 255, 255, 0.07)",
          boxShadow: isFocused
            ? "0 20px 60px rgba(0,0,0,0.55), 0 0 0 3px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.06)"
            : GLASS_STYLE.boxShadow,
        }}
      >
        {/* Search Icon */}
        <div
          className="pl-4 flex-shrink-0 transition-colors duration-200"
          style={{ color: isFocused ? "rgba(96, 165, 250, 0.75)" : "rgba(255,255,255,0.28)" }}
        >
          <SearchIcon className="w-4 h-4" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (query) {
              setIsOpen(true);
            }
          }}
          placeholder="Search countries..."
          className="flex-1 bg-transparent text-sm py-3 px-3 outline-none text-white/85 placeholder:text-white/28"
          style={{ caretColor: "#60a5fa" }}
          aria-label="Search countries"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-autocomplete="list"
        />

        {/* Clear Button */}
        {query ? (
          <button
            onClick={handleClear}
            className="pr-4 flex-shrink-0 transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.28)" }}
            aria-label="Clear search"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen ? (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden"
          style={{
            ...GLASS_STYLE,
            border: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          {filteredCountries.length > 0 ? (
            <ul>
              {filteredCountries.map((country, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected =
                  selectedCountry?.properties?.iso_a3 === country.properties?.iso_a3;
                const continentColor =
                  CONTINENT_COLORS[country.properties?.continent || ""] || "#8a9a8a";

                return (
                  <li
                    key={country.properties?.iso_a3 || index}
                    style={{
                      borderBottom:
                        index < filteredCountries.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <button
                      role="option"
                      aria-selected={isHighlighted}
                      onClick={() => handleSelect(country)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-100"
                      style={{
                        background: isHighlighted
                          ? "rgba(255,255,255,0.06)"
                          : isSelected
                            ? "rgba(59,130,246,0.08)"
                            : "transparent",
                      }}
                    >
                      {/* Continent Color Dot */}
                      <span
                        className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                        style={{ background: continentColor, opacity: 0.8 }}
                      />

                      {/* Country Name */}
                      <span
                        className="flex-1 text-sm truncate"
                        style={{ color: "rgba(255,255,255,0.82)" }}
                      >
                        {country.properties?.name}
                      </span>

                      {/* ISO Code */}
                      <span
                        className="text-[10px] font-mono flex-shrink-0"
                        style={{ color: "rgba(255,255,255,0.28)" }}
                      >
                        {country.properties?.iso_a3}
                      </span>

                      {/* Selected Indicator */}
                      {isSelected ? (
                        <CheckIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              className="px-4 py-4 text-sm text-center"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              No countries found
            </div>
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
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default CountrySearch;
