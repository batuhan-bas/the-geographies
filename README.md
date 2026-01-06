# The Geographies

Interactive 3D world map with morphable Globe/Flat projections built with Next.js, React Three Fiber, and Three.js.

![Globe View](https://img.shields.io/badge/View-Globe-blue) ![Flat View](https://img.shields.io/badge/View-Flat-green)

## Features

- **Morphable Projections**: Smooth transition between 3D globe and 2D flat map views
- **Interactive Countries**: Click on countries to view detailed information
- **Continent-based Coloring**: Warm color palette organized by continent
- **Country Labels**: Dynamic labels that appear based on zoom level
- **Responsive Controls**: Pan, zoom, and rotate with mouse/touch
- **Day/Night Effect**: Animated sun lighting on globe mode (coming soon)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **3D Rendering**: React Three Fiber + Three.js
- **Animations**: GSAP for smooth transitions
- **State Management**: Zustand
- **Styling**: Tailwind CSS
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
│   └── ui/                # UI components (CountryPanel, Controls)
├── lib/
│   └── geo/               # Geographic utilities (projections, morphing)
├── store/                 # Zustand state management
└── types/                 # TypeScript type definitions

public/
├── data/                  # GeoJSON country data
└── textures/              # Earth textures
```

## Controls

- **Globe Mode**: Drag to rotate, scroll to zoom
- **Flat Mode**: Drag to pan, scroll to zoom
- **Click**: Select a country to view details
- **Toggle**: Switch between Globe/Flat views

## Data Sources

- Country boundaries: [Natural Earth](https://www.naturalearthdata.com/)
- Earth textures: NASA Visible Earth

## License

MIT

## Roadmap

- [ ] Physical layer with terrain textures
- [ ] Day/night cycle animation
- [ ] Country search functionality
- [ ] Data visualization overlays
- [ ] Performance optimizations
