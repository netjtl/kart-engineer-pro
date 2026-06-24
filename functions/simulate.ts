import { GoogleGenAI, Type } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

const buildPrompt = (track: any, weather: string, aiDifficulty: string, telemetry: any, historyContext: string) => `
Action: Simulate a 5-lap karting stint with realistic physics.
TRACK: ${track.name}
WEATHER: ${weather}
AI OPPONENT: ${aiDifficulty}
KART SETUP: ${JSON.stringify(telemetry)}
${historyContext}
Respond with a JSON object containing:
  lapTimes (array of 5 numbers, seconds),
  aiLapTimes (array of 5 numbers, seconds — only if AI opponent is not OFF),
  topSpeed (number, km/h),
  aiTopSpeed (number, km/h),
  avgCorneringG (number),
  tireWear (number, 0-100%),
  engineHeat (number, celsius),
  aiEngineHeat (number, celsius),
  brakeTemp (number, celsius),
  aiBrakeTemp (number, celsius),
  summary (string, engineering analysis),
  advice (string, setup recommendation).
`;

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const {
      telemetry, track, weather, history, aiDifficulty,
      manualKey, provider = "gemini", ping
    } = JSON.parse(event.body);

    const apiKey = manualKey || process.env.API_KEY;

    if (!apiKey) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "No API key configured on server or provided by client." })
      };
    }

    if (ping) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const recentHistory = history?.slice(-3) || [];
    const historyContext = recentHistory.length > 0
      ? `HISTORICAL CONTEXT: ${recentHistory.map((e: any, i: number) =>
          `[Run ${i + 1}] Best Lap: ${Math.min(...e.result.lapTimes).toFixed(3)}s.`
        ).join("\n")}`
      : "Initial track baseline session.";

    const prompt = buildPrompt(track, weather, aiDifficulty, telemetry, historyContext);
    let resultJson: string;

    if (provider === "claude") {
      const anthropic = new Anthropic({ apiKey });
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are a professional karting physics simulator. Respond with valid JSON only — no markdown, no explanation.",
        messages: [{ role: "user", content: prompt }]
      });
      const text = message.content[0].type === "text" ? message.content[0].text : "{}";
      resultJson = text.replace(/```json|```/g, "").trim();
    } else {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lapTimes:    { type: Type.ARRAY, items: { type: Type.NUMBER } },
              aiLapTimes:  { type: Type.ARRAY, items: { type: Type.NUMBER } },
              topSpeed:    { type: Type.NUMBER },
              aiTopSpeed:  { type: Type.NUMBER },
              avgCorneringG: { type: Type.NUMBER },
              tireWear:    { type: Type.NUMBER },
              engineHeat:  { type: Type.NUMBER },
              aiEngineHeat: { type: Type.NUMBER },
              brakeTemp:   { type: Type.NUMBER },
              aiBrakeTemp: { type: Type.NUMBER },
              summary:     { type: Type.STRING },
              advice:      { type: Type.STRING }
            },
            required: ["lapTimes", "topSpeed", "avgCorneringG", "tireWear", "engineHeat", "brakeTemp", "summary", "advice"]
          }
        }
      });
      resultJson = (response.text || "{}").replace(/```json|```/g, "").trim();
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: resultJson
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Simulation failed" })
    };
  }
};
