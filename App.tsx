import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Language, DictEntry, ChatMessage, ViewState, Scenario, ScenarioReport } from './types';
import { 
  lookupTerm, 
  generateConceptImage, 
  chatWithAI, 
  generateStory, 
  playTTS,
  generateScenarios,
  chatInScenario,
  evaluateScenario
} from './services/geminiService';
import { AudioButton } from './components/AudioButton';

// --- Localization System ---

const translations: Record<string, Record<string, string>> = {
  [Language.English]: {
    welcome: "LingoPop",
    subtitle: "Your Fun AI Dictionary Companion",
    iSpeak: "I SPEAK",
    iLearn: "I WANT TO LEARN",
    start: "Let's Go! 🚀",
    searchPlaceholder: "Type a word, phrase, or grammar point...",
    examples: "Examples",
    vibeCheck: "The Vibe Check ✨",
    askAI: "Ask AI about this...",
    notebookEmpty: "Your notebook is empty. Go search and save some cool words!",
    storyMode: "Story Mode 📖",
    createStory: "Create Story",
    writing: "Writing Magic...",
    myCollection: "My Collection",
    studyTime: "Study Time",
    tapReveal: "Tap to reveal",
    roleplay: "Roleplay",
    search: "Search",
    notebook: "Notebook",
    learn: "Learn",
    chooseScenario: "Choose a Scenario",
    endSession: "End & Evaluate",
    reportCard: "Report Card",
    fluencyScore: "Fluency Score",
    corrections: "Corrections",
    backMenu: "Back to Menu",
    aiTyping: "AI is typing..."
  },
  [Language.Chinese]: {
    welcome: "LingoPop 灵语",
    subtitle: "你的 AI 趣味词典助手",
    iSpeak: "我的母语",
    iLearn: "我想学",
    start: "开始探索! 🚀",
    searchPlaceholder: "输入单词、短语或语法句式...",
    examples: "例句",
    vibeCheck: "语境 & 贴士 ✨",
    askAI: "向 AI 提问...",
    notebookEmpty: "笔记本是空的。快去查词并收藏吧！",
    storyMode: "故事模式 📖",
    createStory: "生成故事",
    writing: "正在创作...",
    myCollection: "我的收藏",
    studyTime: "学习时间",
    tapReveal: "点击翻转",
    roleplay: "情景对话",
    search: "查词",
    notebook: "生词本",
    learn: "闪卡",
    chooseScenario: "选择一个场景",
    endSession: "结束并评分",
    reportCard: "对话评估",
    fluencyScore: "流利度评分",
    corrections: "纠错与建议",
    backMenu: "返回菜单",
    aiTyping: "AI 正在输入..."
  },
  // Fallback for others (simplified to English for brevity, but in production would map all)
};

const useText = (lang: Language, key: string): string => {
  const t = translations[lang] || translations[Language.English];
  return t[key] || translations[Language.English][key] || key;
};

// --- Sub-components ---

// 1. Welcome Screen
const WelcomeScreen: React.FC<{
  onStart: (native: Language, target: Language) => void;
}> = ({ onStart }) => {
  const [native, setNative] = useState<Language>(Language.English);
  const [target, setTarget] = useState<Language>(Language.Spanish);

  return (
    <div className="min-h-screen bg-pop-yellow flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-extrabold text-pop-purple mb-2 tracking-tight">LingoPop</h1>
      <p className="text-lg text-gray-800 mb-8 font-medium">{useText(native, 'subtitle')}</p>
      
      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
        <div>
          <label className="block text-left text-sm font-bold text-gray-500 mb-1 uppercase">{useText(native, 'iSpeak')}</label>
          <select 
            value={native} 
            onChange={(e) => setNative(e.target.value as Language)}
            className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-pop-purple outline-none font-semibold text-gray-800"
          >
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-left text-sm font-bold text-gray-500 mb-1 uppercase">{useText(native, 'iLearn')}</label>
          <select 
            value={target} 
            onChange={(e) => setTarget(e.target.value as Language)}
            className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-pop-pink outline-none font-semibold text-gray-800"
          >
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <button 
          onClick={() => onStart(native, target)}
          className="w-full bg-pop-purple text-white font-bold py-4 rounded-xl hover:bg-purple-800 transition-transform transform active:scale-95 shadow-lg"
        >
          {useText(native, 'start')}
        </button>
      </div>
    </div>
  );
};

// 2. Search Header
const SearchHeader: React.FC<{
  onSearch: (term: string) => void;
  isSearching: boolean;
  nativeLang: Language;
  targetLang: Language;
}> = ({ onSearch, isSearching, nativeLang, targetLang }) => {
  const [input, setInput] = useState('');
  const t = (k: string) => useText(nativeLang, k);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onSearch(input);
  };

  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        <span>{nativeLang}</span>
        <span className="text-pop-purple">➔</span>
        <span>{targetLang}</span>
      </div>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-gray-100 text-gray-900 rounded-2xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-pop-purple transition-all font-medium"
          disabled={isSearching}
        />
        <button 
          type="submit" 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-pop-purple text-white p-2 rounded-xl disabled:opacity-50"
          disabled={isSearching}
        >
          {isSearching ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          )}
        </button>
      </form>
    </div>
  );
};

// 3. Result View
const ResultView: React.FC<{
  entry: DictEntry;
  isSaved: boolean;
  onSave: () => void;
  nativeLang: Language;
  targetLang: Language;
}> = ({ entry, isSaved, onSave, nativeLang, targetLang }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const t = (k: string) => useText(nativeLang, k);

  const displayTerm = entry.targetTerm || entry.term;
  const isTranslation = entry.term.toLowerCase() !== displayTerm.toLowerCase();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      const aiResponseText = await chatWithAI(chatHistory, userMsg.text, displayTerm, nativeLang, targetLang);
      const aiMsg: ChatMessage = { role: 'model', text: aiResponseText };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <button onClick={onSave} className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-pop-pink text-white' : 'bg-gray-100 text-gray-400'}`}>
            <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          </button>
        </div>
        
        <div className="flex flex-col mb-2">
          {isTranslation && (
            <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-medium text-gray-400">{entry.term}</span>
            </div>
          )}
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-4xl font-extrabold text-gray-800 break-words">{displayTerm}</h2>
            <AudioButton text={displayTerm} />
          </div>
          {entry.phonetic && (
            <p className="text-pop-purple font-mono text-sm mt-1 font-bold opacity-80">[{entry.phonetic}]</p>
          )}
        </div>
        <p className="text-xl text-gray-600 font-medium mt-3">{entry.nativeDefinition}</p>
        
        {entry.imageUrl && (
          <div className="mt-6 rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-100">
            <img src={entry.imageUrl} alt={displayTerm} className="w-full h-56 object-cover bg-white" />
          </div>
        )}
      </div>

      <div className="bg-pop-yellow/20 rounded-3xl p-6 border border-pop-yellow/50">
        <h3 className="text-pop-purple font-bold uppercase text-xs tracking-wider mb-2">{t('vibeCheck')}</h3>
        <p className="text-gray-800 font-medium leading-relaxed">{entry.usageNote}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider ml-2">{t('examples')}</h3>
        {entry.examples.map((ex, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-3">
            <AudioButton text={ex.text} size="sm" className="mt-1 shrink-0" />
            <div>
              <p className="text-gray-700 text-lg leading-snug">{ex.text}</p>
              <p className="text-gray-400 text-xs font-mono mt-1">{ex.phonetic}</p>
              <p className="text-gray-500 text-sm mt-1 italic">{ex.translation}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-pop-blue/10 p-4 border-b border-pop-blue/10">
          <h3 className="text-pop-blue font-bold text-sm">{t('askAI')}</h3>
        </div>
        <div className="h-48 overflow-y-auto p-4 space-y-3 bg-gray-50/50" ref={chatContainerRef}>
           {chatHistory.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-pop-blue text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                 {msg.text}
               </div>
             </div>
           ))}
           {isChatting && <div className="text-gray-400 text-xs ml-4 animate-pulse">{t('aiTyping')}</div>}
        </div>
        <form onSubmit={handleChatSubmit} className="p-2 bg-white border-t border-gray-100 flex gap-2">
          <input 
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pop-blue"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
          />
          <button type="submit" className="bg-pop-blue text-white p-2 rounded-xl disabled:opacity-50" disabled={isChatting}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

// 4. Notebook View
const NotebookView: React.FC<{
  savedEntries: DictEntry[];
  sourceLang: Language;
  targetLang: Language;
}> = ({ savedEntries, sourceLang, targetLang }) => {
  const [story, setStory] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const t = (k: string) => useText(sourceLang, k);

  const handleGenerateStory = async () => {
    setLoadingStory(true);
    try {
      const s = await generateStory(savedEntries, sourceLang, targetLang);
      setStory(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStory(false);
    }
  };

  const renderStoryText = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        const word = part.slice(1, -1);
        return (
          <span key={i} className="bg-pop-yellow/30 px-1 rounded text-pop-purple font-bold border-b-2 border-pop-yellow cursor-pointer" onClick={() => playTTS(word)}>
            {word}
          </span>
        );
      }
      return part;
    });
  };

  if (savedEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8 text-gray-400">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-4xl">📝</div>
        <p>{t('notebookEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-6 space-y-6">
      <div className="bg-gradient-to-r from-pop-purple to-pop-pink rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <h2 className="text-2xl font-bold mb-2">{t('storyMode')}</h2>
        <button 
          onClick={handleGenerateStory} 
          disabled={loadingStory}
          className="bg-white text-pop-purple font-bold py-2 px-6 rounded-xl text-sm shadow-md active:scale-95 transition-transform w-full mt-4"
        >
          {loadingStory ? t('writing') : t('createStory')}
        </button>
        {story && (
          <div className="mt-6 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
             <p className="leading-relaxed text-lg">{renderStoryText(story)}</p>
             <div className="mt-3 flex justify-end">
                <AudioButton text={story.replace(/\*/g, '')} size="sm" className="bg-white/20 text-white hover:bg-white/30" />
             </div>
          </div>
        )}
      </div>

      <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider ml-2">{t('myCollection')}</h3>
      <div className="grid gap-4">
        {savedEntries.map(entry => {
           const displayTerm = entry.targetTerm || entry.term;
           return (
            <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
               <div>
                 <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-800 text-lg">{displayTerm}</span>
                    <span className="text-xs text-pop-purple font-mono opacity-70">{entry.phonetic}</span>
                 </div>
                 <div className="text-gray-500 text-sm">{entry.nativeDefinition}</div>
               </div>
               <AudioButton text={displayTerm} size="sm" />
            </div>
           );
        })}
      </div>
    </div>
  );
};

// 5. Flashcards View
const FlashcardsView: React.FC<{ savedEntries: DictEntry[]; nativeLang: Language }> = ({ savedEntries, nativeLang }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const t = (k: string) => useText(nativeLang, k);

  if (savedEntries.length === 0) return null;
  
  const current = savedEntries[currentIndex];
  const displayTerm = current.targetTerm || current.term;
  const primaryExample = current.examples[0];

  const nextCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % savedEntries.length);
    }, 200);
  };

  return (
    <div className="pb-24 px-4 pt-8 h-screen flex flex-col">
      <h2 className="text-center font-bold text-2xl text-gray-800 mb-8">{t('studyTime')} ({currentIndex + 1}/{savedEntries.length})</h2>
      
      <div className="flex-1 flex items-center justify-center relative perspective-1000">
        <div 
          className={`relative w-full max-w-xs aspect-[3/4] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="absolute inset-0 bg-white rounded-[40px] shadow-2xl border-4 border-pop-blue flex flex-col items-center justify-center p-8 backface-hidden z-10">
             {current.imageUrl && (
               <img src={current.imageUrl} alt="concept" className="w-32 h-32 object-contain mb-6" />
             )}
             <h2 className="text-4xl font-extrabold text-gray-800 text-center break-words">{displayTerm}</h2>
             <p className="text-pop-purple mt-2 font-mono">{current.phonetic}</p>
             <div className="mt-6">
               <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{t('tapReveal')}</span>
             </div>
          </div>

          <div className="absolute inset-0 bg-pop-blue rounded-[40px] shadow-2xl flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180 text-white">
            <h3 className="text-2xl font-bold mb-2 text-center">{current.nativeDefinition}</h3>
            <div className="w-12 h-1 bg-white/30 rounded-full my-4"></div>
            {primaryExample && (
              <>
                <p className="text-center text-white/90 italic leading-relaxed mb-2">"{primaryExample.text}"</p>
                <p className="text-center text-white/60 text-xs font-mono">{primaryExample.phonetic}</p>
              </>
            )}
            <div 
                className="mt-4 p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); playTTS(displayTerm); }}
            >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 mb-4 flex justify-center">
        <button onClick={nextCard} className="bg-gray-800 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">Next ➔</button>
      </div>
    </div>
  );
};

// 6. Scenario Views (Roleplay)
const ScenarioMenu: React.FC<{
  nativeLang: Language;
  targetLang: Language;
  onSelect: (s: Scenario) => void;
}> = ({ nativeLang, targetLang, onSelect }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const t = (k: string) => useText(nativeLang, k);

  useEffect(() => {
    loadScenarios();
  }, [targetLang]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const list = await generateScenarios(targetLang, nativeLang);
      setScenarios(list);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 pb-24 pt-8">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6">{t('chooseScenario')}</h2>
      {loading ? (
        <div className="text-center py-10 text-gray-400">{t('writing')}</div>
      ) : (
        <div className="space-y-4">
          {scenarios.map(s => (
            <div key={s.id} onClick={() => onSelect(s)} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 cursor-pointer hover:border-pop-purple transition-colors">
              <div className="text-4xl mb-2">🎭</div>
              <h3 className="font-bold text-xl text-gray-800">{s.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{s.description}</p>
            </div>
          ))}
          <button onClick={loadScenarios} className="w-full py-3 text-center text-pop-blue font-bold mt-4 text-sm">Refresh Scenarios</button>
        </div>
      )}
    </div>
  );
};

const ScenarioChat: React.FC<{
  scenario: Scenario;
  nativeLang: Language;
  targetLang: Language;
  onEnd: (history: ChatMessage[]) => void;
}> = ({ scenario, nativeLang, targetLang, onEnd }) => {
  const [history, setHistory] = useState<ChatMessage[]>([{ role: 'model', text: scenario.openingLine }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = (k: string) => useText(nativeLang, k);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const newHistory = [...history, { role: 'user' as const, text: input }];
    setHistory(newHistory);
    setInput('');
    setLoading(true);
    
    try {
      const resp = await chatInScenario(newHistory, scenario, targetLang);
      setHistory([...newHistory, { role: 'model', text: resp }]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-safe">
       <div className="bg-white p-4 border-b shadow-sm flex justify-between items-center pt-10 md:pt-4 sticky top-0 z-10">
         <div>
            <h3 className="font-bold text-gray-800">{scenario.title}</h3>
            <p className="text-xs text-gray-500">{t('roleplay')}</p>
         </div>
         <button onClick={() => onEnd(history)} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold">
           {t('endSession')}
         </button>
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {history.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-pop-blue text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'}`}>
                {m.text}
                {m.role === 'model' && (
                  <div className="mt-1 flex justify-end opacity-50 hover:opacity-100">
                    <AudioButton text={m.text} size="sm" className="!p-1 !w-5 !h-5 text-current" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <div className="text-center text-xs text-gray-400 animate-pulse">...</div>}
       </div>

       <form onSubmit={send} className="p-4 bg-white border-t">
         <div className="flex gap-2">
           <input 
             className="flex-1 bg-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pop-blue"
             value={input}
             onChange={e => setInput(e.target.value)}
             placeholder="Type here..."
           />
           <button type="submit" className="bg-pop-blue text-white p-3 rounded-xl" disabled={loading}>➤</button>
         </div>
       </form>
    </div>
  );
};

const ScenarioReportView: React.FC<{
  report: ScenarioReport;
  nativeLang: Language;
  onClose: () => void;
}> = ({ report, nativeLang, onClose }) => {
  const t = (k: string) => useText(nativeLang, k);
  
  return (
    <div className="p-6 pb-24 pt-8 animate-fade-in">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">{t('reportCard')}</h2>
      
      <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-pop-purple text-center mb-6">
        <div className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-2">{t('fluencyScore')}</div>
        <div className="text-6xl font-extrabold text-pop-purple">{report.score}</div>
      </div>

      <div className="bg-pop-yellow/20 p-6 rounded-2xl mb-6">
        <p className="text-gray-800 font-medium">{report.feedback}</p>
      </div>

      <h3 className="font-bold text-gray-600 uppercase text-xs tracking-widest mb-4">{t('corrections')}</h3>
      <div className="space-y-4">
        {report.corrections.map((c, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-red-400 line-through text-sm mb-1">{c.original}</div>
            <div className="text-green-600 font-bold text-lg mb-2">→ {c.correction}</div>
            <div className="text-gray-500 text-xs bg-gray-50 p-2 rounded">{c.explanation}</div>
          </div>
        ))}
      </div>

      <button onClick={onClose} className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl mt-8 shadow-lg">
        {t('backMenu')}
      </button>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('onboarding');
  const [nativeLang, setNativeLang] = useState<Language>(Language.English);
  const [targetLang, setTargetLang] = useState<Language>(Language.Spanish);
  
  const [currentEntry, setCurrentEntry] = useState<DictEntry | null>(null);
  const [savedEntries, setSavedEntries] = useState<DictEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Scenario State
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [scenarioReport, setScenarioReport] = useState<ScenarioReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lingopop-notebook');
    if (saved) setSavedEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('lingopop-notebook', JSON.stringify(savedEntries));
  }, [savedEntries]);

  const t = (k: string) => useText(nativeLang, k);

  const handleStart = (native: Language, target: Language) => {
    setNativeLang(native);
    setTargetLang(target);
    setView('search');
  };

  const handleSearch = async (term: string) => {
    setIsSearching(true);
    const existing = savedEntries.find(e => e.term.toLowerCase() === term.toLowerCase());
    if (existing) {
      setCurrentEntry(existing);
      setView('result');
      setIsSearching(false);
      return;
    }

    try {
      const [textData, imageUrl] = await Promise.all([
        lookupTerm(term, nativeLang, targetLang),
        generateConceptImage(term)
      ]);

      const newEntry: DictEntry = {
        id: Date.now().toString(),
        term, 
        targetTerm: textData.targetTerm,
        phonetic: textData.phonetic,
        nativeDefinition: textData.nativeDefinition,
        examples: textData.examples,
        usageNote: textData.usageNote,
        imageUrl,
        createdAt: Date.now()
      };

      setCurrentEntry(newEntry);
      setView('result');
    } catch (error) {
      alert("Oops! AI had a hiccup. Try again.");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSave = () => {
    if (!currentEntry) return;
    const exists = savedEntries.some(e => e.id === currentEntry.id);
    if (exists) {
      setSavedEntries(prev => prev.filter(e => e.id !== currentEntry.id));
    } else {
      setSavedEntries(prev => [currentEntry, ...prev]);
    }
  };

  // Nav handling
  const NavIcon = ({ active, icon, label, onClick }: any) => (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${active ? 'text-pop-purple' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase mt-1 tracking-wide">{label}</span>
    </button>
  );

  if (view === 'onboarding') {
    return <WelcomeScreen onStart={handleStart} />;
  }

  // Handling Full Screen Roleplay Views
  if (view === 'scenario-chat' && activeScenario) {
    return <ScenarioChat 
      scenario={activeScenario} 
      nativeLang={nativeLang} 
      targetLang={targetLang} 
      onEnd={async (hist) => {
        setReportLoading(true);
        setView('scenario-report');
        try {
          const rep = await evaluateScenario(hist, nativeLang, targetLang);
          setScenarioReport(rep);
        } catch(e) { console.error(e); setView('scenario-menu'); }
        finally { setReportLoading(false); }
      }} 
    />;
  }

  if (view === 'scenario-report') {
    if (reportLoading) return <div className="flex items-center justify-center h-screen bg-pop-yellow"><h1 className="text-2xl font-bold text-white animate-pulse">Grading...</h1></div>;
    if (scenarioReport) return <ScenarioReportView report={scenarioReport} nativeLang={nativeLang} onClose={() => setView('scenario-menu')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 relative max-w-md mx-auto shadow-2xl">
      
      {/* Header visible in search/notebook */}
      {['search', 'result', 'notebook'].includes(view) && (
        <SearchHeader 
          onSearch={handleSearch} 
          isSearching={isSearching} 
          nativeLang={nativeLang} 
          targetLang={targetLang} 
        />
      )}

      <main className="min-h-screen bg-gray-50">
        {view === 'search' && !currentEntry && (
          <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center text-gray-400 animate-fade-in">
            <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 text-6xl border-4 border-gray-100">
               👋
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('welcome')}</h2>
            <p>{t('searchPlaceholder')}</p>
          </div>
        )}

        {view === 'result' && currentEntry && (
          <ResultView 
            entry={currentEntry} 
            isSaved={savedEntries.some(e => e.id === currentEntry.id)} 
            onSave={toggleSave}
            nativeLang={nativeLang}
            targetLang={targetLang}
          />
        )}

        {view === 'notebook' && (
          <NotebookView savedEntries={savedEntries} sourceLang={nativeLang} targetLang={targetLang} />
        )}

        {view === 'flashcards' && (
          <FlashcardsView savedEntries={savedEntries} nativeLang={nativeLang} />
        )}

        {view === 'scenario-menu' && (
          <ScenarioMenu 
            nativeLang={nativeLang} 
            targetLang={targetLang} 
            onSelect={(s) => { setActiveScenario(s); setView('scenario-chat'); }} 
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-around items-center z-50 max-w-md mx-auto pb-safe">
        <NavIcon 
          active={view === 'search' || view === 'result'} 
          label={t('search')} 
          onClick={() => setView(currentEntry ? 'result' : 'search')}
          icon={<svg className="w-6 h-6" fill={view === 'search' || view === 'result' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>}
        />
        <NavIcon 
          active={view === 'scenario-menu'} 
          label={t('roleplay')} 
          onClick={() => setView('scenario-menu')}
          icon={<svg className="w-6 h-6" fill={view === 'scenario-menu' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>}
        />
        <NavIcon 
          active={view === 'notebook'} 
          label={t('notebook')} 
          onClick={() => setView('notebook')}
          icon={<svg className="w-6 h-6" fill={view === 'notebook' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>}
        />
        <NavIcon 
          active={view === 'flashcards'} 
          label={t('learn')} 
          onClick={() => setView('flashcards')}
          icon={<svg className="w-6 h-6" fill={view === 'flashcards' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
        />
      </div>
    </div>
  );
};

export default App;