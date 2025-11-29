export enum Language {
  English = 'English',
  Chinese = 'Chinese (Simplified)',
  Spanish = 'Spanish',
  French = 'French',
  German = 'German',
  Japanese = 'Japanese',
  Korean = 'Korean',
  Portuguese = 'Portuguese',
  Russian = 'Russian',
  Arabic = 'Arabic'
}

export interface Example {
  text: string;       // The sentence in target language
  phonetic: string;   // IPA/Pinyin/Kana
  translation: string; // Meaning in native language
}

export interface DictEntry {
  id: string;
  term: string; // The user's original input
  targetTerm: string; // The term in the target language (translation or original)
  phonetic: string; // Pinyin, IPA, or Kana for the main term
  nativeDefinition: string;
  examples: Example[]; // Structured examples
  usageNote: string;
  imageUrl?: string;
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface FlashcardProps {
  entry: DictEntry;
  targetLang: Language;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  openingLine: string;
}

export interface ScenarioReport {
  score: number; // 0-100
  feedback: string;
  corrections: {
    original: string;
    correction: string;
    explanation: string;
  }[];
}

export type ViewState = 'onboarding' | 'search' | 'result' | 'notebook' | 'flashcards' | 'story' | 'scenario-menu' | 'scenario-chat' | 'scenario-report';