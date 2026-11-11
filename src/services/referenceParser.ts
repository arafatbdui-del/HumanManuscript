/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mendeley & Zotero Reference Parser (.bib BibTeX & .ris) + Citation Inserter
 */

import { LegalSourceKind, Source } from '../types/manuscript';
import { formatOscolaCitation } from './citationEngine';

export interface ParsedReferenceResult {
  sources: Source[];
  format: 'bibtex' | 'ris' | 'unknown';
  count: number;
}

/**
 * Parses an imported file (.bib or .ris) exported from Mendeley, Zotero, or Google Scholar
 */
export async function parseReferenceFile(file: File): Promise<ParsedReferenceResult> {
  const text = await file.text();
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'bib' || text.includes('@') && text.includes('{')) {
    const sources = parseBibTeX(text);
    return { sources, format: 'bibtex', count: sources.length };
  } else if (ext === 'ris' || text.includes('TY  -') || text.includes('TY -')) {
    const sources = parseRIS(text);
    return { sources, format: 'ris', count: sources.length };
  } else {
    // Attempt auto-detection
    if (text.includes('@')) {
      const sources = parseBibTeX(text);
      if (sources.length > 0) return { sources, format: 'bibtex', count: sources.length };
    }
    const sources = parseRIS(text);
    return { sources, format: 'ris', count: sources.length };
  }
}

/**
 * Robust BibTeX Parser
 */
export function parseBibTeX(bibText: string): Source[] {
  const sources: Source[] = [];
  // Regex to match BibTeX entries: @type{key, ...fields...}
  const entryRegex = /@(\w+)\s*\{\s*([^,]+),([\s\S]*?)(?=\n@|\s*$)/g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(bibText)) !== null) {
    const rawType = match[1].toLowerCase();
    const citeKey = match[2].trim();
    const body = match[3];

    const fields = parseBibTeXFields(body);

    const title = cleanBibValue(fields.title || fields.booktitle || citeKey);
    const rawAuthors = cleanBibValue(fields.author || fields.editor || 'Unknown Author');
    const authors = rawAuthors
      .split(/\s+and\s+/i)
      .map(formatBibAuthor)
      .filter(Boolean);

    const year = cleanBibValue(fields.year || fields.date || '').match(/\d{4}/)?.[0] || 'n.d.';
    const publication = cleanBibValue(fields.journal || fields.publisher || fields.booktitle || fields.institution || '');
    const volume = cleanBibValue(fields.volume || '');
    const issue = cleanBibValue(fields.number || fields.issue || '');
    const pages = cleanBibValue(fields.pages || '');
    const doi = cleanBibValue(fields.doi || '');
    const url = cleanBibValue(fields.url || '');

    const kind: LegalSourceKind = mapBibTypeToSourceKind(rawType);

    const src: Source = {
      id: `mendeley_${citeKey.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now().toString(36).slice(-4)}`,
      kind,
      title,
      authors: authors.length > 0 ? authors : ['Unknown'],
      year,
      publication: publication || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
      doi: doi || undefined,
      url: url || undefined,
      verification: 'confirmed',
      notes: `Imported from Mendeley/BibTeX key: ${citeKey}`,
      tags: ['mendeley', rawType],
      citationString: '',
    };

    src.citationString = formatOscolaCitation(src);
    sources.push(src);
  }

  return sources;
}

function parseBibTeXFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  // Match key = {value} or key = "value" or key = 123
  const fieldRegex = /([a-zA-Z_-]+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)"|([0-9a-zA-Z_-]+))\s*(?:,|$)/g;
  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(body)) !== null) {
    const key = match[1].toLowerCase().trim();
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    fields[key] = val.trim();
  }

  return fields;
}

function cleanBibValue(val: string): string {
  if (!val) return '';
  return val
    .replace(/[\{\}]/g, '')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\_/g, '_')
    .replace(/\\textbf\{([^}]+)\}/g, '$1')
    .replace(/\\textit\{([^}]+)\}/g, '$1')
    .replace(/\\emph\{([^}]+)\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBibAuthor(author: string): string {
  const cleaned = cleanBibValue(author);
  if (cleaned.includes(',')) {
    // "Lastname, Firstname" => "Firstname Lastname"
    const [last, first] = cleaned.split(',').map(s => s.trim());
    return `${first} ${last}`.trim();
  }
  return cleaned;
}

function mapBibTypeToSourceKind(type: string): LegalSourceKind {
  switch (type) {
    case 'article':
      return 'journal-article';
    case 'book':
    case 'booklet':
    case 'inbook':
    case 'incollection':
    case 'inproceedings':
      return 'book-chapter';
    case 'legislation':
    case 'statute':
      return 'statute';
    case 'jurisdiction':
    case 'case':
    case 'court':
      return 'case';
    case 'un':
    case 'treaty':
      return 'treaty';
    case 'techreport':
    case 'report':
      return 'report';
    case 'misc':
    case 'online':
    case 'webpage':
      return 'news-web';
    default:
      return 'journal-article';
  }
}

/**
 * Robust RIS (Research Information Systems) Parser for Mendeley & Zotero
 */
export function parseRIS(risText: string): Source[] {
  const sources: Source[] = [];
  const lines = risText.split(/\r?\n/);

  let currentType = '';
  let title = '';
  let authors: string[] = [];
  let year = '';
  let publication = '';
  let volume = '';
  let issue = '';
  let startPage = '';
  let endPage = '';
  let doi = '';
  let url = '';
  let notes = '';

  const resetEntry = () => {
    currentType = '';
    title = '';
    authors = [];
    year = '';
    publication = '';
    volume = '';
    issue = '';
    startPage = '';
    endPage = '';
    doi = '';
    url = '';
    notes = '';
  };

  const finalizeEntry = () => {
    if (!title && authors.length === 0) return;

    let pages = '';
    if (startPage && endPage) pages = `${startPage}-${endPage}`;
    else if (startPage) pages = startPage;

    const kind: LegalSourceKind = mapRisTypeToSourceKind(currentType);

    const src: Source = {
      id: `ris_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      kind,
      title: title || 'Untitled Record',
      authors: authors.length > 0 ? authors : ['Unknown'],
      year: year || 'n.d.',
      publication: publication || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
      doi: doi || undefined,
      url: url || undefined,
      notes: notes || `Imported from Mendeley RIS (${currentType || 'GEN'})`,
      verification: 'confirmed',
      tags: ['mendeley', 'ris', currentType.toLowerCase()],
      citationString: '',
    };

    src.citationString = formatOscolaCitation(src);
    sources.push(src);
    resetEntry();
  };

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Match RIS Tag: "TY  - JOUR" or "AU  - Smith, John"
    const match = line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
    if (!match) continue;

    const tag = match[1];
    const val = match[2].trim();

    switch (tag) {
      case 'TY':
        currentType = val;
        break;
      case 'TI':
      case 'T1':
      case 'CT':
        if (!title) title = val;
        break;
      case 'AU':
      case 'A1':
      case 'A2':
      case 'ED':
        authors.push(formatBibAuthor(val));
        break;
      case 'PY':
      case 'Y1':
      case 'DA':
        const yMatch = val.match(/\d{4}/);
        if (yMatch) year = yMatch[0];
        break;
      case 'JO':
      case 'JF':
      case 'JA':
      case 'T2':
      case 'PB':
        if (!publication) publication = val;
        break;
      case 'VL':
        volume = val;
        break;
      case 'IS':
      case 'CP':
        issue = val;
        break;
      case 'SP':
        startPage = val;
        break;
      case 'EP':
        endPage = val;
        break;
      case 'DO':
        doi = val;
        break;
      case 'UR':
      case 'L1':
      case 'LK':
        url = val;
        break;
      case 'N1':
      case 'AB':
        notes = val;
        break;
      case 'ER':
        finalizeEntry();
        break;
    }
  }

  // Final check if no trailing ER tag
  if (title || authors.length > 0) {
    finalizeEntry();
  }

  return sources;
}

function mapRisTypeToSourceKind(risType: string): LegalSourceKind {
  switch (risType.toUpperCase()) {
    case 'JOUR':
    case 'EJOUR':
    case 'MGZN':
      return 'journal-article';
    case 'BOOK':
    case 'CHAP':
    case 'SER':
      return 'book-chapter';
    case 'STAT':
    case 'LEGL':
    case 'BILL':
      return 'statute';
    case 'CASE':
    case 'HEAR':
      return 'case';
    case 'RPRT':
    case 'GOVDOC':
      return 'report';
    case 'ELEC':
    case 'WEB':
    case 'NEWS':
      return 'news-web';
    default:
      return 'journal-article';
  }
}

/**
 * Citation Formatter for In-Text and Footnote Insertion
 */
export function formatCitationForEditor(
  source: Source,
  style: 'in-text-author-year' | 'in-text-numeric' | 'oscola-footnote' | 'apa' = 'oscola-footnote',
  indexNumber = 1,
  pinpoint?: string
): string {
  const authorLastName = source.authors[0]
    ? source.authors[0].split(' ').pop() || source.authors[0]
    : 'Unknown';

  const multiAuthor = source.authors.length === 2
    ? `${authorLastName} and ${source.authors[1].split(' ').pop()}`
    : source.authors.length > 2
    ? `${authorLastName} et al.`
    : authorLastName;

  switch (style) {
    case 'in-text-author-year':
      return pinpoint
        ? `(${multiAuthor}, ${source.year}: ${pinpoint})`
        : `(${multiAuthor}, ${source.year})`;
    case 'in-text-numeric':
      return `[${indexNumber}]`;
    case 'apa':
      return `${multiAuthor} (${source.year})`;
    case 'oscola-footnote':
    default:
      return `[fn${indexNumber}]`;
  }
}
