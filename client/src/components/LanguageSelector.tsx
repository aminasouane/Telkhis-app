import { Language, languages, languageNames } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LanguageSelectorProps {
  value: Language;
  onChange: (language: Language) => void;
}

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <Label htmlFor="language-select" className="text-base font-medium">
        اختر اللغة
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id="language-select"
          className="w-full"
          data-testid="select-language"
        >
          <SelectValue placeholder="اختر اللغة..." />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem
              key={lang}
              value={lang}
              data-testid={`option-language-${lang}`}
            >
              {languageNames[lang]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
