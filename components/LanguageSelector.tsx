import React from 'react';

// NLLB-200 language codes and their readable names
export const languageOptions: Record<string, string> = {
  "eng_Latn": "English",
  "spa_Latn": "Spanish / Español",
  "deu_Latn": "German / Deutsch",
  "fra_Latn": "French / Français",
  "ita_Latn": "Italian / Italiano",
  "por_Latn": "Portuguese / Português",
  "nld_Latn": "Dutch / Nederlands",
  "pol_Latn": "Polish / Polski",
  "rus_Cyrl": "Russian / Русский",
  "ukr_Cyrl": "Ukrainian / Українська",
  "jpn_Jpan": "Japanese / 日本語",
  "cmn_Hans": "Chinese (Simplified) / 简体中文",
  "ara_Arab": "Arabic / العربية",
  "hin_Deva": "Hindi / हिन्दी",
  "kor_Hang": "Korean / 한국어",
  "vie_Latn": "Vietnamese / Tiếng Việt",
  "swe_Latn": "Swedish / Svenska",
  "tur_Latn": "Turkish / Türkçe",
};

// Define a fixed order array instead of dynamic sorting
// This ensures consistency between server and client
const languageList = [
  { code: "ara_Arab", name: "Arabic / العربية" },
  { code: "cmn_Hans", name: "Chinese (Simplified) / 简体中文" },
  { code: "deu_Latn", name: "German / Deutsch" },
  { code: "eng_Latn", name: "English" },
  { code: "fra_Latn", name: "French / Français" },
  { code: "hin_Deva", name: "Hindi / हिन्दी" },
  { code: "ita_Latn", name: "Italian / Italiano" },
  { code: "jpn_Jpan", name: "Japanese / 日本語" },
  { code: "kor_Hang", name: "Korean / 한국어" },
  { code: "nld_Latn", name: "Dutch / Nederlands" },
  { code: "pol_Latn", name: "Polish / Polski" },
  { code: "por_Latn", name: "Portuguese / Português" },
  { code: "rus_Cyrl", name: "Russian / Русский" },
  { code: "spa_Latn", name: "Spanish / Español" },
  { code: "swe_Latn", name: "Swedish / Svenska" },
  { code: "tur_Latn", name: "Turkish / Türkçe" },
  { code: "ukr_Cyrl", name: "Ukrainian / Українська" },
  { code: "vie_Latn", name: "Vietnamese / Tiếng Việt" },
];

interface LanguageSelectorProps {
  type: "source" | "target";
  value: string;
  onChange: (value: string) => void;
  autoDetected?: boolean;
  onManualOverride?: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  type, 
  value, 
  onChange, 
  autoDetected = false,
  onManualOverride
}: LanguageSelectorProps) => {
  return (
    <div className="mb-4">
      <label className="flex items-center mb-2 text-sm font-medium">
        <span>{type === "source" ? "Idioma de origen" : "Idioma de destino"}:</span>
        {autoDetected && (
          <span className="ml-2 text-xs bg-blue-500 bg-opacity-40 px-2 py-0.5 rounded">
            Auto-detectado
          </span>
        )}
      </label>
      
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (type === "source" && autoDetected && onManualOverride) {
            onManualOverride();
          }
        }}
        className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="" disabled>Selecciona un idioma</option>
        {languageList.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;