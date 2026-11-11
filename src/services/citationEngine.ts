/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Citation & Reference Engine (OSCOLA & Chicago Notes) + 10-Point Citation Audit
 */

import { Manuscript, Source, Footnote } from '../types/manuscript';

export interface CitationAuditIssue {
  id: string;
  kind:
    | 'footnote-without-citation'
    | 'uncited-bibliography'
    | 'missing-from-bibliography'
    | 'duplicate-sources'
    | 'inconsistent-acronym'
    | 'wrong-body-acronym'
    | 'missing-accessed-date'
    | 'missing-pinpoint'
    | 'primary-source-gap';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  location?: string;
  sourceId?: string;
  footnoteId?: string;
}

/**
 * Format a Source according to OSCOLA standard
 */
export function formatOscolaCitation(source: Source, pinpoint?: string, isSubsequent = false, previousSame = false): string {
  if (previousSame) {
    return pinpoint ? `ibid ${pinpoint}` : 'ibid';
  }

  if (isSubsequent) {
    const authorOrShort = source.authors[0]?.split(' ').pop() || source.title.substring(0, 15);
    return `${authorOrShort} (n ...) ${pinpoint || ''}`.trim();
  }

  let formatted = '';
  switch (source.kind) {
    case 'treaty':
      formatted = `${source.title} (adopted ${source.year}) ${source.publication || ''}`;
      break;
    case 'un-document':
      formatted = `${source.authors.join(', ')}, "${source.title}" (${source.year}) ${source.unSymbol || source.publication || ''}`;
      break;
    case 'case':
      formatted = `${source.title} ${source.caseReport || source.year}`;
      break;
    case 'statute':
      formatted = `${source.title} ${source.year}`;
      break;
    case 'journal-article':
      formatted = `${source.authors.join(' and ')}, '${source.title}' (${source.year}) ${source.volume || ''} ${source.publication || ''} ${source.pages || ''}`;
      break;
    case 'book-chapter':
      formatted = `${source.authors.join(' and ')}, ${source.title} (${source.publication || 'OUP'} ${source.year})`;
      break;
    default:
      formatted = `${source.authors.join(', ')}, ${source.title} (${source.year})`;
      break;
  }

  if (pinpoint) {
    formatted += `, ${pinpoint}`;
  }

  return formatted.trim();
}

/**
 * Run 10-Point Citation Audit on Manuscript
 */
export function runCitationAudit(manuscript: Manuscript): CitationAuditIssue[] {
  const issues: CitationAuditIssue[] = [];

  const sourceMap = new Map<string, Source>();
  for (const s of manuscript.sources) {
    sourceMap.set(s.id, s);
  }

  // 1. Collect all cited source IDs across all footnotes
  const citedSourceIds = new Set<string>();
  const footnoteSourceCount = new Map<string, number>();

  let prevFootnoteSourceId: string | null = null;
  manuscript.footnotes.forEach((fn, idx) => {
    footnoteSourceCount.set(fn.id, fn.citations.length);

    if (fn.citations.length === 0) {
      // Check if content has 'ibid' without citation
      if (fn.content.toLowerCase().includes('ibid') && !prevFootnoteSourceId) {
        issues.push({
          id: `audit_ambiguous_ibid_${fn.id}`,
          kind: 'footnote-without-citation',
          severity: 'error',
          title: 'Ambiguous "Ibid." in Footnote',
          description: `Footnote ${fn.number} contains "ibid" but does not reference a preceding valid citation.`,
          location: `Footnote ${fn.number}`,
          footnoteId: fn.id,
        });
      } else if (!fn.content.trim()) {
        issues.push({
          id: `audit_empty_fn_${fn.id}`,
          kind: 'footnote-without-citation',
          severity: 'warning',
          title: 'Empty Footnote',
          description: `Footnote ${fn.number} has no content or linked citation.`,
          location: `Footnote ${fn.number}`,
          footnoteId: fn.id,
        });
      }
    }

    fn.citations.forEach(cit => {
      citedSourceIds.add(cit.sourceId);

      // Check pinpoint missing on statutory or treaty pinpoints
      const src = sourceMap.get(cit.sourceId);
      if (src && (src.kind === 'treaty' || src.kind === 'statute') && !cit.pinpoint) {
        issues.push({
          id: `audit_pinpoint_${cit.id}`,
          kind: 'missing-pinpoint',
          severity: 'warning',
          title: 'Missing Pinpoint on Primary Instrument',
          description: `Citation to ${src.title} in Footnote ${fn.number} lacks a specific article or section pinpoint (e.g., 'art 19(3)' or 's 25').`,
          location: `Footnote ${fn.number}`,
          sourceId: cit.sourceId,
          footnoteId: fn.id,
        });
      }
    });

    prevFootnoteSourceId = fn.citations[0]?.sourceId || null;
  });

  // 2. In bibliography / library but never cited
  manuscript.sources.forEach(s => {
    if (!citedSourceIds.has(s.id)) {
      issues.push({
        id: `audit_orphan_${s.id}`,
        kind: 'uncited-bibliography',
        severity: 'info',
        title: 'Uncited Source in Library',
        description: `"${s.title}" exists in the verified library but is not currently cited in any footnote.`,
        sourceId: s.id,
      });
    }
  });

  // 3. Duplicate entries in library (fuzzy title matching)
  const seenTitles = new Map<string, string>();
  manuscript.sources.forEach(s => {
    const norm = s.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenTitles.has(norm)) {
      issues.push({
        id: `audit_dup_${s.id}`,
        kind: 'duplicate-sources',
        severity: 'warning',
        title: 'Potential Duplicate Source',
        description: `Source "${s.title}" appears to be entered more than once under different IDs.`,
        sourceId: s.id,
      });
    } else {
      seenTitles.set(norm, s.id);
    }
  });

  // 4. Acronym collision check: UNHCR vs UNHRC vs OHCHR
  manuscript.sections.forEach(sec => {
    sec.blocks.forEach(blk => {
      const text = blk.content;
      // If discussing UN Human Rights Committee or freedom of expression, did it say UNHCR (Refugee agency)?
      if (text.includes('UNHCR') && (text.includes('General Comment') || text.includes('Article 19') || text.includes('ICCPR'))) {
        issues.push({
          id: `audit_acronym_${blk.id}`,
          kind: 'wrong-body-acronym',
          severity: 'error',
          title: 'Acronym Collision: UNHCR vs UN Human Rights Committee',
          description: `Text mentions "UNHCR" in the context of Article 19 / General Comments. Did you mean "UN Human Rights Committee" or "UNHRC"? UNHCR is the UN High Commissioner for Refugees.`,
          location: `${sec.title}, paragraph ${blk.order}`,
        });
      }

      // Check primary source gap: discusses a statute or treaty but doesn't cite primary source
      if ((text.includes('statute') || text.includes('provision') || text.includes('Ordinance')) && (!blk.footnoteRefs || blk.footnoteRefs.length === 0)) {
        issues.push({
          id: `audit_primary_gap_${blk.id}`,
          kind: 'primary-source-gap',
          severity: 'warning',
          title: 'Potential Primary-Source Gap',
          description: `Paragraph discusses statutory provisions or legislation without a direct footnote citation to the legal text itself.`,
          location: `${sec.title}, paragraph ${blk.order}`,
        });
      }
    });
  });

  // 5. Missing accessed date for web sources
  manuscript.sources.forEach(s => {
    if (s.kind === 'news-web' && !s.accessedDate) {
      issues.push({
        id: `audit_access_date_${s.id}`,
        kind: 'missing-accessed-date',
        severity: 'warning',
        title: 'Missing Accessed Date for Web Source',
        description: `Web reference "${s.title}" requires an accessed date (e.g. 'accessed 12 November 2026') under OSCOLA.`,
        sourceId: s.id,
      });
    }
  });

  return issues;
}
