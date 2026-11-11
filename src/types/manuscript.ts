/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * HumanManuscript Core Document Model & Types (design.md)
 */

export type ArticleType = 'doctrinal' | 'socio-legal' | 'comparative' | 'case-note' | 'review';

export type VerificationState = 'unverified' | 'resolved' | 'confirmed' | 'flagged';

export type LegalSourceKind =
  | 'journal-article'
  | 'book-chapter'
  | 'treaty'
  | 'un-document'
  | 'statute'
  | 'case'
  | 'report'
  | 'news-web'
  | 'constitution';

export interface Source {
  id: string;
  kind: LegalSourceKind;
  title: string;
  authors: string[];
  year: number | string;
  publication?: string; // Journal, Publisher, Court, Body, etc.
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  accessedDate?: string;
  jurisdiction?: string;
  citationString: string; // Preformatted OSCOLA / Chicago preview
  verification: VerificationState;
  notes?: string;
  tags?: string[];
  unSymbol?: string; // For UN docs e.g. CCPR/C/GC/34
  statuteSection?: string;
  amendmentStatus?: string;
  caseReport?: string;
  isCustom?: boolean;
}

export interface Citation {
  id: string;
  footnoteId: string;
  sourceId: string;
  pinpoint?: string; // e.g. 'para 25', 'p. 142', 'art 19(3)'
  prefix?: string; // e.g. 'See', 'Compare'
  suffix?: string;
  claimId?: string;
}

export interface Footnote {
  id: string;
  number: number;
  blockId: string;
  content: string;
  citations: Citation[];
}

export interface Claim {
  id: string;
  blockId: string;
  text: string;
  needsSupport: boolean;
  supportedBySourceIds: string[];
  status: 'supported' | 'unsupported' | 'pending-review';
}

export interface SectionContract {
  role: string;
  description: string;
  wordTarget: number;
  wordTolerance: number; // e.g. 10%
  requiredMoves: string[]; // Rhetorical moves required (e.g. ['gap', 'question', 'thesis', 'method', 'roadmap'])
  citationRules: string[];
  consistencyHooks?: string[];
}

export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'table';

export interface Block {
  id: string;
  sectionId: string;
  order: number;
  type: BlockType;
  content: string;
  hash?: string;
  claims?: Claim[];
  footnoteRefs?: string[]; // Footnote IDs
}

export interface Section {
  id: string;
  manuscriptId: string;
  order: number;
  role: string;
  title: string;
  contract: SectionContract;
  wordTarget: number;
  status: 'not-started' | 'drafting' | 'revising' | 'complete';
  blocks: Block[];
  language?: string; // Default 'en-GB'
}

export interface JournalProfile {
  id: string;
  name: string;
  publisher: string;
  issn: string;
  indexes: {
    scopus: boolean;
    wos: boolean; // SSCI, AHCI, ESCI
    quartile?: string; // Q1, Q2, etc.
    lastCheckedDate: string;
  };
  limits: {
    maxWordCount: number;
    minWordCount: number;
    abstractWords: number;
    keywordsCount: number;
    maxFigures: number;
  };
  style: 'OSCOLA' | 'Chicago-Notes' | 'Bluebook' | 'Harvard-Law' | 'APA-Legal';
  spelling: 'UK' | 'UK-Oxford' | 'US';
  requiredHeadings: string[];
  declarations: string[];
  aimsAndScope?: string;
}

export interface ReviewerComment {
  id: string;
  roundId: string;
  reviewer: string; // e.g. 'Reviewer 1'
  raw: string; // Verbatim text
  kind:
    | 'theory'
    | 'methodology'
    | 'legal-accuracy'
    | 'missing-literature'
    | 'citation-form'
    | 'structure'
    | 'argument'
    | 'language'
    | 'ethics'
    | 'scope';
  severity: 'major' | 'minor' | 'editorial';
  targetSectionIds: string[];
  action: 'revise-text' | 'add-source' | 'restructure' | 'rebut-politely' | 'clarify' | 'no-change';
  status: 'open' | 'planned' | 'drafted' | 'applied' | 'verified';
  responseDraft?: string;
  proposedChangesSummary?: string;
  locationReference?: string; // Generated e.g. 'Section 4, para 2, fn 41'
}

export interface ProposalOperation {
  op: 'replace_text' | 'insert_block' | 'delete_block' | 'add_footnote' | 'add_citation';
  blockId: string;
  before: string;
  after: string;
  rationale: string;
  legalMeaningChanged: boolean;
  needsSources?: { description: string; libraryIds: string[] }[];
}

export interface Proposal {
  id: string;
  commentId: string;
  plan: string;
  operations: ProposalOperation[];
  risks: string[];
  openQuestions?: string[];
  provider?: string;
  model?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}

export interface ChangeEvent {
  id: string;
  timestamp: number;
  actor: {
    type: 'human' | 'model' | 'external';
    name: string;
    model?: string;
  };
  op: 'replace' | 'insert' | 'delete' | 'cite' | 'language';
  target: {
    sectionId: string;
    blockId: string;
  };
  before: string;
  after: string;
  reason: string;
  commentId?: string;
  proposalId?: string;
  status: 'accepted' | 'rejected' | 'active';
}

export interface Snapshot {
  id: string;
  label: string;
  createdAt: number;
  eventCursor: number;
  wordCount: number;
  notes?: string;
}

export type OriginalityFlagKind =
  | 'verbatim-match' // Red
  | 'close-paraphrase' // Orange
  | 'needs-citation' // Yellow
  | 'self-overlap' // Blue
  | 'unreviewed-ai' // Purple
  | 'properly-quoted'; // Grey

export interface OriginalityFlag {
  id: string;
  blockId: string;
  textSpan: string;
  kind: OriginalityFlagKind;
  matchedSource?: string;
  matchedPassage?: string;
  score?: number;
  status: 'open' | 'fixed' | 'dismissed';
  dismissReason?: string;
}

export interface ProvenanceSpan {
  id: string;
  blockId: string;
  text: string;
  origin: 'typed' | 'pasted' | 'imported' | 'external' | 'ai-suggested';
  model?: string;
  timestamp: number;
  reviewed: boolean;
}

// Evidence Workbench Types (Section 19)
export interface EvidencePassage {
  id: string; // e.g. 'src_01:p12:¶3'
  documentId: string;
  page: number;
  paragraphOrdinal: number;
  text: string;
  legalPinpoint?: string; // e.g. 'art. 19(3)', 's. 25(1)(a)'
  verified: 'exact' | 'normalised' | 'unverified';
}

export interface EvidenceDocument {
  id: string;
  title: string;
  shortTitle: string;
  authors: string;
  year: number;
  kind: LegalSourceKind;
  passages: EvidencePassage[];
  ocrConfidence?: number;
}

export interface WorkbenchFinding {
  id: string;
  mode: 'extract' | 'compare' | 'differences' | 'ask';
  question: string;
  createdAt: number;
  baselineDocId?: string;
  data: Record<string, string>; // Matrix cell: docId -> quote
  traces: Record<string, string>; // docId -> passageId
  verified: Record<string, boolean>;
}

// Local Skills (Section 29)
export interface Skill {
  id: string;
  name: string;
  kind: 'style' | 'checks' | 'workflows' | 'domain-knowledge' | 'journal' | 'utilities';
  version: string;
  enabled: boolean;
  description: string;
  rules: string[];
  isProtected?: boolean;
}

export interface Manuscript {
  id: string;
  title: string;
  subtitle?: string;
  articleType: ArticleType;
  journalProfileId: string;
  journalProfile: JournalProfile;
  languages: {
    primary: string; // 'en-GB'
    secondary?: string; // e.g. 'id' or 'bn'
  };
  keywords: string[];
  abstractEn: string;
  abstractSecondary?: string;
  sections: Section[];
  sources: Source[];
  footnotes: Footnote[];
  reviewerComments: ReviewerComment[];
  proposals: Proposal[];
  changeEvents: ChangeEvent[];
  snapshots: Snapshot[];
  originalityFlags: OriginalityFlag[];
  provenanceSpans: ProvenanceSpan[];
  workbenchDocuments: EvidenceDocument[];
  workbenchFindings: WorkbenchFinding[];
  skills: Skill[];
  settings: {
    trackChanges: boolean;
    defaultSpelling: 'en-GB';
    autoSaveIntervalMs: number;
    originalitySensitivity: number; // 8 words default
    activeProvider: 'gemini' | 'kimi' | 'claude' | 'ollama' | 'manual-bridge';
    geminiApiKey?: string;
    kimiApiKey?: string;
    claudeApiKey?: string;
    ollamaEndpoint?: string;
  };
}
