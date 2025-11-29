import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { action } = req.body;

    // --- Generate Scenarios ---
    if (action === 'generate') {
      const { targetLang, sourceLang } = req.body;
      const prompt = `
        Generate 3 distinct, fun, and practical roleplay scenarios for a student learning ${targetLang}.
        Themes: 1. Work/Office, 2. Daily Life/Travel, 3. Unexpected/Funny Situation.
        Return JSON.
      `;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenarios: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING, description: `Title in ${sourceLang}` },
                    description: { type: Type.STRING, description: `Short context in ${sourceLang}` },
                    openingLine: { type: Type.STRING, description: `The first line spoken by the AI in ${targetLang}` }
                  },
                  required: ["id", "title", "description", "openingLine"]
                }
              }
            }
          }
        }
      });
      return res.status(200).json(JSON.parse(response.text));
    }

    // --- Chat in Scenario ---
    if (action === 'chat') {
      const { history, scenario, targetLang } = req.body;
      const prompt = `
        You are acting in a roleplay scenario: "${scenario.title}" - ${scenario.description}.
        Language: ${targetLang} ONLY.
        Your role: Interact naturally with the user. Keep responses concise (1-3 sentences).
        
        History:
        ${history.map(h => `${h.role}: ${h.text}`).join('\n')}
        
        Respond to the last user message in character.
      `;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }] },
      });
      return res.status(200).json({ reply: response.text });
    }

    // --- Evaluate Scenario ---
    if (action === 'evaluate') {
      const { history, sourceLang, targetLang } = req.body;
      const prompt = `
        Analyze this roleplay conversation in ${targetLang}. User speaks ${sourceLang}.
        Conversation:
        ${history.map(h => `${h.role}: ${h.text}`).join('\n')}

        Provide score (0-100), feedback in ${sourceLang}, and corrections.
      `;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    correction: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      return res.status(200).json(JSON.parse(response.text));
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}