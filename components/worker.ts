import { pipeline, Pipeline } from '@xenova/transformers';

// Define types for the translation pipeline
type TranslationOptions = {
  tgt_lang: string;
  src_lang: string;
  callback_function?: (x: any) => void;
};

type TranslationOutput = {
  generated_text: string;
};

type TokenizerOutput = {
  output_token_ids: number[];
};

interface TranslatorInstance {
  (text: string, options: TranslationOptions): Promise<TranslationOutput[]>;
  tokenizer: {
    decode: (tokens: number[], options: { skip_special_tokens: boolean }) => string;
  };
}

/**
 * This class uses the Singleton pattern to ensure that only one instance of the
 * pipeline is loaded. This is because loading the pipeline is an expensive
 * operation and we don't want to do it every time we want to translate a sentence.
 */
class TranslationPipeline {
  static task = 'translation' as const; // Use a const assertion
  static model = 'Xenova/nllb-200-distilled-600M';
  static instance: TranslatorInstance | null = null;

  static async getInstance(progress_callback?: (progress: any) => void): Promise<TranslatorInstance> {
    console.log('TranslationPipeline.getInstance llamado, instancia actual:', !!this.instance);
    
    if (this.instance === null) {
      console.log('Cargando pipeline con modelo:', this.model);
      try {
        // Mensaje para indicar que estamos iniciando la carga
        if (progress_callback) {
          progress_callback({ status: 'initiate', message: 'Iniciando carga del modelo' });
        }
        
        // Cast to TranslatorInstance since we know the pipeline will have this shape
        this.instance = await pipeline(this.task, this.model, { progress_callback }) as unknown as TranslatorInstance;
        
        console.log('Pipeline cargado correctamente');
        
        // Notificar que el modelo está listo
        self.postMessage({ status: 'ready' });
        
      } catch (error) {
        console.error('Error al cargar el pipeline:', error);
        self.postMessage({ 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Error desconocido al cargar el modelo'
        });
        throw error;
      }
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  console.log('Worker recibió mensaje:', event.data);
  
  // Responder a mensajes de prueba
  if (event.data.action === 'test') {
    self.postMessage({ status: 'ready', message: 'Worker funcionando correctamente' });
    return;
  }
  
  try {
    // Retrieve the translation pipeline
    const translator = await TranslationPipeline.getInstance(x => {
      // Forward progress updates to main thread
      self.postMessage(x);
    });

    const { text, src_lang, tgt_lang, includePhonetics, pageRange } = event.data;
    
    // Check if the text appears to be raw PDF content and handle it
    if (text.startsWith('%PDF-')) {
      self.postMessage({
        status: 'error',
        error: 'The input appears to be raw PDF binary data. Please extract text from the PDF before translating.'
      });
      return;
    }
    
    // Process text by sentences
    const sentences = splitIntoSentences(text);
    
    // Apply page range filter if specified
    const filteredSentences = pageRange 
      ? filterSentencesByPageRange(sentences, pageRange.start, pageRange.end) 
      : sentences;
    
    // Check if we have valid sentences after filtering
    if (filteredSentences.length === 0 || 
        (filteredSentences.length === 1 && !filteredSentences[0].trim())) {
      self.postMessage({
        status: 'error',
        error: 'No valid text content found for translation. The document may contain only images or is protected.'
      });
      return;
    }
    
    let translatedDocument = '';
    let processedSentences = 0;
    
    // Keep first page (typically cover) intact if it exists
    if (pageRange?.start > 1 || !pageRange) {
      const firstPageContent = extractFirstPage(text);
      if (firstPageContent) {
        translatedDocument += `<div class="cover-page">${firstPageContent}</div>\n\n`;
      }
    }
    
    // Process each sentence
    for (const sentence of filteredSentences) {
      if (sentence.trim()) {
        try {
          // Translate the sentence
          const translationOutput = await translator(sentence, {
            tgt_lang,
            src_lang,
            callback_function: (x: any) => {
              // Real-time translation updates
              const partialTranslation = translator.tokenizer.decode(
                (x[0] as TokenizerOutput).output_token_ids, 
                { skip_special_tokens: true }
              );
              
              // Update with current progress
              self.postMessage({
                status: 'update',
                output: translatedDocument + formatSentencePair(
                  sentence,
                  partialTranslation,
                  includePhonetics ? generateSimplePhonetics(sentence) : null
                ),
                processedSentences,
                totalSentences: filteredSentences.length,
              });
            }
          });
          
          const translatedSentence = translationOutput[0].generated_text;
          
          // Add formatted sentence pair to document
          translatedDocument += formatSentencePair(
            sentence,
            translatedSentence,
            includePhonetics ? generateSimplePhonetics(sentence) : null
          );
          
          // Update progress
          processedSentences++;
          self.postMessage({
            status: 'update',
            output: translatedDocument,
            processedSentences,
            totalSentences: filteredSentences.length,
          });
          
        } catch (error: unknown) {
          console.error('Translation error:', error);
          // Safe stringify of error
          const errorMessage = error instanceof Error ? error.message : String(error);
          translatedDocument += `<p class="error">Error translating: ${escapeHtml(sentence)} - ${escapeHtml(errorMessage)}</p>\n\n`;
        }
      }
    }
    
    // Send the completed translation
    self.postMessage({
      status: 'complete',
      output: wrapInHtml(translatedDocument, src_lang, tgt_lang),
    });
  } catch (error: unknown) {
    console.error('Worker error:', error);
    self.postMessage({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Split text into sentences
function splitIntoSentences(text: string): string[] {
  // First, check if text contains PDF binary markers and clean them
  if (text.includes('%PDF-') || text.includes('obj') || text.includes('endobj')) {
    // Remove common PDF binary artifacts
    text = text.replace(/%PDF-\d+\.\d+[\s\S]*?<<\/Pages/gi, '')
              .replace(/<<[^>]*>>/g, '')
              .replace(/\d+ \d+ obj[\s\S]*?endobj/g, '')
              .replace(/stream[\s\S]*?endstream/g, '');
  }

  // Enhanced sentence splitting logic
  return text
    // Handle common sentence terminators
    .replace(/([.!?])\s+/g, "$1\n")
    // Handle quotes and parentheses better
    .replace(/([.!?]["')\]]+)\s+/g, "$1\n")
    // Remove lines that are likely PDF artifacts
    .split('\n')
    .filter(s => {
      const trimmed = s.trim();
      // Filter out PDF artifacts and empty lines
      return trimmed.length > 0 && 
             !trimmed.match(/^(\d+\s+\d+\s+\d+|\/[A-Z][a-zA-Z]*|obj|endobj|stream|endstream)$/) &&
             !trimmed.startsWith('%');
    });
}

// Format a pair of original and translated sentences
function formatSentencePair(original: string, translation: string, phonetics: string | null = null): string {
  let result = `<div class="sentence-pair">
    <p class="original">${escapeHtml(original)}</p>\n`;
    
  if (phonetics) {
    result += `<p class="phonetic">${escapeHtml(phonetics)}</p>\n`;
  }
  
  result += `<p class="translation">${escapeHtml(translation)}</p>
</div>\n\n`;
  
  return result;
}

// Filter sentences by page range
function filterSentencesByPageRange(sentences: string[], startPage: number, endPage: number): string[] {
  if (!startPage && !endPage) {
    return sentences;
  }
  
  // Estimate pages based on average sentences per page
  const SENTENCES_PER_PAGE = 20;
  const start = Math.max(0, (startPage - 1) * SENTENCES_PER_PAGE);
  const end = Math.min(sentences.length, endPage * SENTENCES_PER_PAGE);
  
  return sentences.slice(start, end);
}

// Extract what looks like a cover page
function extractFirstPage(text: string): string {
  // Simple heuristic: take first 500 characters or first paragraph
  const firstPageMatch = text.match(/^([\s\S]{1,500}?)(\n\n|\r\n\r\n|$)/);
  return firstPageMatch ? firstPageMatch[1] : '';
}

// Generate simple phonetic representation
function generateSimplePhonetics(text: string): string {
  // This is just a very basic placeholder
  // Would need a proper phonetic model in production
  return text
    .toLowerCase()
    .replace(/th/g, 'θ')
    .replace(/ch/g, 'tʃ')
    .replace(/sh/g, 'ʃ');
}

// Escape HTML special characters to prevent injection
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Wrap the translated content in proper HTML with styles
function wrapInHtml(content: string, srcLang: string, tgtLang: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Translated Document</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .sentence-pair {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .original {
      color: #1a73e8;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .phonetic {
      color: #9e9e9e;
      font-style: italic;
      margin: 4px 0;
      font-size: 0.9em;
    }
    .translation {
      color: #3c4043;
      margin-top: 4px;
      padding-left: 15px;
      border-left: 2px solid #dadce0;
    }
    .error {
      color: #d50000;
      font-style: italic;
    }
    .cover-page {
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .metadata {
      margin: 20px 0;
      font-size: 0.8em;
      color: #5f6368;
      border-top: 1px solid #dadce0;
      padding-top: 10px;
    }
    @media print {
      body { 
        font-size: 12pt;
      }
      .sentence-pair {
        page-break-inside: avoid;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="content">
    ${content}
  </div>
  <div class="metadata">
    <p>Translated from ${srcLang} to ${tgtLang} with Leengua</p>
  </div>
</body>
</html>`;
}