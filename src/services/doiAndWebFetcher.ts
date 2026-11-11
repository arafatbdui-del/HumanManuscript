/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DOI, Web URL, and Paste-based Reference Fetcher & Parser
 * Supports Crossref API, URL metadata extraction, raw citation parsing, and manual entry.
 */

import { LegalSourceKind, Source } from '../types/manuscript';
import { formatOscolaCitation } from './citationEngine';
import { parseBibTeX, parseRIS } from './referenceParser';

export interface ManualSourceInput {
  title: string;
  authors: string;
  year: string | number;
  publication?: string;
  doi?: string;
  url?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  kind?: LegalSourceKind;
  stylePreference?: 'oscola' | 'apa';
}

/**
 * Extracts DOI from any string (URL, raw DOI, doi: prefix, etc.)
 */
export function extractDoi(input: string): string | null {
  const clean = input.trim();
  // Standard DOI pattern: 10.xxxx/...
  const match = clean.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
  if (match) {
    // Strip trailing punctuation like full stop, bracket or comma if accidentally captured
    return match[1].replace(/[.,;)]+$/, '');
  }
  return null;
}

/**
 * Validates if string looks like an HTTP/HTTPS URL
 */
export function isHttpUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetches scholarly metadata from Crossref API (https://api.crossref.org/works/)
 */
export async function fetchFromCrossref(doi: string): Promise<Source> {
  const cleanDoi = encodeURIComponent(doi.trim());
  const endpoint = `https://api.crossref.org/works/${cleanDoi}`;

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Crossref lookup failed (HTTP ${response.status}) for DOI: ${doi}`);
  }

  const json = await response.json();
  const item = json.message;
  if (!item) {
    throw new Error('No record found for this DOI in Crossref database.');
  }

  const rawTitle = Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled Article';
  const cleanTitle = rawTitle.replace(/<[^>]+>/g, '').trim();

  // Authors
  let authors: string[] = [];
  if (Array.isArray(item.author) && item.author.length > 0) {
    authors = item.author.map((a: { given?: string; family?: string; name?: string }) => {
      if (a.name) return a.name;
      const parts = [a.given, a.family].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : 'Unknown Author';
    });
  } else if (item.publisher) {
    authors = [item.publisher];
  } else {
    authors = ['Unknown Author'];
  }

  // Publication Year
  const year =
    item.issued?.['date-parts']?.[0]?.[0] ||
    item['published-print']?.['date-parts']?.[0]?.[0] ||
    item['published-online']?.['date-parts']?.[0]?.[0] ||
    item.created?.['date-parts']?.[0]?.[0] ||
    new Date().getFullYear();

  // Journal / Publisher
  const publication = Array.isArray(item['container-title'])
    ? item['container-title'][0]
    : item['container-title'] || item.publisher || undefined;

  const volume = item.volume || undefined;
  const issue = item.issue || undefined;
  const pages = item.page || undefined;
  const returnedDoi = item.DOI || doi;
  const url = item.URL || `https://doi.org/${returnedDoi}`;

  // Map Crossref type to LegalSourceKind
  let kind: LegalSourceKind = 'journal-article';
  const crossrefType = item.type || '';
  if (crossrefType.includes('book') || crossrefType.includes('chapter')) {
    kind = 'book-chapter';
  } else if (crossrefType.includes('report')) {
    kind = 'report';
  } else if (crossrefType.includes('standard') || crossrefType.includes('dataset')) {
    kind = 'report';
  }

  const src: Source = {
    id: `doi_${returnedDoi.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now().toString(36).slice(-4)}`,
    kind,
    title: cleanTitle,
    authors,
    year: Number(year) || year,
    publication,
    volume,
    issue,
    pages,
    doi: returnedDoi,
    url,
    verification: 'confirmed',
    notes: `Imported via Crossref DOI: ${returnedDoi}`,
    tags: ['crossref', 'doi', kind],
    citationString: '',
  };

  src.citationString = formatOscolaCitation(src);
  return src;
}

/**
 * Web Importer: Extracts metadata from a website URL
 */
export async function fetchWebMetadata(urlStr: string): Promise<Source> {
  const trimmed = urlStr.trim();
  const urlObj = new URL(trimmed);

  // Check if the URL is actually a DOI link (e.g. doi.org/10.xxxx)
  const potentialDoi = extractDoi(trimmed);
  if (potentialDoi && trimmed.includes('doi.org')) {
    return await fetchFromCrossref(potentialDoi);
  }

  // Domain & Site Name extraction
  const domain = urlObj.hostname.replace(/^www\./, '');
  let siteName = domain.split('.')[0];
  siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);

  // Common institutional domain names
  if (domain.includes('un.org') || domain.includes('ohchr.org')) {
    siteName = 'United Nations';
  } else if (domain.includes('echr.coe.int') || domain.includes('coe.int')) {
    siteName = 'Council of Europe / ECtHR';
  } else if (domain.includes('gov.uk')) {
    siteName = 'UK Government Legislation';
  } else if (domain.includes('europa.eu')) {
    siteName = 'European Union';
  } else if (domain.includes('icj-cij.org')) {
    siteName = 'International Court of Justice';
  } else if (domain.includes('wikipedia.org')) {
    siteName = 'Wikipedia';
  }

  // Derive human-readable title from pathname
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1] || '';
  let derivedTitle = lastPart
    .replace(/[-_]+/g, ' ')
    .replace(/\.(html|php|aspx|jsp)$/, '')
    .trim();

  if (derivedTitle) {
    // Title Case
    derivedTitle = derivedTitle
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } else {
    derivedTitle = `${siteName} Online Portal`;
  }

  // Check if year is in the path
  const yearMatch = trimmed.match(/\b(20\d\d|19\d\d)\b/);
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear();

  const accessDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const src: Source = {
    id: `web_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36).slice(-4)}`,
    kind: 'news-web',
    title: derivedTitle,
    authors: [siteName],
    year,
    publication: domain,
    url: trimmed,
    accessedDate: accessDate,
    verification: 'confirmed',
    notes: `Imported from Web URL (${domain}) on ${accessDate}`,
    tags: ['web', domain],
    citationString: `${siteName}, '${derivedTitle}' (${domain}, ${year}) <${trimmed}> accessed ${accessDate}`,
  };

  return src;
}

/**
 * Universal Reference Importer:
 * Automatically detects whether input is:
 * 1. A DOI (fetches from Crossref)
 * 2. A Web URL (extracts web metadata)
 * 3. BibTeX raw string (parses @article...)
 * 4. RIS raw string (parses TY  - ...)
 * 5. Raw citation text (parses author, year, title)
 */
export async function parsePastedReference(input: string): Promise<Source[]> {
  const text = input.trim();
  if (!text) return [];

  // 1. Check for DOI
  const doi = extractDoi(text);
  if (doi) {
    try {
      const src = await fetchFromCrossref(doi);
      return [src];
    } catch (err) {
      // If Crossref fails, fallback to creating a basic DOI source
      console.warn('Crossref fetch failed, creating fallback DOI source:', err);
      const fallbackSrc: Source = {
        id: `doi_${doi.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now().toString(36).slice(-4)}`,
        kind: 'journal-article',
        title: `Scholarly Publication (DOI: ${doi})`,
        authors: ['Author / Research Team'],
        year: new Date().getFullYear(),
        doi,
        url: `https://doi.org/${doi}`,
        verification: 'unverified',
        notes: `Imported via DOI: ${doi}`,
        tags: ['doi'],
        citationString: `Author, 'Scholarly Publication' (${new Date().getFullYear()}) https://doi.org/${doi}`,
      };
      return [fallbackSrc];
    }
  }

  // 2. Check for Web URL
  if (isHttpUrl(text) && !text.includes('\n')) {
    const webSrc = await fetchWebMetadata(text);
    return [webSrc];
  }

  // 3. Check for BibTeX
  if (text.includes('@') && text.includes('{')) {
    const bibSources = parseBibTeX(text);
    if (bibSources.length > 0) return bibSources;
  }

  // 4. Check for RIS
  if (text.includes('TY  -') || text.includes('TY -')) {
    const risSources = parseRIS(text);
    if (risSources.length > 0) return risSources;
  }

  // 5. Raw citation text parser
  // Example: "Hart HLA, The Concept of Law (2nd edn, OUP 1994)"
  // Example: "Jane Doe and John Smith (2022). Title of Article. Journal of Law, 12(3), 45-67."
  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear();

  let authors = ['Unknown Author'];
  let title = text;

  // Try splitting by comma, colon, or parenthesis
  if (text.includes(',')) {
    const firstComma = text.indexOf(',');
    authors = [text.substring(0, firstComma).trim()];
    title = text.substring(firstComma + 1).trim();
  } else if (yearMatch && text.indexOf(yearMatch[0]) > 0) {
    const yearIdx = text.indexOf(yearMatch[0]);
    authors = [text.substring(0, yearIdx).replace(/[(),]/g, '').trim() || 'Unknown Author'];
    title = text.substring(yearIdx + yearMatch[0].length).replace(/[(),.]/g, '').trim() || text;
  }

  const rawSrc: Source = {
    id: `raw_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    kind: 'journal-article',
    title: title || text,
    authors: authors.length > 0 ? authors : ['Unknown Author'],
    year,
    verification: 'resolved',
    notes: 'Imported from pasted citation text',
    tags: ['pasted', 'citation'],
    citationString: text,
  };

  return [rawSrc];
}

/**
 * Creates a verified Source from Manual Entry form input
 */
export function createManualSource(data: ManualSourceInput): Source {
  const authors = data.authors
    .split(/[,;\n]| and /i)
    .map(a => a.trim())
    .filter(Boolean);

  const cleanYear = data.year ? String(data.year).trim() : 'n.d.';
  const kind = data.kind || 'journal-article';

  const cleanDoi = data.doi ? data.doi.replace(/^https?:\/\/doi\.org\//i, '').trim() : undefined;
  const url = data.url || (cleanDoi ? `https://doi.org/${cleanDoi}` : undefined);

  const src: Source = {
    id: `manual_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    kind,
    title: data.title.trim() || 'Untitled Reference',
    authors: authors.length > 0 ? authors : ['Unknown Author'],
    year: cleanYear,
    publication: data.publication?.trim() || undefined,
    volume: data.volume?.trim() || undefined,
    issue: data.issue?.trim() || undefined,
    pages: data.pages?.trim() || undefined,
    doi: cleanDoi,
    url,
    verification: 'confirmed',
    notes: 'Manually entered reference',
    tags: ['manual', kind],
    citationString: '',
  };

  if (data.stylePreference === 'apa') {
    const authorStr = authors.length > 1 ? `${authors[0]} et al.` : authors[0] || 'Unknown';
    src.citationString = `${authorStr} (${cleanYear}). ${src.title}. ${data.publication || ''}${cleanDoi ? ` https://doi.org/${cleanDoi}` : ''}`.trim();
  } else {
    // OSCOLA standard
    src.citationString = formatOscolaCitation(src);
  }

  return src;
}
