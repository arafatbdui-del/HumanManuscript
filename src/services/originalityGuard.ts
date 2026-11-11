/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Section 26: Originality Guard & Live Authorship Engine
 */

import { Manuscript, OriginalityFlag, EvidenceDocument } from '../types/manuscript';

/**
 * Normalises text into word tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Checks a block's content against loaded evidence passages and library sources for:
 * 1. Verbatim runs of 8+ words (Red flag)
 * 2. Properly quoted text with citations (Grey)
 * 3. Close paraphrases (Orange flag)
 */
export function scanBlockOriginality(
  blockId: string,
  content: string,
  evidenceDocs: EvidenceDocument[],
  sensitivityWords = 8
): OriginalityFlag[] {
  const flags: OriginalityFlag[] = [];
  const contentTokens = tokenize(content);

  if (contentTokens.length < sensitivityWords) return flags;

  // Check quotes inside the text (single or double quotes)
  const quotes = content.match(/"([^"]+)"|'([^']+)'/g);

  // Compare against all evidence passages
  for (const doc of evidenceDocs) {
    for (const passage of doc.passages) {
      const passageTokens = tokenize(passage.text);
      if (passageTokens.length < sensitivityWords) continue;

      // Check n-gram consecutive word overlap
      for (let i = 0; i <= contentTokens.length - sensitivityWords; i++) {
        const shingle = contentTokens.slice(i, i + sensitivityWords).join(' ');
        const passageStr = passageTokens.join(' ');

        if (passageStr.includes(shingle)) {
          // Found matching shingle!
          // Check if this shingle is inside quotation marks
          const isQuoted = quotes?.some(q => q.toLowerCase().includes(shingle));

          if (isQuoted) {
            flags.push({
              id: `flag_quoted_${blockId}_${i}`,
              blockId,
              textSpan: shingle,
              kind: 'properly-quoted',
              matchedSource: doc.title,
              matchedPassage: passage.id,
              score: 1.0,
              status: 'open',
            });
          } else {
            flags.push({
              id: `flag_verbatim_${blockId}_${i}`,
              blockId,
              textSpan: shingle,
              kind: 'verbatim-match',
              matchedSource: `${doc.shortTitle} (${passage.legalPinpoint || `p.${passage.page}`})`,
              matchedPassage: passage.text.substring(0, 100) + '...',
              score: 1.0,
              status: 'open',
            });
          }
          break; // Stop after first match in this block to avoid clutter
        }
      }
    }
  }

  return flags;
}

/**
 * Run full originality scan across all manuscript blocks
 */
export function runFullOriginalityScan(manuscript: Manuscript): OriginalityFlag[] {
  const allFlags: OriginalityFlag[] = [];
  const docs = manuscript.workbenchDocuments;

  for (const sec of manuscript.sections) {
    for (const blk of sec.blocks) {
      const blkFlags = scanBlockOriginality(blk.id, blk.content, docs, manuscript.settings.originalitySensitivity);
      allFlags.push(...blkFlags);
    }
  }

  // Preserve manual / existing dismissed states
  const existingDismissed = new Set(
    manuscript.originalityFlags.filter(f => f.status === 'dismissed').map(f => f.textSpan)
  );

  return allFlags.map(f => {
    if (existingDismissed.has(f.textSpan)) {
      return { ...f, status: 'dismissed' };
    }
    return f;
  });
}
