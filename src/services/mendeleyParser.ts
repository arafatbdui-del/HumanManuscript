/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mendeley Reference Integration & Parser (.bib, .ris, Mendeley JSON)
 */

import { Source, LegalSourceKind } from '../types/manuscript';
import { formatOscolaCitation } from './citationEngine';

/**
 * Parses Mendeley BibTeX (.bib) file or string into Source objects
 */
export function parseMendeleyBibTeX(bibtexString: string): Source[] {
  const sources: Source[] = [];
  // Regex to split into bib entries: @type{id, ...}
  const entryRegex = /@(\w+)\s*\{\s*([^,]+),([\s\S]*?)(?=\n@|\s*$)/g;
  let match;

  while ((match = entryRegex.exec(bibtexString)) !== null) {
    const rawType = match[1].toLowerCase();
    const citeKey = match[2].trim();
    const body = match[3];

    const fields: Record<string, string> = {};
    const fieldRegex = /([a-zA-Z_]+)\s*=\s*[{"]([\s\S]*?)[}"]|([a-zA-Z_]+)\s*=\s*(\d+)/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const key = (fieldMatch[1] || fieldMatch[3]).toLowerCase();
      const val = (fieldMatch[2] !== undefined ? fieldMatch[2] : fieldMatch[4]).replace(/\s+/g, ' ').trim();
      fields[key] = val;
    }

    // Determine legal source kind
    let kind: LegalSourceKind = 'journal-article';
    if (rawType.includes('book') || rawType === 'incollection') {
      kind = 'book-chapter';
    } else if (rawType.includes('misc') || rawType.includes('techreport')) {
      kind = 'report';
    } else if (rawType.includes('legis') || rawType.includes('statute')) {
      kind = 'statute';
    } else if (rawType.includes('juris') || rawType.includes('case')) {
      kind = 'case';
    }

    const title = fields.title || citeKey;
    const authors = fields.author
      ? fields.author.split(/\s+and\s+/i).map(a => a.trim().replace(/^\{+|\}+$/g, ''))
      : ['Mendeley Author'];
    const year = fields.year || new Date().getFullYear().toString();
    const publication = fields.journal || fields.booktitle || fields.publisher || fields.institution || '';
    const volume = fields.volume || '';
    const issue = fields.number || fields.issue || '';
    const pages = fields.pages ? fields.pages.replace(/--/g, '–') : '';
    const doi = fields.doi || '';
    const url = fields.url || '';

    const newSource: Source = {
      id: `mendeley_${citeKey.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now().toString().slice(-4)}`,
      kind,
      title,
      authors,
      year,
      publication: publication || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
      doi: doi || undefined,
      url: url || undefined,
      verification: 'confirmed',
      tags: ['mendeley-import', rawType],
      citationString: '',
    };

    newSource.citationString = formatOscolaCitation(newSource);
    sources.push(newSource);
  }

  return sources;
}

/**
 * Parses Mendeley RIS (.ris) export format into Source objects
 */
export function parseMendeleyRIS(risString: string): Source[] {
  const sources: Source[] = [];
  const entries = risString.split(/ER\s*-\s*\n/);

  for (const entry of entries) {
    if (!entry.trim()) continue;

    const lines = entry.split(/\r?\n/);
    let kind: LegalSourceKind = 'journal-article';
    let title = '';
    const authors: string[] = [];
    let year = '';
    let publication = '';
    let volume = '';
    let issue = '';
    let startPage = '';
    let endPage = '';
    let doi = '';
    let url = '';

    for (const line of lines) {
      const tagMatch = line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
      if (!tagMatch) continue;

      const tag = tagMatch[1];
      const val = tagMatch[2].trim();

      switch (tag) {
        case 'TY':
          if (val === 'BOOK' || val === 'CHAP') kind = 'book-chapter';
          else if (val === 'CASE') kind = 'case';
          else if (val === 'STAT') kind = 'statute';
          else if (val === 'RPRT') kind = 'report';
          break;
        case 'TI':
        case 'T1':
          title = val;
          break;
        case 'AU':
        case 'A1':
          authors.push(val);
          break;
        case 'PY':
        case 'Y1':
          year = val.slice(0, 4);
          break;
        case 'JO':
        case 'T2':
        case 'JF':
          publication = val;
          break;
        case 'VL':
          volume = val;
          break;
        case 'IS':
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
          url = val;
          break;
      }
    }

    if (title) {
      const pages = startPage && endPage ? `${startPage}–${endPage}` : startPage || endPage;
      const newSource: Source = {
        id: `mendeley_ris_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        kind,
        title,
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        year: year || new Date().getFullYear().toString(),
        publication: publication || undefined,
        volume: volume || undefined,
        issue: issue || undefined,
        pages: pages || undefined,
        doi: doi || undefined,
        url: url || undefined,
        verification: 'confirmed',
        tags: ['mendeley-ris-import'],
        citationString: '',
      };

      newSource.citationString = formatOscolaCitation(newSource);
      sources.push(newSource);
    }
  }

  return sources;
}

/**
 * Exports current manuscript verified sources to Mendeley-compatible BibTeX
 */
export function exportToMendeleyBibTeX(sources: Source[]): string {
  let bib = `% Mendeley BibTeX Export from HumanManuscript Studio\n% Generated: ${new Date().toISOString()}\n\n`;

  for (const s of sources) {
    const safeKey = `${(s.authors[0]?.split(' ').pop() || 'Ref')}${s.year}`;
    let type = 'article';
    if (s.kind === 'book-chapter') type = 'book';
    else if (s.kind === 'case') type = 'jurisdiction';
    else if (s.kind === 'statute' || s.kind === 'treaty') type = 'legislation';
    else if (s.kind === 'report' || s.kind === 'un-document') type = 'techreport';

    bib += `@${type}{${safeKey},\n`;
    bib += `  title = {${s.title}},\n`;
    bib += `  author = {${s.authors.join(' and ')}},\n`;
    bib += `  year = {${s.year}},\n`;
    if (s.publication) bib += `  journal = {${s.publication}},\n`;
    if (s.volume) bib += `  volume = {${s.volume}},\n`;
    if (s.issue) bib += `  number = {${s.issue}},\n`;
    if (s.pages) bib += `  pages = {${s.pages}},\n`;
    if (s.doi) bib += `  doi = {${s.doi}},\n`;
    if (s.url) bib += `  url = {${s.url}},\n`;
    bib += `}\n\n`;
  }

  return bib;
}

/**
 * Exports to Mendeley RIS format
 */
export function exportToMendeleyRIS(sources: Source[]): string {
  let ris = '';
  for (const s of sources) {
    ris += `TY  - ${s.kind === 'book-chapter' ? 'BOOK' : s.kind === 'case' ? 'CASE' : 'JOUR'}\n`;
    ris += `TI  - ${s.title}\n`;
    for (const au of s.authors) {
      ris += `AU  - ${au}\n`;
    }
    ris += `PY  - ${s.year}\n`;
    if (s.publication) ris += `JO  - ${s.publication}\n`;
    if (s.volume) ris += `VL  - ${s.volume}\n`;
    if (s.issue) ris += `IS  - ${s.issue}\n`;
    if (s.pages) {
      const parts = s.pages.split(/[-–]/);
      if (parts[0]) ris += `SP  - ${parts[0].trim()}\n`;
      if (parts[1]) ris += `EP  - ${parts[1].trim()}\n`;
    }
    if (s.doi) ris += `DO  - ${s.doi}\n`;
    if (s.url) ris += `UR  - ${s.url}\n`;
    ris += `ER  - \n\n`;
  }
  return ris;
}
