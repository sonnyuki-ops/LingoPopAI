import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Language, DictEntry, Scenario, ScenarioReport, ChatMessage } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Text Generation ---

export const lookupTerm = async (
  term: string,
  sourceLang: Language,
  targetLang: Language
): Promise<Omit<DictEntry, 'id' | 'createdAt' | 'imageUrl' | 'term'>> => {
  if (!apiKey) throw new Error("API Key missing");

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

    Return JSON matching the schema.
  `;

  try {
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

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("lookupTerm error:", error);
    // Rethrow to let App.tsx handle the UI error message
    throw error;
  }
};

export const generateStory = async (
  entries: DictEntry[],
  sourceLang: Language,
  targetLang: Language
): Promise<string> => {
  if (entries.length === 0) return "Your notebook is empty! Add some words first.";

  const words = entries.map(e => e.targetTerm || e.term).join(", ");
  const prompt = `
    Create a short, funny story to help memorize these words: ${words}.
    The reader is a native ${sourceLang} speaker learning ${targetLang}.
    Write the story primarily in ${sourceLang}, but weave in the target words (${words}) naturally in ${targetLang}.
    Highlight the target words by wrapping them in asterisks (e.g., *word*).
    Keep it under 200 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    return response.text || "Could not generate story.";
  } catch (error) {
    console.error("generateStory error:", error);
    return "Sorry, I couldn't write a story right now.";
  }
};

export const chatWithAI = async (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string,
  currentTerm: string,
  sourceLang: Language,
  targetLang: Language
): Promise<string> => {
  const systemInstruction = `You are a helpful language tutor assistant. The user is studying the term "${currentTerm}" (Native: ${sourceLang}, Target: ${targetLang}). Answer their questions about this specific term briefly and clearly.`;
  
  const chatPrompt = `
    ${systemInstruction}
    
    Conversation History:
    ${history.map(h => `${h.role}: ${h.text}`).join('\n')}
    
    User: ${newMessage}
    Model:
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: chatPrompt }] },
    });

    return response.text || "";
  } catch (error) {
    console.error("chatWithAI error:", error);
    return "I'm having trouble thinking right now.";
  }
};

// --- Scenario / Roleplay ---

export const generateScenarios = async (targetLang: Language, sourceLang: Language): Promise<Scenario[]> => {
  const prompt = `
    Generate 3 distinct, fun, and practical roleplay scenarios for a student learning ${targetLang}.
    Themes: 1. Work/Office, 2. Daily Life/Travel, 3. Unexpected/Funny Situation.
    
    Return JSON with a "scenarios" array.
  `;
  
  try {
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
          },
          required: ["scenarios"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json.scenarios || [];
  } catch (error) {
    console.error("generateScenarios error:", error);
    return [];
  }
};

export const chatInScenario = async (
  history: ChatMessage[],
  scenario: Scenario,
  targetLang: Language
): Promise<string> => {
  const prompt = `
    You are acting in a roleplay scenario: "${scenario.title}" - ${scenario.description}.
    Language: ${targetLang} ONLY.
    Your role: Interact naturally with the user. Keep responses concise (1-3 sentences).
    
    History:
    ${history.map(h => `${h.role}: ${h.text}`).join('\n')}
    
    Respond to the last user message in character.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    return response.text || "...";
  } catch (error) {
    console.error("chatInScenario error:", error);
    return "...";
  }
};

export const evaluateScenario = async (
  history: ChatMessage[],
  sourceLang: Language,
  targetLang: Language
): Promise<ScenarioReport> => {
  const prompt = `
    Analyze this roleplay conversation in ${targetLang}.
    The user (native ${sourceLang}) was practicing.
    
    Conversation:
    ${history.map(h => `${h.role}: ${h.text}`).join('\n')}

    Provide:
    1. Score (0-100) based on fluency and appropriateness.
    2. Feedback (in ${sourceLang}): encouraging summary.
    3. Corrections: Find up to 3 mistakes or better ways to say things.
  `;

  try {
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
          },
          required: ["score", "feedback", "corrections"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("evaluateScenario error:", error);
    return {
      score: 0,
      feedback: "Could not evaluate session.",
      corrections: []
    };
  }
};

// --- Image Generation ---

export const generateConceptImage = async (term: string): Promise<string | undefined> => {
  try {
    const prompt = `
      Generate an image representing: "${term}".
      
      Rules:
      1. **Famous People**: If "${term}" is a specific real person (celebrity, artist, historical figure), generate a high-quality **realistic portrait**. 
         - NOTE: If specific celebrity generation is restricted by safety guidelines, generate a highly realistic portrait of a person who captures the essence, style, and era of "${term}" without violating policy.
      2. **Objects/Places**: If it is a physical object or place, generate a high-quality photorealistic photo.
      3. **Abstract/Grammar**: If it is an abstract concept or grammar point, generate a colorful, minimalist 3D illustration.
      
      Lighting: Professional studio lighting or natural light.
      Style: High resolution, no text overlays.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {}
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (e) {
    console.error("Image generation failed", e);
    // Return undefined to fail gracefully without crashing the main flow
    return undefined;
  }
};

// --- TTS (Audio) ---

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioContext = new AudioContextClass({ sampleRate: 24000 });
    }
  }
  return audioContext;
};

const decodeAudioData = async (base64String: string, ctx: AudioContext): Promise<AudioBuffer> => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

export const playTTS = async (text: string, voiceName: 'Kore' | 'Puck' | 'Charon' = 'Kore') => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data");

    const ctx = getAudioContext();
    if (!ctx) {
        console.error("AudioContext not supported");
        return;
    }
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audioBuffer = await decodeAudioData(base64Audio, ctx);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();

  } catch (e) {
    console.error("TTS Error:", e);
    // No alert to avoid disrupting UI flow too much
  }
};