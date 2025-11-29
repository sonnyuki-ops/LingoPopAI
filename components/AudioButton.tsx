import React, { useState } from 'react';
import { playTTS } from '../services/geminiService';

interface AudioButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const AudioButton: React.FC<AudioButtonProps> = ({ text, className = '', size = 'md' }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    setIsPlaying(true);
    await playTTS(text);
    // Simple timeout to reset icon state since we don't have exact duration from raw PCM easily without checking buffer
    setTimeout(() => setIsPlaying(false), 2000); 
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <button
      onClick={handlePlay}
      disabled={isPlaying}
      className={`flex items-center justify-center rounded-full bg-pop-yellow/20 text-pop-purple hover:bg-pop-yellow/40 transition-colors ${size === 'sm' ? 'p-1.5' : 'p-2'} ${className}`}
    >
      {isPlaying ? (
         <svg className={`${iconSize} animate-pulse`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
      ) : (
         <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
      )}
    </button>
  );
};
