import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { term } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      Generate an image representing: "${term}".
      
      Rules:
      1. **Famous People**: If "${term}" is a specific real person (celebrity, artist, historical figure), generate a high-quality **realistic portrait**. 
         - NOTE: If specific celebrity generation is restricted, generate a highly realistic portrait of a person who captures the essence, style, and era of "${term}".
      2. **Objects/Places**: If it is a physical object or place, generate a high-quality photorealistic photo.
      3. **Abstract/Grammar**: If it is an abstract concept or grammar point, generate a colorful, minimalist 3D illustration.
      
      Lighting: Professional studio lighting or natural light.
      Style: High resolution, no text overlays.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });

    // Extract Base64
    let imageData = null;
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageData) throw new Error("No image generated");

    return res.status(200).json({ imageData });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}