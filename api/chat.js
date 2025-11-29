import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { history, message, context } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `You are a helpful language tutor assistant. The user is studying the term "${context.currentTerm}" (Native: ${context.sourceLang}, Target: ${context.targetLang}). Answer their questions about this specific term briefly and clearly.`;
    
    const chatPrompt = `
      ${systemInstruction}
      
      Conversation History:
      ${history.map(h => `${h.role}: ${h.text}`).join('\n')}
      
      User: ${message}
      Model:
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: chatPrompt }] },
    });

    return res.status(200).json({ reply: response.text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}