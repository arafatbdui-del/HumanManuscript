/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Document Parser Service: DOCX (via Mammoth), PDF (via PDF.js), and TXT
 */

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker safely for Vite / PWA offline & online
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  // Use a reliable worker URL or bundle
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export interface ParsedDocumentResult {
  title: string;
  htmlContent: string;
  plainText: string;
  fileType: 'docx' | 'pdf' | 'txt';
  wordCount: number;
}

/**
 * Parses an uploaded .docx, .pdf, or .txt file into clean HTML for TipTap
 */
export async function parseUploadedDocument(file: File): Promise<ParsedDocumentResult> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'docx') {
    return parseDocxFile(file);
  } else if (ext === 'pdf') {
    return parsePdfFile(file);
  } else if (ext === 'txt' || ext === 'md') {
    return parseTxtFile(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Supported formats are .docx, .pdf, and .txt.`);
  }
}

async function parseDocxFile(file: File): Promise<ParsedDocumentResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Custom style map to ensure headings, quotes, and italics map cleanly
  const options = {
    arrayBuffer,
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => p.subtitle:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='Footnote Text'] => p.footnote:fresh",
      "r[style-name='Footnote Reference'] => sup",
    ],
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  let html = result.value;

  if (!html || html.trim() === '') {
    // Fallback to raw text extraction if HTML mapping is empty
    const rawResult = await mammoth.extractRawText({ arrayBuffer });
    html = rawResult.value
      .split('\n\n')
      .map(para => `<p>${escapeHtml(para.trim())}</p>`)
      .join('');
  }

  const plainText = stripHtml(html);
  const wordCount = countWords(plainText);

  return {
    title: file.name.replace(/\.[^/.]+$/, ''),
    htmlContent: html,
    plainText,
    fileType: 'docx',
    wordCount,
  };
}

async function parsePdfFile(file: File): Promise<ParsedDocumentResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group items into lines based on vertical position
    let lastY: number | null = null;
    let pageStr = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageStr += '\n';
        } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
          pageStr += ' ';
        }
        pageStr += item.str;
        lastY = item.transform[5];
      }
    }

    if (pageStr.trim()) {
      pageTexts.push(pageStr.trim());
    }
  }

  // Join pages into clean paragraph HTML
  const allText = pageTexts.join('\n\n');
  const paragraphs = allText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const html = paragraphs
    .map((p, idx) => {
      const clean = p.replace(/\s+/g, ' ').trim();
      // Detect potential headings: short line ending without period
      if (clean.length < 70 && !clean.endsWith('.') && idx < 5) {
        return `<h2>${escapeHtml(clean)}</h2>`;
      }
      return `<p>${escapeHtml(clean)}</p>`;
    })
    .join('');

  return {
    title: file.name.replace(/\.[^/.]+$/, ''),
    htmlContent: html,
    plainText: allText,
    fileType: 'pdf',
    wordCount: countWords(allText),
  };
}

async function parseTxtFile(file: File): Promise<ParsedDocumentResult> {
  const text = await file.text();
  const paragraphs = text.split(/\r?\n\r?\n/).filter(p => p.trim().length > 0);
  
  const html = paragraphs
    .map(p => `<p>${escapeHtml(p.trim().replace(/\r?\n/g, '<br />'))}</p>`)
    .join('');

  return {
    title: file.name.replace(/\.[^/.]+$/, ''),
    htmlContent: html,
    plainText: text,
    fileType: 'txt',
    wordCount: countWords(text),
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  return html.replace(/<[^>]*>?/gm, '');
}

function countWords(text: string): number {
  const matches = text.trim().match(/\b[\w'-]+\b/g);
  return matches ? matches.length : 0;
}
