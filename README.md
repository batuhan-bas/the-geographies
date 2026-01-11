# The Geographies

Interactive 3D world map with morphable Globe/Flat projections built with Next.js, React Three Fiber, and Three.js.

![Globe View](https://img.shields.io/badge/View-Globe-blue) ![Flat View](https://img.shields.io/badge/View-Flat-green)

## Screenshots

<p align="center">
  <img src="public/screenshots/political-globe.png" alt="Political Globe View" width="100%">
</p>

<p align="center">
  <img src="public/screenshots/political-flat.png" alt="Political Flat View" width="49%">
  <img src="public/screenshots/physical-globe.png" alt="Physical Globe View" width="49%">
</p>

## Features

- **Morphable Projections**: Smooth GPU-accelerated transition between 3D globe and 2D flat map views
- **Interactive Countries**: Click on countries to view detailed information in a slide-out panel
- **Country Search**: Quick search by country name or ISO code with keyboard navigation
- **Multiple Layers**: Toggle between Political and Physical map layers
- **Day/Night Cycle**: Realistic day/night lighting with city lights, twilight glow, and atmosphere effects
- **Continent-based Coloring**: Warm color palette organized by continent
- **Modern Minimal UI**: Clean, Apple/Linear-inspired control panel
- **Responsive Controls**: Pan, zoom, and rotate with mouse/touch

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **3D Rendering**: React Three Fiber + Three.js
- **Animations**: GSAP for smooth transitions
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/the-geographies.git
cd the-geographies

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── canvas/            # 3D components (Globe, CountryMesh, etc.)
│   └── ui/                # UI components (ControlPanel, CountryPanel, CountrySearch)
├── lib/
│   └── geo/               # Geographic utilities (projections, morphing)
├── store/                 # Zustand state management
└── types/                 # TypeScript type definitions

public/
├── data/                  # TopoJSON country data
└── textures/              # Earth textures
```

## Controls

- **Globe Mode**: Drag to rotate, scroll to zoom
- **Flat Mode**: Drag to pan, scroll to zoom
- **Click**: Select a country to view details
- **Search**: Type to find countries (top center), use arrow keys to navigate
- **Control Panel**: Switch views, toggle layers, and effects (bottom-left)

## Data Sources

- Country boundaries: [Natural Earth](https://www.naturalearthdata.com/)
- Earth textures: NASA Visible Earth

## License

MIT

## Roadmap

- [x] Day/night cycle animation
- [x] Country search functionality
- [ ] Data visualization overlays
- [ ] More map layers (topography, administrative)
- [ ] Mobile touch optimizations
