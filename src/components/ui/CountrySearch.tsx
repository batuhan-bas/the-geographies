"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useCountries, useCountrySelection } from "@/store/hooks";
import type { CountryFeature } from "@/types/geo";

// ==========================================
// Continent Colors (matching CountryMesh)
// ==========================================

const CONTINENT_COLORS: Record<string, string> = {
  "Europe": "#5d9b6b",
  "Asia": "#d4a574",
  "Africa": "#e8a83c",
  "North America": "#7eb5a6",
  "South America": "#6bc268",
  "Oceania": "#c287a5",
  "Antarctica": "#b8c4ce",
};

// ==========================================
// CountrySearch Component
// ==========================================

export function CountrySearch() {
  const countries = useCountries();
  const { selectCountry, selectedCountry } = useCountrySelection();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter countries based on query
  const filteredCountries = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return countries
      .filter((c) => {
        const name = c.properties?.name?.toLowerCase() || "";
        const iso2 = c.properties?.iso_a2?.toLowerCase() || "";
        const iso3 = c.properties?.iso_a3?.toLowerCase() || "";
        return name.includes(q) || iso2.includes(q) || iso3.includes(q);
      })
      .sort((a, b) => {
        // Prioritize exact matches at start
        const aName = a.properties?.name?.toLowerCase() || "";
        const bName = b.properties?.name?.toLowerCase() || "";
        const aStartsWith = aName.startsWith(q);
        const bStartsWith = bName.startsWith(q);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
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
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle country selection
  const handleSelect = useCallback((country: CountryFeature) => {
    selectCountry(country);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }, [selectCountry]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
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
        inputRef.current?.blur();
        break;
    }
  }, [filteredCountries, highlightedIndex, handleSelect]);

  // Clear search
  const handleClear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-80"
    >
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search Icon */}
          <div className="pl-4 text-white/40">
            <SearchIcon className="w-4 h-4" />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query && setIsOpen(true)}
            placeholder="Search countries..."
            className="flex-1 bg-transparent text-white text-sm py-3 px-3 outline-none placeholder:text-white/40"
            aria-label="Search countries"
            aria-expanded={isOpen}
            aria-controls="search-results"
            aria-autocomplete="list"
          />

          {/* Clear Button */}
          {query && (
            <button
              onClick={handleClear}
              className="pr-4 text-white/40 hover:text-white/70 transition-colors"
              aria-label="Clear search"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {isOpen && (
          <div
            id="search-results"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
          >
            {filteredCountries.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {filteredCountries.map((country, index) => {
                  const isHighlighted = index === highlightedIndex;
                  const isSelected = selectedCountry?.properties?.iso_a3 === country.properties?.iso_a3;
                  const continentColor = CONTINENT_COLORS[country.properties?.continent || ""] || "#8a9a8a";

                  return (
                    <li key={country.properties?.iso_a3 || index}>
                      <button
                        role="option"
                        aria-selected={isHighlighted}
                        onClick={() => handleSelect(country)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${isHighlighted ? "bg-white/10" : "hover:bg-white/5"}
                          ${isSelected ? "bg-blue-500/20" : ""}
                        `}
                      >
                        {/* Continent Color Indicator */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: continentColor }}
                        />

                        {/* Country Name */}
                        <span className="flex-1 text-sm text-white truncate">
                          {country.properties?.name}
                        </span>

                        {/* ISO Code */}
                        <span className="text-xs text-white/40 font-mono">
                          {country.properties?.iso_a3}
                        </span>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-white/40 text-center">
                No countries found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Icons
// ==========================================

function SearchIcon({ className }: { className?: string }) {
  return (
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
}

function CloseIcon({ className }: { className?: string }) {
  return (
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
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default CountrySearch;
