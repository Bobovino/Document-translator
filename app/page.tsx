'use client'

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { v4 as uuidv4 } from 'uuid'
import LanguageSelector from '../components/LanguageSelector'
import TranslationProgress from '../components/TranslationProgress'
import { detectLanguage, getLanguageName } from '../utils/languageDetection'

// Dynamic imports for client-side only components
const FileDropZone = dynamic(() => import('../components/FileDropZone'), { ssr: false });

// Use dynamic import for PDF extraction
const usePdfExtraction = () => {
  const [extractFn, setExtractFn] = useState<((file: File) => Promise<string>) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('../utils/pdfUtils')
      .then((module) => {
        setExtractFn(() => module.extractTextFromPdf);
      })
      .catch((err) => {
        console.error('Failed to load PDF extraction module:', err);
      });
  }, []);

  return extractFn;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState<boolean>(false)
  
  // For translation worker
  const [modelReady, setModelReady] = useState<boolean | null>(null)
  const [progressItems, setProgressItems] = useState<any[]>([])
  const [documentContent, setDocumentContent] = useState<string>('')
  const [translatedContent, setTranslatedContent] = useState<string>('')
  const [currentProgress, setCurrentProgress] = useState<number>(0)
  const [processedSentences, setProcessedSentences] = useState<number>(0)
  const [totalSentences, setTotalSentences] = useState<number>(0)
  
  // Source and target languages
  const [sourceLanguage, setSourceLanguage] = useState<string>('deu_Latn') // Default to German
  const [targetLanguage, setTargetLanguage] = useState<string>('spa_Latn') // Default to Spanish
  const [autoDetectedLanguage, setAutoDetectedLanguage] = useState<boolean>(false)
  
  // New options
  const [includePhonetics, setIncludePhonetics] = useState<boolean>(false)
  const [enablePageRange, setEnablePageRange] = useState<boolean>(false)
  const [pageRange, setPageRange] = useState<{ start: number; end: number }>({ start: 1, end: 9999 })
  
  // Add state for PDF extraction loading
  const [pdfExtracting, setPdfExtracting] = useState(false);
  
  // Use null initially for worker ref - will be created only on client side
  const worker = useRef<Worker | null>(null)
  
  // Use the custom hook to get the PDF extraction function
  const extractTextFromPdf = usePdfExtraction();
  
  // Define handleWorkerMessages BEFORE it's used in useEffect
  const handleWorkerMessages = useCallback((e: MessageEvent) => {
    console.log('Mensaje del worker recibido:', e.data);
    
    // Si es un mensaje de prueba, simplemente lo logueamos
    if (e.data.action === 'test') {
      console.log('El worker está funcionando correctamente');
      return;
    }
    
    switch (e.data.status) {
      case 'initiate':
        setModelReady(false);
        setProgressItems(prev => [...prev, e.data]);
        break;
        
      case 'progress':
        setProgressItems(
          prev => prev.map(item => {
            if (item.file === e.data.file) {
              return { ...item, progress: e.data.progress }
            }
            return item;
          })
        );
        break;
        
      case 'done':
        setProgressItems(
          prev => prev.filter(item => item.file !== e.data.file)
        );
        break;
        
      case 'ready':
        setModelReady(true);
        break;
        
      case 'update':
        setTranslatedContent(e.data.output);
        
        if (e.data.totalSentences) {
          setTotalSentences(e.data.totalSentences);
          setProcessedSentences(e.data.processedSentences || 0);
          const progressPercent = Math.min(
            100, 
            Math.round((e.data.processedSentences / e.data.totalSentences) * 100)
          );
          setCurrentProgress(progressPercent);
        } else {
          const progressPercent = Math.min(
            100, 
            Math.round((e.data.output.length / documentContent.length) * 100)
          );
          setCurrentProgress(progressPercent);
        }
        break;
        
      case 'complete':
        setLoading(false);
        setCurrentProgress(100);
        
        const translatedBlob = new Blob([e.data.output], { type: 'text/html' });
        const url = window.URL.createObjectURL(translatedBlob);
        setDownloadUrl(url);
        
        setTimeout(() => {
          setShowProgress(false);
        }, 1000);
        break;
        
      case 'error':
        console.error('Translation error:', e.data.error);
        setLoading(false);
        alert(`Error durante la traducción: ${e.data.error}`);
        setShowProgress(false);
        break;
    }
  }, [documentContent]);
  
  // Initialize worker only on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('Inicializando worker...');
    try {
      // Create worker on mount
      worker.current = new Worker(new URL('../components/worker.ts', import.meta.url), {
        type: 'module'
      });
      
      console.log('Worker inicializado correctamente');
      
      // Set up message handlers
      worker.current.addEventListener('message', handleWorkerMessages);
      
      // Send a test message to verify the worker is responding
      worker.current.postMessage({ action: 'test' });
      
      // Cleanup on unmount
      return () => {
        if (worker.current) {
          worker.current.removeEventListener('message', handleWorkerMessages);
          worker.current.terminate();
          console.log('Worker terminado');
        }
      };
    } catch (error) {
      console.error('Error al inicializar el worker:', error);
      setModelReady(false);
    }
  }, [handleWorkerMessages]);

  const handleFileDrop = useCallback((newFile: File) => {
    setFile(newFile);
    setDownloadUrl(null);
    setSessionId(null);
    setShowProgress(false);
    
    // Process different file types appropriately
    if (newFile.type === 'application/pdf') {
      // Check if PDF extraction is available
      if (!extractTextFromPdf) {
        alert('PDF processing is still loading. Please try again in a moment.');
        return;
      }
      
      // PDF file - extract text first
      setPdfExtracting(true); // Start loading indicator
      
      extractTextFromPdf(newFile)
        .then((text) => {
          // Process the extracted text
          setDocumentContent(text);
          setPdfExtracting(false);
          return text.substring(0, 1000); // Get sample for language detection
        })
        .then(async (sample) => {
          try {
            const detectedLang = await detectLanguage(sample);
            if (detectedLang) {
              setSourceLanguage(detectedLang);
              setAutoDetectedLanguage(true);
              console.log(`Auto-detected language: ${detectedLang} (${getLanguageName(detectedLang)})`);
            }
          } catch (error) {
            console.error('Language detection failed:', error);
          }
        })
        .catch((error) => {
          setPdfExtracting(false); // End loading indicator on error too
          console.error('PDF extraction failed:', error);
          alert('Failed to extract text from PDF: ' + error.message);
        });
    } else {
      // Text file - use FileReader as before
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          const content = e.target.result.toString();
          setDocumentContent(content);
          
          try {
            const sample = content.substring(0, 1000);
            const detectedLang = await detectLanguage(sample);
            if (detectedLang) {
              setSourceLanguage(detectedLang);
              setAutoDetectedLanguage(true);
              console.log(`Auto-detected language: ${detectedLang} (${getLanguageName(detectedLang)})`);
            }
          } catch (error) {
            console.error('Language detection failed:', error);
          }
        }
      };
      reader.readAsText(newFile);
    }
  }, [extractTextFromPdf]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !worker.current || !modelReady) return

    if (!documentContent || documentContent.trim().length === 0) {
      alert('El archivo seleccionado parece estar vacío o no se pudo leer correctamente');
      return;
    }

    const newSessionId = uuidv4()
    console.log(`Starting translation with sessionId: ${newSessionId}`);
    setSessionId(newSessionId)
    setShowProgress(true)
    setLoading(true)
    setCurrentProgress(0)
    setProcessedSentences(0)
    setTotalSentences(0)
    
    try {
      worker.current.postMessage({
        text: documentContent,
        src_lang: sourceLanguage,
        tgt_lang: targetLanguage,
        includePhonetics: includePhonetics,
        pageRange: enablePageRange ? pageRange : null,
      });
    } catch (error) {
      console.error('Translation error:', error)
      alert('Error durante la traducción')
      setLoading(false)
      setShowProgress(false)
    }
  }
  
  const handleCancelTranslation = useCallback(() => {
    if (worker.current) {
      worker.current.terminate();
      worker.current = new Worker(new URL('../components/worker.ts', import.meta.url), { type: 'module' });
      setLoading(false);
      setShowProgress(false);
      console.log('Translation cancelled');
    }
  }, []);

  const handleManualLanguageOverride = useCallback(() => {
    setAutoDetectedLanguage(false);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full px-6 py-8 bg-white bg-opacity-5 rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold mb-2 text-center">Leengua</h1>
        <p className="text-gray-300 mb-6 text-center">
          Traduce documentos con texto original y traducción intercalados para aprender idiomas
        </p>
        
        {modelReady === false && (
          <div className="mb-6 p-3 bg-yellow-500 bg-opacity-20 rounded-md text-sm">
            <p className="font-medium">⏳ Cargando modelo de traducción...</p>
            <p className="mt-1">Este proceso solo ocurre la primera vez.</p>
            
            {progressItems.map(data => (
              <div key={data.file} className="mt-2">
                <div className="text-xs">{data.file}</div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${data.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mb-6 p-3 bg-blue-500 bg-opacity-20 rounded-md text-sm">
          <p className="font-medium">✨ Novedades:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Procesamiento por frases en lugar de líneas</li>
            <li>Textos en colores diferentes para mejor lectura</li>
            <li>Seguimiento del progreso de la traducción en tiempo real</li>
            <li>Ahora puedes arrastrar y soltar archivos</li>
            <li><span className="font-semibold text-green-400">¡NUEVO!</span> Traducción completamente en el navegador</li>
            <li><span className="font-semibold text-green-400">¡NUEVO!</span> No requiere conexión a internet una vez cargado</li>
            <li><span className="font-semibold text-green-400">¡NUEVO!</span> Transcripción fonética opcional</li>
          </ul>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Selecciona un archivo:</label>
            <FileDropZone 
              onFileDrop={handleFileDrop}
              accept=""
              file={file}
              isLoading={pdfExtracting}
            />
            <p className="text-xs text-gray-400 mt-1 text-center">Formatos soportados: TXT, PDF, EPUB, MOBI</p>
          </div>
          
          <div className="mt-4 p-3 bg-gray-800 bg-opacity-40 rounded-md">
            <LanguageSelector
              type="source"
              value={sourceLanguage}
              onChange={setSourceLanguage}
              autoDetected={autoDetectedLanguage}
              onManualOverride={handleManualLanguageOverride}
            />
            
            <LanguageSelector
              type="target"
              value={targetLanguage}
              onChange={setTargetLanguage}
            />
          </div>
          
          <div className="mt-2">
            <details className="text-sm">
              <summary className="cursor-pointer py-2">Opciones avanzadas</summary>
              <div className="pl-4 pt-2 pb-1">
                <div className="flex items-center mb-3">
                  <input
                    id="phonetics"
                    type="checkbox"
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    checked={includePhonetics}
                    onChange={(e) => setIncludePhonetics(e.target.checked)}
                  />
                  <label htmlFor="phonetics" className="ml-2 text-sm font-medium">
                    Incluir transcripción fonética (experimental)
                  </label>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center">
                    <input
                      id="pageRange"
                      type="checkbox"
                      className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      checked={enablePageRange}
                      onChange={(e) => setEnablePageRange(e.target.checked)}
                    />
                    <label htmlFor="pageRange" className="ml-2 text-sm font-medium">
                      Traducir rango específico de páginas
                    </label>
                  </div>
                  
                  {enablePageRange && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs mb-1">Página inicial</label>
                        <input
                          type="number"
                          min="1"
                          value={pageRange.start}
                          onChange={(e) => setPageRange({...pageRange, start: parseInt(e.target.value) || 1})}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Página final</label>
                        <input
                          type="number"
                          min={pageRange.start}
                          value={pageRange.end}
                          onChange={(e) => setPageRange({...pageRange, end: parseInt(e.target.value) || pageRange.start})}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
          
          <button 
            type="submit" 
            disabled={!file || loading || modelReady === false}
            className={`mt-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
              !file || loading || modelReady === false
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Traduciendo...
              </span>
            ) : modelReady === false ? (
              'Cargando modelo...'
            ) : (
              'Traducir documento'
            )}
          </button>
        </form>
        
        {showProgress && (
          <TranslationProgress
            progress={currentProgress}
            totalSentences={totalSentences}
            processedSentences={processedSentences}
            onCancel={handleCancelTranslation}
          />
        )}
        
        {downloadUrl && (
          <div className="mt-6 text-center">
            <a 
              href={downloadUrl} 
              download={`translated_${file?.name.split('.')[0] || 'document'}.html`}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Descargar documento traducido
            </a>
            <p className="text-xs text-gray-400 mt-2">
              El documento se guarda en formato HTML y puede abrirse en cualquier navegador.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
