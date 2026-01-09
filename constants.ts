
import { TrackType, Track, WeatherType, AIDifficulty } from './types';

export const TRACKS: Track[] = [
  {
    id: 'monaco-lite',
    name: 'Harbor Sprint',
    type: TrackType.STREET,
    description: 'Tight corners, low visibility, and zero room for error. Requires high downforce and short gearing.',
    image: 'https://picsum.photos/seed/harbor/600/400'
  },
  {
    id: 'oval-master',
    name: 'Thunder Ring',
    type: TrackType.SPEEDWAY,
    description: 'A pure speed test. Banked turns allow for high-speed drafting. Aerodynamics and tall gearing are key.',
    image: 'https://picsum.photos/seed/ring/600/400'
  },
  {
    id: 'forest-twists',
    name: 'Willow Creek',
    type: TrackType.TECHNICAL,
    description: 'Challenging elevation changes and complex chicane sequences. Balance and brake bias are critical.',
    image: 'https://picsum.photos/seed/forest/600/400'
  },
  {
    id: 'desert-dust',
    name: 'Red Rock Canyon',
    type: TrackType.DIRT,
    description: 'Low grip surfaces with high heat. Tire pressure management is everything here.',
    image: 'https://picsum.photos/seed/desert/600/400'
  }
];

export const WEATHER_OPTIONS = [
  { id: WeatherType.SUNNY, name: 'Sunny', temp: '32°C', grip: 1.0 },
  { id: WeatherType.RAINY, name: 'Rainy', temp: '18°C', grip: 0.6 },
  { id: WeatherType.OVERCAST, name: 'Overcast', temp: '22°C', grip: 0.9 },
  { id: WeatherType.STORM, name: 'Storm', temp: '15°C', grip: 0.4 }
];

export const AI_CONFIGS = {
  [AIDifficulty.OFF]: { label: 'Solo Practice', modifier: 1.0, jitter: 0 },
  [AIDifficulty.ROOKIE]: { label: 'Rookie', modifier: 1.15, jitter: 0.8 },
  [AIDifficulty.AMATEUR]: { label: 'Amateur', modifier: 1.05, jitter: 0.4 },
  [AIDifficulty.PRO]: { label: 'Pro', modifier: 1.0, jitter: 0.15 },
  [AIDifficulty.LEGEND]: { label: 'Legend', modifier: 0.96, jitter: 0.05 },
};
