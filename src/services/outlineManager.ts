/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Document Outline & Real-Time Word Count Manager for HumanManuscript
 */

export interface DocumentSectionOutline {
  id: string;
  type: 'title' | 'metadata' | 'abstract' | 'intro' | 'custom' | 'conclusion' | 'bibliography';
  title: string;
  subtitle?: string;
  wordCount: number;
  wordTarget?: number;
  isHidden: boolean;
  isDefault: boolean;
  order: number;
}

export const DEFAULT_OUTLINE_SECTIONS: DocumentSectionOutline[] = [
  {
    id: 'sec-title',
    type: 'title',
    title: 'Title',
    subtitle: 'Manuscript title & jurisdiction',
    wordCount: 19,
    wordTarget: 50,
    isHidden: false,
    isDefault: true,
    order: 1,
  },
  {
    id: 'sec-metadata',
    type: 'metadata',
    title: 'Metadata',
    subtitle: 'Author, Journal, ISSN & Indexing',
    wordCount: 44,
    wordTarget: 100,
    isHidden: false,
    isDefault: true,
    order: 2,
  },
  {
    id: 'sec-abstract',
    type: 'abstract',
    title: 'Abstract',
    subtitle: 'Research question, method & findings',
    wordCount: 165,
    wordTarget: 250,
    isHidden: false,
    isDefault: true,
    order: 3,
  },
  {
    id: 'sec-intro',
    type: 'intro',
    title: 'Introduction',
    subtitle: '1. Problem statement & roadmap',
    wordCount: 820,
    wordTarget: 1400,
    isHidden: false,
    isDefault: true,
    order: 4,
  },
  {
    id: 'sec-conclusion',
    type: 'conclusion',
    title: 'Conclusion',
    subtitle: '5. Doctrinal synthesis & reform',
    wordCount: 245,
    wordTarget: 1000,
    isHidden: false,
    isDefault: true,
    order: 5,
  },
  {
    id: 'sec-bibliography',
    type: 'bibliography',
    title: 'Bibliography',
    subtitle: 'Treaties, cases & secondary sources',
    wordCount: 185,
    wordTarget: 800,
    isHidden: false,
    isDefault: true,
    order: 6,
  },
];

/**
 * Calculates live word count for every section in the document outline in real time.
 */
export function calculateSectionWordCounts(
  html: string,
  sections: DocumentSectionOutline[]
): Record<string, number> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const counts: Record<string, number> = {};

  sections.forEach(s => {
    counts[s.id] = 0;
  });

  const countWords = (text: string) => {
    const matches = text.trim().match(/\b[\w'-]+\b/g);
    return matches ? matches.length : 0;
  };

  let currentSecId = sections[0]?.id || 'sec-title';

  const children = Array.from(doc.body.children);
  for (const el of children) {
    const id = el.getAttribute('id') || el.getAttribute('data-section-id');
    if (id && counts[id] !== undefined) {
      currentSecId = id;
    } else {
      // Check if this is a heading element matching a section title
      const tagName = el.tagName.toLowerCase();
      if (['h1', 'h2', 'h3'].includes(tagName)) {
        const text = (el.textContent || '').trim().toLowerCase();
        const matched = sections.find(s => {
          const sTitle = s.title.toLowerCase();
          return text.includes(sTitle) || sTitle.includes(text) || text.includes(s.type);
        });
        if (matched) {
          currentSecId = matched.id;
        }
      }
    }

    if (currentSecId && counts[currentSecId] !== undefined) {
      counts[currentSecId] += countWords(el.textContent || '');
    }
  }

  return counts;
}

/**
 * Builds the comprehensive initial HTML for the complete continuous document.
 */
export function generateInitialFullManuscriptHtml(): string {
  return `<h1 id="sec-title" class="font-serif font-bold text-2xl text-slate-900 pb-2 mb-4 border-b border-slate-200">Algorithmic Content Moderation and Freedom of Expression: Re-evaluating the Legality, Necessity and Proportionality Test under Article 19(3) ICCPR</h1>

<div id="sec-metadata" class="my-5 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 space-y-1">
  <p><strong>Author:</strong> Research Fellow in International Human Rights Law (Oxford &amp; Geneva)</p>
  <p><strong>Target Journal:</strong> Human Rights Law Review (Oxford University Press / Scopus Q1, SSCI)</p>
  <p><strong>ISSN:</strong> 1461-7781 | <strong>Citation Style:</strong> OSCOLA (4th edn) | <strong>Spelling:</strong> British English (en-GB)</p>
  <p><strong>Keywords:</strong> Algorithmic moderation; Freedom of expression; ICCPR Article 19(3); Delegated censorship; Proportionality; Natural language processing.</p>
</div>

<h2 id="sec-abstract" class="font-serif font-bold text-lg text-slate-800 mt-6 mb-2.5">Abstract</h2>
<p>The proliferation of automated and algorithmic content moderation tools across major digital platforms has transformed the enforcement of speech boundaries from ex post judicial adjudication to ex ante predictive filtering. This article conducts a rigorous doctrinal reassessment of automated moderation through the prism of the tripartite restriction test codified in Article 19(3) of the International Covenant on Civil and Political Rights (ICCPR). Examining the cumulative requirements of legality, legitimate aim, and necessity and proportionality, we argue that current algorithmic filtering architectures structurally fail the legality prong due to algorithmic opacity, proprietary rulesets, and an inherent lack of precision. Furthermore, empirical tendencies toward over-blocking and systemic context insensitivity demonstrate that automated takedowns breach the requirement of strict necessity, operating as disproportionate prior restraints. The article concludes by formulating enforceable institutional safeguards, mandating meaningful human-in-the-loop oversight and public algorithmic transparency standards to prevent the informal delegation of sovereign censorship.</p>

<h2 id="sec-intro" class="font-serif font-bold text-lg text-slate-800 mt-8 mb-2.5">1. Introduction</h2>
<p>In contemporary information ecosystems, the vast majority of public discourse takes place within privately owned digital platforms. To manage the immense velocity and volume of user-generated content, dominant online intermediaries have increasingly abandoned manual review in favour of automated decision-making and machine-learning classifiers. While state authorities often applaud these automated systems as indispensable mechanisms for curbing disinformation, hate speech, and violent extremist material, their deployment has fundamentally reshaped the architecture of global expression [fn1]. The delegation of content curation to opaque algorithmic models transforms speech regulation from an individualized, reasoned judicial process into an industrialised regime of automated prior restraint.</p>

<p>Despite significant scholarship addressing platform governance and algorithmic bias from computer science and sociological perspectives, a pronounced gap persists within international human rights doctrine. Existing legal commentary frequently discusses platform liability regimes or privacy infringements under Article 17 of the International Covenant on Civil and Political Rights (ICCPR) [fn2], yet comparatively few studies subject automated filtering mechanisms to the rigorous cumulative strictures of the tripartite test articulated in Article 19(3) ICCPR [fn3]. Specifically, how can automated moderation tools—which operate on proprietary algorithmic weights and statistical heuristics rather than publicly accessible normative codes—ever satisfy the threshold requirement that any restriction upon freedom of expression must be "provided by law"?</p>

<p>This article advances a central thesis: automated content moderation architectures, as presently designed and incentivised by coercive state liability regimes, are structurally irreconcilable with the legality and proportionality standards of Article 19(3) ICCPR. First, they fail the legality criterion because commercial terms of service lack the requisite accessibility, foreseeability, and democratic accountability demanded of statutory restrictions. Second, because machine-learning models cannot decipher semantic nuance, satire, and socio-political context, automated systems systematically generate over-blocking and collateral censorship, violating the mandate that speech restrictions must represent the least intrusive means to achieve a legitimate aim [fn4].</p>

<p>To substantiate this thesis, the article proceeds in four stages. Section 2 establishes the normative framework, delineating the authoritative jurisprudence governing the tripartite test under Article 19(3) ICCPR. Section 3 contextualises the technical realities of automated filtering and the socio-legal phenomenon of delegated censorship. Section 4 undertakes the core doctrinal analysis, evaluating automated moderation against the legality, legitimate aim, and necessity prongs. Finally, Section 5 synthesises counter-arguments and proposes procedural safeguards—including verifiable algorithmic transparency and mandatory human appellate review—to anchor platform governance within international rule-of-law standards.</p>

<h2 id="sec-conclusion" class="font-serif font-bold text-lg text-slate-800 mt-8 mb-2.5">5. Conclusion and Recommendations</h2>
<p>This study has demonstrated that the contemporary deployment of automated and algorithmic content moderation creates an acute constitutional tension with international human rights law. To restore fidelity to Article 19(3) ICCPR, states must abandon coercive intermediary liability regimes that incentivize automated over-blocking. Furthermore, international human rights law demands verifiable algorithmic audits, public explanations for automated removals, and an inviolable right to prompt, human-adjudicated appeal.</p>

<h2 id="sec-bibliography" class="font-serif font-bold text-lg text-slate-800 mt-8 mb-2.5">Bibliography</h2>
<p><strong>TABLE OF TREATIES AND CONVENTIONS</strong><br/>International Covenant on Civil and Political Rights (adopted 16 December 1966, entered into force 23 March 1976) 999 UNTS 171 (ICCPR)</p>
<p><strong>TABLE OF CASES</strong><br/>Handyside v United Kingdom (1976) 1 EHRR 737<br/>The Sunday Times v United Kingdom (No 1) (1979) 2 EHRR 245</p>
<p><strong>UNITED NATIONS DOCUMENTS</strong><br/>UN Human Rights Committee, "General Comment No. 34: Article 19 (Freedoms of opinion and expression)" (12 September 2011) UN Doc CCPR/C/GC/34<br/>UN Special Rapporteur on Freedom of Opinion and Expression, "Report on Content Regulation in the Digital Age" (6 April 2018) UN Doc A/HRC/38/35</p>
<p><strong>SECONDARY SOURCES</strong><br/>Hart HLA, The Concept of Law (2nd edn, OUP 1994)</p>`;
}
