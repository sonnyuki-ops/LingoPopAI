import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { term, sourceLang, targetLang } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      You are an advanced AI language tutor. 
      The user is a native ${sourceLang} speaker learning ${targetLang}.
      The input is: "${term}".

      Analyze the input:
      1. **Translation/Correction**: 
         - If input is ${sourceLang}, translate to ${targetLang}.
         - If input is ${targetLang}, correct typos.
      2. **Type Detection**: 
         - Is it a word, a phrase, or a **Grammar Point** (e.g., JLPT N4-N1 grammar structures)?
      3. **Phonetics**: Provide Pinyin for Chinese, Furigana/Romaji for Japanese, or IPA for others.
      4. **Definition**: Explain the meaning naturally in ${sourceLang}. If it's a grammar point, explain the connection rules and nuance.
      5. **Examples**: Provide two distinct examples in ${targetLang}. For each, include the ${sourceLang} translation and the phonetic reading of the sentence.
      6. **Usage Note**: A friendly, casual note in ${sourceLang} about culture, nuance, or common mistakes.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetTerm: { type: Type.STRING },
            phonetic: { type: Type.STRING, description: "IPA, Pinyin, or Kana reading for the term" },
            nativeDefinition: { type: Type.STRING },
            examples: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: `Example in ${targetLang}` },
                  phonetic: { type: Type.STRING, description: "Phonetic reading of the example sentence" },
                  translation: { type: Type.STRING, description: `Translation in ${sourceLang}` }
                },
                required: ["text", "phonetic", "translation"]
              } 
            },
            usageNote: { type: Type.STRING },
          },
          required: ["targetTerm", "phonetic", "nativeDefinition", "examples", "usageNote"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}