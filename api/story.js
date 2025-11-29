import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { words, sourceLang, targetLang } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const wordsStr = words.join(", ");
    const prompt = `
      Create a short, funny story to help memorize these words: ${wordsStr}.
      The reader is a native ${sourceLang} speaker learning ${targetLang}.
      Write the story primarily in ${sourceLang}, but weave in the target words (${wordsStr}) naturally in ${targetLang}.
      Highlight the target words by wrapping them in asterisks (e.g., *word*).
      Keep it under 200 words.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    return res.status(200).json({ story: response.text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}