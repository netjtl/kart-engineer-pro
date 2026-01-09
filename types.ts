
export enum TrackType {
  SPEEDWAY = 'SPEEDWAY',
  TECHNICAL = 'TECHNICAL',
  STREET = 'STREET',
  DIRT = 'DIRT'
}

export enum WeatherType {
  SUNNY = 'SUNNY',
  RAINY = 'RAINY',
  OVERCAST = 'OVERCAST',
  STORM = 'STORM'
}

export enum AIDifficulty {
  OFF = 'OFF',
  ROOKIE = 'ROOKIE',
  AMATEUR = 'AMATEUR',
  PRO = 'PRO',
  LEGEND = 'LEGEND'
}

export interface TelemetrySettings {
  tirePressure: number; // 10 - 30 PSI
  gearRatio: number; // 2.5 - 6.5
  aeroDownforce: number; // 0 - 100%
  engineMapping: number; // 1 (Eco) - 5 (Aggressive)
  brakeBias: number; // 40% (Rear) - 60% (Front)
}

export interface RaceResult {
  lapTimes: number[];
  aiLapTimes?: number[]; 
  topSpeed: number;
  aiTopSpeed?: number;
  avgCorneringG: number;
  tireWear: number;
  engineHeat: number;
  aiEngineHeat?: number;
  brakeTemp: number; 
  aiBrakeTemp?: number;
  summary: string;
  advice: string;
}

export interface RaceEntry {
  timestamp: number;
  telemetry: TelemetrySettings;
  result: RaceResult;
  weather: WeatherType;
  aiDifficulty: AIDifficulty;
  notes?: string;
}

export interface TrackHistory {
  [trackId: string]: RaceEntry[];
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  description: string;
  image: string;
}
