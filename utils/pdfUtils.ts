'use client'

// Import PDF.js only on the client side
let pdfjsLib: any = null;

// Initialize PDF.js dynamically only in browser environment
async function initPdfLib() {
  if (typeof window === 'undefined') return null;
  
  if (!pdfjsLib) {
    try {
      // Import the main PDF.js library
      const pdfjs = await import('pdfjs-dist');
      pdfjsLib = pdfjs;
      
      // Import the worker directly
      try {
        // Use worker directly from the package
        // Use type assertion to avoid TypeScript errors
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs') as any;
        
        // Create a blob URL for the worker
        const workerBlob = new Blob(
          [worker.default || worker], 
          { type: 'application/javascript' }
        );
        const workerBlobUrl = URL.createObjectURL(workerBlob);
        
        // Set the worker source to our blob URL
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerBlobUrl;
        console.log('PDF.js initialized with local worker blob');
      } catch (workerError) {
        console.error('Failed to load worker directly, falling back to CDN:', workerError);
        // Fallback to jsdelivr CDN which is more reliable
        const workerVersion = pdfjs.version;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.js`;
        console.log(`PDF.js initialized with worker version ${workerVersion} from jsDelivr`);
      }
    } catch (error) {
      console.error('Failed to initialize PDF.js:', error);
      return null;
    }
  }
  
  return pdfjsLib;
}

export async function extractTextFromPdf(file: File): Promise<string> {
  // Make sure PDF.js is initialized
  const pdfjs = await initPdfLib();
  
  if (!pdfjs) {
    throw new Error('PDF.js could not be initialized');
  }
  
  try {
    // Load the PDF file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Get the total number of pages
    const numPages = pdf.numPages;
    console.log(`PDF has ${numPages} pages`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n\n--- Page ${i} ---\n\n${pageText}`;
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Could not extract text from PDF: ' + (error instanceof Error ? error.message : String(error)));
  }
}

