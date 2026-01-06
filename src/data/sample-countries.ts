import type { CountryFeature } from "@/types/geo";

/**
 * Sample country GeoJSON data for development
 * In production, this would be fetched from Natural Earth Data or similar
 */
export const sampleCountries: CountryFeature[] = [
  // Turkey
  {
    type: "Feature",
    properties: {
      name: "Turkey",
      iso_a2: "TR",
      iso_a3: "TUR",
      continent: "Asia",
      pop_est: 84339067,
      gdp_md: 720101,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [26.0, 42.0],
          [28.0, 41.0],
          [30.0, 41.5],
          [33.0, 42.0],
          [36.0, 41.5],
          [39.0, 41.0],
          [42.0, 41.5],
          [44.0, 40.0],
          [44.5, 39.0],
          [44.0, 38.0],
          [42.0, 37.0],
          [39.0, 36.5],
          [36.0, 36.0],
          [33.0, 36.5],
          [30.0, 36.0],
          [28.0, 36.5],
          [26.0, 38.0],
          [26.0, 40.0],
          [26.0, 42.0],
        ],
      ],
    },
  },
  // Germany
  {
    type: "Feature",
    properties: {
      name: "Germany",
      iso_a2: "DE",
      iso_a3: "DEU",
      continent: "Europe",
      pop_est: 83783942,
      gdp_md: 3845630,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [6.0, 51.0],
          [7.0, 53.5],
          [9.0, 54.8],
          [11.0, 54.5],
          [14.0, 54.0],
          [15.0, 51.0],
          [14.5, 49.0],
          [13.0, 48.5],
          [10.0, 47.5],
          [8.0, 48.0],
          [6.0, 49.0],
          [6.0, 51.0],
        ],
      ],
    },
  },
  // France
  {
    type: "Feature",
    properties: {
      name: "France",
      iso_a2: "FR",
      iso_a3: "FRA",
      continent: "Europe",
      pop_est: 65273511,
      gdp_md: 2630318,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-1.0, 49.0],
          [2.0, 51.0],
          [5.0, 49.5],
          [8.0, 49.0],
          [8.0, 46.0],
          [7.0, 44.0],
          [4.0, 43.5],
          [0.0, 42.5],
          [-2.0, 43.5],
          [-4.5, 48.5],
          [-1.0, 49.0],
        ],
      ],
    },
  },
  // United Kingdom
  {
    type: "Feature",
    properties: {
      name: "United Kingdom",
      iso_a2: "GB",
      iso_a3: "GBR",
      continent: "Europe",
      pop_est: 67886011,
      gdp_md: 2827113,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-6.0, 58.5],
          [-3.0, 58.5],
          [-1.0, 57.0],
          [1.5, 52.5],
          [0.0, 51.0],
          [-3.0, 50.5],
          [-5.5, 50.0],
          [-6.0, 52.0],
          [-4.5, 54.0],
          [-3.0, 55.5],
          [-6.0, 58.5],
        ],
      ],
    },
  },
  // Italy
  {
    type: "Feature",
    properties: {
      name: "Italy",
      iso_a2: "IT",
      iso_a3: "ITA",
      continent: "Europe",
      pop_est: 60461826,
      gdp_md: 2001244,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [7.0, 43.5],
          [8.0, 44.0],
          [11.0, 46.5],
          [13.5, 47.0],
          [13.0, 45.5],
          [12.5, 44.0],
          [14.0, 42.0],
          [16.0, 39.0],
          [18.5, 40.0],
          [17.0, 38.0],
          [15.5, 38.0],
          [12.5, 37.5],
          [10.0, 39.5],
          [8.5, 41.0],
          [7.0, 43.5],
        ],
      ],
    },
  },
  // Spain
  {
    type: "Feature",
    properties: {
      name: "Spain",
      iso_a2: "ES",
      iso_a3: "ESP",
      continent: "Europe",
      pop_est: 46754778,
      gdp_md: 1281199,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-9.0, 43.0],
          [-2.0, 43.5],
          [0.0, 42.5],
          [3.0, 42.5],
          [3.5, 41.5],
          [0.0, 38.0],
          [-1.0, 37.0],
          [-5.5, 36.0],
          [-7.0, 37.0],
          [-9.0, 38.5],
          [-9.0, 43.0],
        ],
      ],
    },
  },
  // Japan
  {
    type: "Feature",
    properties: {
      name: "Japan",
      iso_a2: "JP",
      iso_a3: "JPN",
      continent: "Asia",
      pop_est: 126476461,
      gdp_md: 5057759,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [130.0, 33.0],
          [131.5, 34.0],
          [134.0, 34.5],
          [137.0, 35.0],
          [140.0, 36.0],
          [141.0, 39.0],
          [142.0, 43.0],
          [145.0, 44.0],
          [145.5, 43.0],
          [143.0, 42.0],
          [141.5, 39.5],
          [140.5, 36.5],
          [139.5, 35.0],
          [137.0, 34.0],
          [133.0, 33.5],
          [130.0, 33.0],
        ],
      ],
    },
  },
  // Brazil
  {
    type: "Feature",
    properties: {
      name: "Brazil",
      iso_a2: "BR",
      iso_a3: "BRA",
      continent: "South America",
      pop_est: 212559417,
      gdp_md: 1839758,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-74.0, -5.0],
          [-70.0, 0.0],
          [-60.0, 5.0],
          [-52.0, 4.0],
          [-44.0, -2.0],
          [-35.0, -6.0],
          [-35.0, -10.0],
          [-37.0, -15.0],
          [-40.0, -20.0],
          [-48.0, -25.0],
          [-53.0, -30.0],
          [-55.0, -28.0],
          [-57.0, -25.0],
          [-58.0, -20.0],
          [-60.0, -15.0],
          [-65.0, -10.0],
          [-70.0, -10.0],
          [-74.0, -5.0],
        ],
      ],
    },
  },
  // Australia
  {
    type: "Feature",
    properties: {
      name: "Australia",
      iso_a2: "AU",
      iso_a3: "AUS",
      continent: "Oceania",
      pop_est: 25499884,
      gdp_md: 1392681,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [113.0, -26.0],
          [114.0, -22.0],
          [118.0, -18.0],
          [123.0, -16.0],
          [129.0, -15.0],
          [135.0, -12.0],
          [142.0, -11.0],
          [145.0, -15.0],
          [150.0, -22.0],
          [153.0, -27.0],
          [153.0, -32.0],
          [150.0, -37.0],
          [145.0, -39.0],
          [140.0, -38.0],
          [135.0, -35.0],
          [130.0, -32.0],
          [124.0, -33.0],
          [118.0, -35.0],
          [115.0, -34.0],
          [113.0, -26.0],
        ],
      ],
    },
  },
  // United States (simplified)
  {
    type: "Feature",
    properties: {
      name: "United States",
      iso_a2: "US",
      iso_a3: "USA",
      continent: "North America",
      pop_est: 331002651,
      gdp_md: 21433226,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-125.0, 48.0],
          [-122.0, 49.0],
          [-95.0, 49.0],
          [-82.0, 45.0],
          [-70.0, 45.0],
          [-67.0, 44.0],
          [-75.0, 35.0],
          [-80.0, 32.0],
          [-82.0, 25.0],
          [-85.0, 30.0],
          [-95.0, 28.0],
          [-100.0, 26.0],
          [-105.0, 31.0],
          [-117.0, 32.0],
          [-122.0, 36.0],
          [-124.0, 42.0],
          [-125.0, 48.0],
        ],
      ],
    },
  },
];

export default sampleCountries;
