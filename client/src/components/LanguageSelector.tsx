import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

const languages = [
  { code: 'ko' as const, label: '한국어', flag: '🇰🇷' },
  { code: 'ja' as const, label: '日本語', flag: '🇯🇵' },
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
  { code: 'th' as const, label: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'zh' as const, label: '中文', flag: '🇨🇳' },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  
  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl px-3 py-2 gap-2"
          data-testid="language-selector-trigger"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">{currentLang.flag} {currentLang.label}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-[#121826]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl min-w-[140px]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg transition-colors ${
              language === lang.code 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
            data-testid={`language-option-${lang.code}`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
