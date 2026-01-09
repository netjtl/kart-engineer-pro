
import { TelemetrySettings, Track, WeatherType, RaceResult, RaceEntry, AIDifficulty } from "../types";

/**
 * Professional Kart Racing Physics Simulation Service
 * Architecture: Proxy to Netlify Functions for Zero-Visibility Security
 */
export async function simulateRace(
  telemetry: TelemetrySettings,
  track: Track,
  weather: WeatherType,
  isSandbox: boolean,
  history: RaceEntry[] = [],
  aiDifficulty: AIDifficulty = AIDifficulty.OFF,
  manualKey?: string
): Promise<RaceResult> {
  // Sandbox Mode: Local Physics Approximation (No API required)
  if (isSandbox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const baseTime = 55.0;
        const weatherMod = weather === WeatherType.SUNNY ? 0 : weather === WeatherType.RAINY ? 4.5 : 2.0;
        const tireMod = Math.abs(telemetry.tirePressure - 18) * 0.2;
        const gearMod = (telemetry.gearRatio - 4.5) * 0.5;
        
        const lapTimes = Array.from({ length: 5 }, (_, i) => {
          const jitter = Math.random() * 0.4;
          return baseTime + weatherMod + tireMod + gearMod + jitter + (i * 0.15);
        });

        resolve({
          lapTimes,
          topSpeed: 160 + (telemetry.engineMapping * 5) - (telemetry.aeroDownforce * 0.2),
          avgCorneringG: 2.1 + (telemetry.aeroDownforce * 0.01) - (weatherMod * 0.1),
          tireWear: 8 + (telemetry.engineMapping * 2),
          engineHeat: 85 + (telemetry.engineMapping * 10),
          brakeTemp: 200 + (telemetry.brakeBias * 2),
          summary: "SANDBOX PHYSICS: Local model active. Environment variable or manual key required for Pro Link.",
          advice: "Switch to Pro Physics Link for AI-driven track strategy and rival analysis."
        });
      }, 1500);
    });
  }

  // PRO MODE: Call Netlify Function
  try {
    const response = await fetch('/.netlify/functions/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telemetry,
        track,
        weather,
        history,
        aiDifficulty,
        manualKey // Passed to server if user entered it in UI
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      throw new Error(errData.error || "Simulation failed");
    }

    return await response.json();
  } catch (err: any) {
    throw err;
  }
}

/**
 * Lightweight verification ping
 */
export async function verifyLink(manualKey?: string): Promise<boolean> {
  try {
    // Send a minimal request to test the key
    const response = await fetch('/.netlify/functions/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualKey, ping: true }) 
    });
    return response.ok;
  } catch {
    return false;
  }
}
