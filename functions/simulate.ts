
import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { telemetry, track, weather, history, aiDifficulty, manualKey } = JSON.parse(event.body);
    
    // Prioritize manual key from client (if provided), fallback to server environment variable
    const apiKey = manualKey || process.env.API_KEY;
    
    if (!apiKey) {
      return { 
        statusCode: 401, 
        body: JSON.stringify({ error: "No API key configured on server or provided by client." }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const recentHistory = history?.slice(-3) || [];
    
    const historyContext = recentHistory.length > 0 
      ? `HISTORICAL CONTEXT: ${recentHistory.map((entry: any, idx: number) => `[Run ${idx + 1}] Best Lap: ${Math.min(...entry.result.lapTimes).toFixed(3)}s.`).join('\n')}`
      : "Initial track baseline session.";

    const prompt = `
      Action: Simulate a 5-lap stint based on precise physics.
      TRACK: ${track.name}
      WEATHER: ${weather}
      AI OPPONENT: ${aiDifficulty}
      KART SETUP: ${JSON.stringify(telemetry)}
      ${historyContext}
      Required Output: JSON with lapTimes(5), aiLapTimes(5), topSpeed, aiTopSpeed, avgCorneringG, tireWear, engineHeat, aiEngineHeat, brakeTemp, aiBrakeTemp, summary, advice.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lapTimes: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            aiLapTimes: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            topSpeed: { type: Type.NUMBER },
            aiTopSpeed: { type: Type.NUMBER },
            avgCorneringG: { type: Type.NUMBER },
            tireWear: { type: Type.NUMBER },
            engineHeat: { type: Type.NUMBER },
            aiEngineHeat: { type: Type.NUMBER },
            brakeTemp: { type: Type.NUMBER },
            aiBrakeTemp: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["lapTimes", "topSpeed", "avgCorneringG", "tireWear", "engineHeat", "brakeTemp", "summary", "advice"]
        }
      }
    });

    const cleanText = (response.text || "{}").replace(/```json|```/g, "").trim();
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: cleanText
    };
  } catch (err: any) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message || "Simulation failed" }) 
    };
  }
};
