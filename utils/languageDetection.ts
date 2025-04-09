// Enhanced language detection function with more languages and better patterns

import { languageOptions } from '../components/LanguageSelector';

// Common language patterns and unique characters to help with detection
const languagePatterns: Record<string, RegExp[]> = {
  // Germanic languages
  "deu_Latn": [
    /[äöüß]/i, 
    /\b(und|der|die|das|ist|ich|du|wir|sie|nicht|ein|eine|zu|von|mit|den|dem|des|im|für|auf|es|sich|auch|wenn|wird|sind|oder|hat|als|an|bei|nach|so|nur|vor|über|aber|aus|wie|kann|noch|zum|mehr)\b/gi
  ],
  "eng_Latn": [
    /\b(the|of|and|to|in|is|you|that|it|for|was|on|are|with|as|be|this|have|from|or|had|by|not|but|what|all|were|we|when|your|can|said|there|use|an|each|which|she|do|how|their|if|will|up|about|out|them)\b/gi
  ],
  "nld_Latn": [
    /[ĳáéíóúëïöü]/i,
    /\b(de|het|een|en|van|in|is|dat|op|te|voor|met|zijn|uit|die|niet|aan|er|om|deze|ook|als|door|maar|naar|heeft|bij|of|nog|over|tot|je|mij|hij|wordt|we|kan|dan|wat|was|ze|geen|zo)\b/gi
  ],
  "swe_Latn": [
    /[åäö]/i,
    /\b(och|att|det|som|en|på|är|av|för|med|den|till|inte|har|de|ett|jag|om|var|vi|så|men|sig|från|eller|du|när|kan|hur|ska|vad|där|nu|över|skulle|mycket|också)\b/gi
  ],
  
  // Romance languages
  "spa_Latn": [
    /[áéíóúñ¿¡]/i, 
    /\b(el|la|los|las|de|en|y|que|es|por|con|para|un|una|no|lo|del|se|como|más|su|al|pero|si|o|ha|me|este|ya|te|le|mi|está|entre|cuando|muy|todo|sin|sobre|hasta|más|este|ha|algo|tiene|son)\b/gi
  ],
  "fra_Latn": [
    /[àâçéèêëîïôùûüÿ]/i, 
    /\b(le|la|les|de|et|est|en|un|une|du|des|ce|cette|ces|je|tu|il|nous|vous|ils|que|qui|dans|par|pour|sur|avec|pas|au|aux|plus|mais|ou|sont|comme|elle|tout|on|même|aussi|bien|été|avoir|fait)\b/gi
  ],
  "ita_Latn": [
    /[àèéìíîòóùú]/i, 
    /\b(il|lo|la|i|gli|le|un|uno|una|di|a|da|in|con|su|per|tra|fra|che|non|è|sono|come|ma|se|anche|si|al|della|del|dei|degli|delle|nella|nel|ha|ho|questo|questa|questi|queste|più|suo|sua|loro)\b/gi
  ],
  "por_Latn": [
    /[áàâãçéêíóôõú]/i,
    /\b(o|a|os|as|de|da|do|das|dos|um|uma|e|que|em|para|com|não|se|na|no|nos|nas|uma|por|mais|como|mas|ou|ao|pelo|pela|são|só|isto|isso|ele|ela|eles|elas|você|este|esta)\b/gi
  ],
  
  // Slavic languages
  "pol_Latn": [
    /[ąćęłńóśźż]/i,
    /\b(w|i|na|się|z|do|to|że|nie|jest|o|a|jak|dla|po|co|tak|ale|być|przez|od|już|go|tylko|jego|ma|czy|jej|ten|mnie|był|nim|kiedy|pan|ich|bardzo|może|tu|jestem|są|was|mi|ty|teraz|będzie)\b/gi
  ],
  "rus_Cyrl": [
    /[абвгдеёжзийклмнопрстуфхцчшщъыьэюя]/i,
    /\b(и|в|не|на|я|что|с|он|а|то|это|как|по|но|его|за|от|она|у|из|к|мы|вы|они|бы|же|был|так|для|все|только|меня|есть|вот|был|если|нет|один)\b/gi
  ],
  "ukr_Cyrl": [
    /[іїєґ]/i,
    /\b(і|в|не|на|я|що|з|він|а|це|як|по|але|його|за|від|вона|у|із|до|ми|ви|вони|був|так|для|все|тільки|мене|є|тут|бути|якщо|ні|один)\b/gi
  ],
  
  // Asian languages (common patterns)
  "jpn_Jpan": [
    /[\u3040-\u309F\u30A0-\u30FF]/,  // Hiragana and Katakana
    /[\u4E00-\u9FAF]/  // Kanji
  ],
  "cmn_Hans": [
    /[\u4E00-\u9FFF]/,  // Simplified Chinese characters
    /[\u3400-\u4DBF]/   // Additional CJK unified ideographs
  ],
  "kor_Hang": [
    /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/  // Hangul
  ],
  
  // Other languages
  "ara_Arab": [
    /[\u0600-\u06FF]/,  // Arabic script
    /[\u0750-\u077F\u08A0-\u08FF]/  // Arabic supplement and extended
  ],
  "hin_Deva": [
    /[\u0900-\u097F]/,  // Devanagari script
    /[\u0901\u0902\u0903]/  // Devanagari nasalization marks
  ],
  "vie_Latn": [
    /[áàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i,
    /\b(và|của|có|là|không|được|trong|một|cho|về|với|tôi|đã|người|này|những|để|từ|các|như|khi|ra|thì|đó|nó|vào|sẽ|phải|còn|bị|bởi)\b/gi
  ],
  "tur_Latn": [
    /[çğıöşü]/i,
    /\b(bir|ve|bu|de|için|da|ne|ben|o|ki|ile|mi|ama|gibi|kadar|daha|çok|en|sonra|her|var|diye|bana|seni|beni|onu|şey|değil|ya|yok)\b/gi
  ]
};

export async function detectLanguage(text: string): Promise<string | null> {
  if (!text || text.length < 20) return null;
  
  // Normalize the text: remove extra spaces, normalize line breaks
  const normalizedText = text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  
  // Calculate scores for each language
  const scores: Record<string, number> = {};
  
  Object.entries(languagePatterns).forEach(([langCode, patterns]) => {
    scores[langCode] = 0;
    
    patterns.forEach(pattern => {
      const matches = normalizedText.match(pattern);
      if (matches) {
        // Weight special character patterns more heavily than common words
        const weight = pattern.toString().includes('[') ? 2 : 1; 
        scores[langCode] += matches.length * weight;
      }
    });
    
    // Normalize score by text length to avoid bias toward longer texts
    scores[langCode] = scores[langCode] / Math.sqrt(normalizedText.length);
  });
  
  // Find the language with the highest score
  let highestScore = 0;
  let detectedLanguage: string | null = null;
  
  Object.entries(scores).forEach(([langCode, score]) => {
    if (score > highestScore) {
      highestScore = score;
      detectedLanguage = langCode;
    }
  });
  
  console.log("Language detection scores:", scores);
  
  // Only return a language if its score is significant
  // Adjust threshold based on testing with your documents
  return highestScore > 0.1 ? detectedLanguage : null;
}

// Optional: Add a function to get language name from code
export function getLanguageName(code: string): string {
  return languageOptions[code as keyof typeof languageOptions] || code;
}