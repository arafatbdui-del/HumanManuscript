/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Section 12: Legal & Human Rights Quality Checks
 */

import { Manuscript } from '../types/manuscript';

export interface QualityFinding {
  id: string;
  category:
    | 'tripartite-test'
    | 'overclaiming'
    | 'definition-discipline'
    | 'roadmap-consistency'
    | 'number-consistency'
    | 'acronym-attribution';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location?: string;
  suggestedAction?: string;
}

export function runLegalQualityChecks(manuscript: Manuscript): QualityFinding[] {
  const findings: QualityFinding[] = [];

  // 1. Roadmap consistency check: Introduction mentions sections, compare with real sections
  const introSec = manuscript.sections.find(s => s.role === 'Introduction');
  if (introSec) {
    const introText = introSec.blocks.map(b => b.content).join(' ');
    // Look for patterns like "Section 2", "Section 3", "Section 4", "Section 5"
    const actualNumberedSections = manuscript.sections
      .filter(s => s.role !== 'Title & Metadata' && s.role !== 'Abstract' && s.role !== 'Bibliography')
      .map(s => s.title);

    // If intro has "Section B" or promises a section that doesn't exist
    if (introText.includes('Section B') && !actualNumberedSections.some(t => t.includes('Section B') || t.includes('B.'))) {
      findings.push({
        id: 'qf_roadmap_mismatch',
        category: 'roadmap-consistency',
        severity: 'high',
        title: 'Roadmap Headings Inconsistency',
        description: 'The Introduction promises lettered headings ("Section B..."), but the manuscript body uses Arabic numerals (e.g. "Section 2").',
        location: 'Section 1 (Introduction)',
        suggestedAction: 'Align roadmap labels with the actual section numbering in the document.',
      });
    }
  }

  // 2. Overclaiming language check: causal or intent language ("weaponizes", "deliberate", "proves", "undeniably")
  const overclaimWords = [
    { word: 'weaponizes', tip: 'Consider hedging: "may be utilized strategically to"' },
    { word: 'weaponised', tip: 'Consider hedging: "instrumentalised"' },
    { word: 'proves', tip: 'Legal analysis rarely "proves" a normative claim; prefer "demonstrates", "indicates", or "substantiates"' },
    { word: 'undeniably', tip: 'Avoid absolute adjectives in peer-reviewed legal scholarship; consider "compellingly"' },
    { word: 'deliberate conspiracy', tip: 'Ensure empirical or judicial findings substantiate state subjective intent' },
  ];

  manuscript.sections.forEach(sec => {
    sec.blocks.forEach(blk => {
      for (const item of overclaimWords) {
        const regex = new RegExp(`\\b${item.word}\\b`, 'i');
        if (regex.test(blk.content)) {
          findings.push({
            id: `qf_overclaim_${blk.id}_${item.word}`,
            category: 'overclaiming',
            severity: 'medium',
            title: `Potential Overclaiming: "${item.word}"`,
            description: `The term "${item.word}" asserts absolute causal or intent certainty without qualifications.`,
            location: `${sec.title}, paragraph ${blk.order}`,
            suggestedAction: item.tip,
          });
        }
      }
    });
  });

  // 3. Definition discipline: vagueness vs overbreadth
  let hasVagueness = false;
  let hasOverbreadth = false;
  manuscript.sections.forEach(sec => {
    const text = sec.blocks.map(b => b.content).join(' ');
    if (text.toLowerCase().includes('vagueness')) hasVagueness = true;
    if (text.toLowerCase().includes('overbreadth')) hasOverbreadth = true;
  });

  if (hasVagueness && hasOverbreadth) {
    findings.push({
      id: 'qf_def_discipline_vagueness',
      category: 'definition-discipline',
      severity: 'low',
      title: 'Doctrinal Discipline: Vagueness vs Overbreadth',
      description: 'The manuscript references both "vagueness" (Article 19(3) legality prong) and "overbreadth" (proportionality prong). Maintain this constitutional distinction strictly throughout.',
      location: 'Manuscript-wide',
      suggestedAction: 'Keep vagueness bound to foreseeability of law, and overbreadth bound to least intrusive means.',
    });
  }

  // 4. Tripartite Test completeness: legality, legitimate aim, necessity & proportionality
  let discussesLegality = false;
  let discussesLegitimateAim = false;
  let discussesProportionality = false;

  manuscript.sections.forEach(sec => {
    const text = sec.blocks.map(b => b.content).join(' ').toLowerCase();
    if (text.includes('provided by law') || text.includes('prescribed by law') || text.includes('legality')) discussesLegality = true;
    if (text.includes('legitimate aim') || text.includes('public order') || text.includes('rights of others')) discussesLegitimateAim = true;
    if (text.includes('proportionality') || text.includes('least intrusive') || text.includes('necessity')) discussesProportionality = true;
  });

  if (!discussesLegality || !discussesLegitimateAim || !discussesProportionality) {
    findings.push({
      id: 'qf_tripartite_gap',
      category: 'tripartite-test',
      severity: 'high',
      title: 'Incomplete ICCPR Tripartite Test Coverage',
      description: `Article 19(3) requires cumulative examination of Legality (${discussesLegality ? 'covered' : 'missing'}), Legitimate Aim (${discussesLegitimateAim ? 'covered' : 'missing'}), and Necessity/Proportionality (${discussesProportionality ? 'covered' : 'missing'}).`,
      location: 'Section 2 / Section 3',
      suggestedAction: 'Ensure all three prongs are systematically treated in the doctrinal analysis.',
    });
  }

  return findings;
}
