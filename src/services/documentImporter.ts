/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Document Importer (.docx, .txt, .md, pasted text)
 */

import mammoth from 'mammoth';
import { Section, Block, Manuscript } from '../types/manuscript';

export interface ImportResult {
  title: string;
  sections: Section[];
}

/**
 * Extracts plain text and paragraph blocks from an ArrayBuffer (Word .docx)
 */
export async function parseDocxFile(arrayBuffer: ArrayBuffer, fileName = 'Imported Document'): Promise<ImportResult> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const fullText = result.value;
    return parseRawTextToSections(fullText, fileName.replace(/\.[^/.]+$/, ''));
  } catch (err) {
    console.error('Failed to parse docx with mammoth:', err);
    throw new Error('Unable to extract content from .docx file. Please check file integrity.');
  }
}

/**
 * Parses raw text (from .txt, .md, or paste) into structured manuscript sections and paragraphs
 */
export function parseRawTextToSections(text: string, defaultTitle = 'Imported Article'): ImportResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let docTitle = defaultTitle;
  if (lines.length > 0 && lines[0].length < 180 && !lines[0].toLowerCase().startsWith('abstract')) {
    docTitle = lines[0].replace(/^#+\s*/, '');
  }

  // Split text into sections based on headings like "1. Introduction", "Section 2", "## Heading", etc.
  const rawSections: { title: string; role: string; paragraphs: string[] }[] = [];
  let currentSection = {
    title: '1. Introduction',
    role: 'Introduction',
    paragraphs: [] as string[],
  };

  const isHeading = (line: string): boolean => {
    return (
      /^(\d+[\.\)]\s+[A-Z]|Section\s+\d+|[IVXLCDM]+[\.\)]\s+[A-Z]|#+\s+|[A-Z\s]{4,40}$)/i.test(line) &&
      line.length < 90
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // If title line, skip
    if (i === 0 && line === docTitle) continue;

    if (isHeading(line)) {
      if (currentSection.paragraphs.length > 0) {
        rawSections.push(currentSection);
      }
      const cleanTitle = line.replace(/^#+\s*/, '');
      currentSection = {
        title: cleanTitle,
        role: determineRoleFromTitle(cleanTitle),
        paragraphs: [],
      };
    } else {
      currentSection.paragraphs.push(line);
    }
  }

  if (currentSection.paragraphs.length > 0) {
    rawSections.push(currentSection);
  }

  // If no sections were identified, put everything into one or two sections
  if (rawSections.length === 0) {
    rawSections.push({
      title: '1. Manuscript Body',
      role: 'Analysis',
      paragraphs: lines.slice(1).length > 0 ? lines.slice(1) : ['Start drafting your manuscript here...'],
    });
  }

  // Transform into full Section objects with contracts and blocks
  const sections: Section[] = rawSections.map((raw, idx) => {
    const secId = `sec_imported_${idx + 1}_${Date.now()}`;
    const wordCount = raw.paragraphs.join(' ').match(/\b\w+\b/g)?.length || 300;

    const blocks: Block[] = raw.paragraphs.map((p, pIdx) => ({
      id: `blk_imp_${idx}_${pIdx}_${Date.now()}`,
      sectionId: secId,
      order: pIdx + 1,
      type: 'paragraph',
      content: p,
    }));

    return {
      id: secId,
      manuscriptId: 'imported',
      order: idx + 1,
      role: raw.role,
      title: raw.title,
      wordTarget: Math.max(500, Math.round(wordCount * 1.1)),
      status: 'drafting',
      contract: {
        role: raw.role,
        description: `Contract for ${raw.title}. Preserves primary authority and word target.`,
        wordTarget: Math.max(500, Math.round(wordCount * 1.1)),
        wordTolerance: 100,
        requiredMoves: ['claim', 'authority', 'reasoning'],
        citationRules: ['Cite primary instruments or case law upon first mention.'],
      },
      blocks,
    };
  });

  return {
    title: docTitle,
    sections,
  };
}

function determineRoleFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('abstract')) return 'Abstract';
  if (t.includes('intro')) return 'Introduction';
  if (t.includes('theory') || t.includes('framework') || t.includes('normative')) return 'Theoretical Framework';
  if (t.includes('background') || t.includes('history')) return 'Legal & Historical Background';
  if (t.includes('analysis') || t.includes('doctrinal') || t.includes('legality')) return 'Analysis';
  if (t.includes('proportionality') || t.includes('necessity')) return 'Analysis (Proportionality)';
  if (t.includes('discussion') || t.includes('counter')) return 'Discussion';
  if (t.includes('conclusion') || t.includes('recommend')) return 'Conclusion & Recommendations';
  if (t.includes('biblio') || t.includes('reference') || t.includes('table of')) return 'Bibliography';
  return 'Substantive Section';
}
