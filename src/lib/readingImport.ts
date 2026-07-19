/* OCR + PDF import — web equivalents of ReadingOCRService (Vision →
   Tesseract.js) and ReadingPDFImportService (PDFKit → pdf.js). Both libs are
   heavy, so they load via dynamic import() only when actually used. The
   interface matches iOS: extract → plain text, throw on no text. */

export class ReadingImportError extends Error {
  code: 'invalidImage' | 'recognitionFailed' | 'noTextFound' | 'unsupported';
  constructor(code: ReadingImportError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/** Photo → text via Tesseract.js (iOS: Vision accurate + language correction). */
export const extractTextFromImage = async (
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new ReadingImportError('invalidImage', 'Not an image file');
  }
  let text: string;
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: onProgress
        ? (m) => {
            if (m.status === 'recognizing text') onProgress(m.progress);
          }
        : undefined,
    });
    try {
      const result = await worker.recognize(file);
      text = result.data.text;
    } finally {
      await worker.terminate();
    }
  } catch {
    throw new ReadingImportError('recognitionFailed', 'Text recognition failed');
  }
  const cleaned = text.trim();
  if (cleaned.length === 0) {
    throw new ReadingImportError('noTextFound', 'No text found in the image');
  }
  return cleaned;
};

/** PDF → text via pdf.js (iOS: PDFKit page strings joined with \n\n). */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new ReadingImportError('unsupported', 'Not a PDF file');
  }
  let pages: string[];
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();
      if (pageText.length > 0) pages.push(pageText);
    }
  } catch {
    throw new ReadingImportError('unsupported', 'Could not read this PDF');
  }
  const joined = pages.join('\n\n').trim();
  if (joined.length === 0) {
    throw new ReadingImportError('noTextFound', 'No text found in the PDF');
  }
  return joined;
};
