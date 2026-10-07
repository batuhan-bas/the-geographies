# The Geographies — Design System (MASTER)

Single source of truth for the UI layer (control panel, search, country card, legends).
Every color, size, radius, shadow and motion value used in `src/components/ui/**` comes from
this file. Tokens are implemented in `src/app/globals.css` (`:root` + Tailwind 4 `@theme`).

## Theses (validated)

**Visual** — Apple Maps dark mode: dark frosted-glass surfaces (62% opaque, blur 28px,
saturate 180%) floating over the globe, a 0.5px light edge and a faint top highlight.
SF Pro on Apple devices, Geist elsewhere; large bold titles, secondary text at 62% white,
coordinates in mono. One accent (systemBlue `#0A84FF`); a country's identity color comes
from its continent color on the map. 4pt grid; panels 20px padding / 22px radius, controls
12px radius, segmented and pill controls. Depth from shadow and blur only — no textures or
decorative gradients.

**Interaction** — Apple spring: panels and cards enter with a 420ms physical spring
(damping 0.82, ≤2% overshoot, measured 1.1%) and exit in 200ms ease-in. Pressed controls
scale to 0.97 in 100ms; on desktop, hover only brightens the fill in 120ms. The segmented
thumb and switches slide on the spring; search results appear with a 20ms stagger. No
scroll-linked animation.

**Forbidden** — overshoot above 3%, scale-up on hover, neon glow, decorative gradients or
textures, transitions longer than 500ms, emoji as icons.

## Color

| Token | Value | Use |
|---|---|---|
| `--glass` | `rgba(30, 32, 40, 0.62)` | Panel surface (with `--blur`) |
| `--glass-strong` | `rgba(36, 38, 48, 0.78)` | Popovers over busy areas, small floating chips |
| `--glass-edge` | `rgba(255, 255, 255, 0.12)` | 0.5px panel border |
| `--glass-hi` | `rgba(255, 255, 255, 0.08)` | Inset top highlight |
| `--fill-1` | `rgba(255, 255, 255, 0.06)` | Grouped rows, segmented track, stat tiles |
| `--fill-2` | `rgba(255, 255, 255, 0.10)` | Hover, selected row |
| `--fill-3` | `rgba(255, 255, 255, 0.16)` | Segmented thumb, switch off, pressed |
| `--sep` | `rgba(255, 255, 255, 0.08)` | Hairline separators |
| `--label` | `rgba(255, 255, 255, 0.96)` | Primary text |
| `--label-2` | `rgba(235, 235, 245, 0.62)` | Secondary text |
| `--label-3` | `rgba(235, 235, 245, 0.36)` | Tertiary text, section headers, hints |
| `--accent` | `#0A84FF` | Primary action, selection, focus ring |
| `--accent-soft` | `rgba(10, 132, 255, 0.18)` | Focus halo on fields |
| `--on` | `#30D158` | Switch on |
| `--danger` | `#FF453A` | Compass north, destructive |

Continent identity (shared with the 3D map, `src/lib/geo/countryColors.ts`):
Europe `#5D9B6B`, Asia `#D4A574`, Africa `#E8A83C`, North America `#7EB5A6`,
South America `#6BC268`, Oceania `#C287A5`, Antarctica `#B8C4CE`, fallback `#8A9A8A`.

Layer icon tiles: Political `#5E5CE6`, Physical `#30A46C`, Topography `#BF8B2E`,
Data `#0A84FF`, Heatmap `#FF6B3D`, Day/Night `#3A3A8C`.

Contrast: `--label` and `--label-2` on `--glass` over the darkest globe areas ≥ 7:1 and
≥ 4.5:1; `--label-3` is never used for text a user must read to act.

## Typography

Stacks — UI: `-apple-system, BlinkMacSystemFont, "SF Pro Text", Geist, system-ui, sans-serif`;
Display: same with `"SF Pro Display"`; Mono: `ui-monospace, "SF Mono", "Geist Mono", Menlo, monospace`.

| Role | Size / weight | Notes |
|---|---|---|
| Title | 30 / 700, tracking -0.02em | Country name |
| Stat | 24 / 600, tabular nums | Population, GDP |
| Headline | 17 / 600 | Card section titles |
| Body | 15 / 400–600 | Rows, results, buttons |
| Field | 16 / 400 | Search input (prevents iOS zoom) |
| Secondary | 14 / 400 | Subtitles |
| Caption | 12–13 / 500–600 | Section headers, chips, action labels |
| Mono | 11–12.5 / 400 | Coordinates, ISO codes, ⌘K |

## Spacing, radius, elevation

Spacing (4pt): 4, 8, 12, 16, 20, 24, 32, 48. Panel padding 12–20, row padding 9–11 × 12.

Radius: panel `22px`, control `12px`, row inside group `10px`, segmented thumb `8px`,
pill `999px`, icon tile `8px`.

Elevation: panel shadow `0 12px 32px rgba(0,0,0,.38), 0 1px 0 rgba(0,0,0,.2)` +
inset `0 1px 0 var(--glass-hi)`. Segmented thumb `0 2px 6px rgba(0,0,0,.35)`.
No other shadows.

Z-index scale: map 0, legends 10, controls/search/card 20, popovers 30, toasts 40.

## Motion

| Token | Value |
|---|---|
| `--ease-spring` | `linear(0, 0.017, 0.062, 0.125, 0.2, 0.28, 0.362, 0.443, 0.519, 0.59, 0.655, 0.714, 0.766, 0.811, 0.85, 0.883, 0.911, 0.934, 0.953, 0.968, 0.98, 0.99, 0.997, 1.002, 1.006, 1.009, 1.01, 1.011, 1.011, 1.011, 1.01, 1.01, 1)` — spring response 0.42s, damping 0.82 |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--dur-spring` | `420ms` |
| `--dur-exit` | `200ms` |
| `--dur-press` | `100ms` (scale 0.97) |
| `--dur-hover` | `120ms` (fill only) |
| `--stagger` | `20ms` |

GSAP equivalents (panel, results): `ease: "spring"` is not built in — use the CSS token on
CSS transitions, and for GSAP tweens `CustomEase` is not required: animate with
`duration: 0.42, ease: "power3.out"` only where CSS cannot be used, and keep overshoot ≤ 3%.

`prefers-reduced-motion: reduce` → all durations 0, no translate; opacity changes only.

## Components

**Glass panel** — `--glass` + `backdrop-filter: blur(28px) saturate(180%)`, 0.5px
`--glass-edge`, panel shadow, radius 22.

**Search field** — 44px tall, radius 12, magnifier 17px `--label-2`, input 16px, `⌘K`
hint chip (mono 11, `--fill-1`, 0.5px `--sep`). Focus: `0 0 0 3px var(--accent-soft)`.
Results: glass panel, rows 32px continent dot + name (match highlighted in `--accent`) +
secondary line (subregion · ISO) + mono coordinates; selected/hover `--fill-2`.

**Segmented control** — track `--fill-1` radius 10, thumb `--fill-3` radius 8 sliding on
`--ease-spring`; labels 13/600, `--label-2` → `--label` when selected.

**Projection row** — shown only while the view is Flat. It reveals under the segmented
control by animating `grid-template-rows: 0fr → 1fr` on `--ease-spring` (opacity in with
the spring, out in `--dur-exit`), and is `visibility: hidden` when collapsed so its chips
leave the tab order.

**Chip** — pill, 12.5/500, `--fill-1`; hover `--fill-2`; selected `--accent` + white.

**Grouped list row** — 28px icon tile + 14/500 label + trailing switch; separators inset
past the icon; hover `--fill-1`.

**Switch** — 40×24, off `--fill-3`, on `--on`, 20px white knob on `--ease-spring`.

**Place card** — right side, 360px, full height minus 20px inset. Hero 150px:
continent-tinted radial wash + country silhouette from real geometry. Title, subtitle,
ISO chips; 3 action tiles (primary = `--accent`); 2 stat tiles; grouped key/value rows
(Continent, Subregion, Coordinates in DMS, Economy, Income group).

**States** — every interactive element: default, hover (`--fill-2` / brighten),
focus-visible (2px `--accent` outline, 2px offset), active (scale 0.97), disabled
(40% opacity, no pointer events).

## Number formatting

Population: `83.4M`, `1.41B`, `<1M` as `845K`. GDP (`gdp_md` is millions of USD):
`$761B`, `$1.8T`, `$40.9B`, `$950M`. Coordinates: degrees–minutes with hemisphere,
`39°03′ N, 35°10′ E`.
