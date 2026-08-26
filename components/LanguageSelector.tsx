import React from 'react';
// icon replaced with image asset
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'minimal' | 'bordered';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className, variant = 'bordered' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("relative group", className)}>
      <div className={cn(
        "p-2 text-gray-400 hover:text-ms-blue transition-colors cursor-pointer flex items-center space-x-1 backdrop-blur-sm rounded-sm border transition-all duration-200",
        variant === 'bordered' ? "bg-white/50 border-transparent hover:border-gray-200" : "bg-transparent border-transparent"
      )}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 12H22" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" />
        </svg>
        <span className="text-[10px] font-bold tracking-widest">{language}</span>
      </div>
      <select 
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        title="Selecionar idioma"
        aria-label="Selecionar idioma"
      >
        <option value="pt">Português</option>
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </div>
  );
};
