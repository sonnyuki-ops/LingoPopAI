import { Language, DictEntry, Scenario, ScenarioReport, ChatMessage } from "../types";

// Base API URL - relative path works for Vercel/Next.js/Vite proxy
const API_BASE = '/api';

/**
 * Generic fetch wrapper to handle errors
 */
async function post(endpoint: string, data: any) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// --- Dictionary Lookup ---
export const lookupTerm = async (
  term: string,
  sourceLang: Language,
  targetLang: Language
): Promise<Omit<DictEntry, 'id' | 'createdAt' | 'imageUrl' | 'term'>> => {
  return post('/lookup', { term, sourceLang, targetLang });
};

// --- Story Generation ---
export const generateStory = async (
  entries: DictEntry[],
  sourceLang: Language,
  targetLang: Language
): Promise<string> => {
  if (entries.length === 0) return "Your notebook is empty!";
  const result = await post('/story', { 
    words: entries.map(e => e.targetTerm || e.term), 
    sourceLang, 
    targetLang 
  });
  return result.story;
};

// --- General Chat ---
export const chatWithAI = async (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string,
  currentTerm: string,
  sourceLang: Language,
  targetLang: Language
): Promise<string> => {
  const result = await post('/chat', { 
    history, 
    message: newMessage, 
    context: { currentTerm, sourceLang, targetLang } 
  });
  return result.reply;
};

// --- Scenario (Roleplay) ---
export const generateScenarios = async (targetLang: Language, sourceLang: Language): Promise<Scenario[]> => {
  const result = await post('/scenario', { 
    action: 'generate', 
    targetLang, 
    sourceLang 
  });
  return result.scenarios || [];
};

export const chatInScenario = async (
  history: ChatMessage[],
  scenario: Scenario,
  targetLang: Language
): Promise<string> => {
  const result = await post('/scenario', { 
    action: 'chat', 
    history, 
    scenario, 
    targetLang 
  });
  return result.reply;
};

export const evaluateScenario = async (
  history: ChatMessage[],
  sourceLang: Language,
  targetLang: Language
): Promise<ScenarioReport> => {
  return post('/scenario', { 
    action: 'evaluate', 
    history, 
    sourceLang, 
    targetLang 
  });
};

// --- Image Generation ---
export const generateConceptImage = async (term: string): Promise<string | undefined> => {
  try {
    const result = await post('/image', { term });
    return result.imageData; // Base64 string
  } catch (e) {
    return undefined; // Fail gracefully for images
  }
};

// --- TTS ---
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
    const result = await post('/tts', { text, voiceName });
    if (!result.audioData) throw new Error("No audio data");

    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') await ctx.resume();

    const audioBuffer = await decodeAudioData(result.audioData, ctx);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();

  } catch (e) {
    console.error("TTS Error:", e);
  }
};