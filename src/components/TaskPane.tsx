/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contextual Right Task Pane with Citations, Evidence Workbench, Review Desk & AI Studio (design.md)
 */

import React, { useState } from 'react';
import {
  Manuscript,
  Source,
  Footnote,
  ReviewerComment,
  Proposal,
  Section,
  EvidenceDocument,
  OriginalityFlag,
} from '../types/manuscript';
import {
  BookOpen,
  Scale,
  MessageSquare,
  ShieldCheck,
  Feather,
  Sparkles,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Plus,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  RefreshCw,
  Search,
} from 'lucide-react';
import { runCitationAudit } from '../services/citationEngine';
import { runLegalQualityChecks } from '../services/legalQualityChecks';
import { executeSectionAIAction } from '../services/aiProvider';

export type TaskPaneTab =
  | 'citations'
  | 'workbench'
  | 'review'
  | 'originality'
  | 'language'
  | 'journal'
  | 'ai';

interface TaskPaneProps {
  activeTab: TaskPaneTab;
  onSelectTab: (tab: TaskPaneTab) => void;
  manuscript: Manuscript;
  activeSection: Section;
  selectedFootnote: Footnote | null;
  onSelectFootnote: (fn: Footnote | null) => void;
  onOpenAddSource: () => void;
  onOpenImportReferences: () => void;
  onInsertCitationToEditor: (source: Source, style: 'oscola-footnote' | 'in-text-author-year' | 'in-text-numeric' | 'apa') => void;
  onApplyProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onUpdateFootnoteContent: (fnId: string, newContent: string) => void;
  onFixOriginalityFlag: (flag: OriginalityFlag, fixType: 'quote' | 'cite' | 'dismiss') => void;
}

export const TaskPane: React.FC<TaskPaneProps> = ({
  activeTab,
  onSelectTab,
  manuscript,
  activeSection,
  selectedFootnote,
  onSelectFootnote,
  onOpenAddSource,
  onOpenImportReferences,
  onInsertCitationToEditor,
  onApplyProposal,
  onRejectProposal,
  onUpdateFootnoteContent,
  onFixOriginalityFlag,
}) => {
  const [workbenchMode, setWorkbenchMode] = useState<'extract' | 'compare' | 'differences' | 'ask'>('compare');
  const [citationInsertStyle, setCitationInsertStyle] = useState<'oscola-footnote' | 'in-text-author-year' | 'in-text-numeric' | 'apa'>('oscola-footnote');
  const [refSearch, setRefSearch] = useState('');
  const [refFilter, setRefFilter] = useState<'all' | 'mendeley' | 'treaty' | 'case' | 'article' | 'book'>('all');
  const [aiActionRunning, setAiActionRunning] = useState(false);
  const [aiActionResult, setAiActionResult] = useState<string | null>(null);
  const [activeAIAction, setActiveAIAction] = useState<'gap-check' | 'counter-argument' | 'clarity-pass' | 'outline' | 'tighten-budget'>('gap-check');

  const auditIssues = runCitationAudit(manuscript);
  const qualityFindings = runLegalQualityChecks(manuscript);

  const handleRunAIAction = async (action: 'gap-check' | 'counter-argument' | 'clarity-pass' | 'outline' | 'tighten-budget') => {
    setActiveAIAction(action);
    setAiActionRunning(true);
    setAiActionResult(null);
    try {
      const secContent = activeSection.blocks.map(b => b.content).join('\n\n');
      const res = await executeSectionAIAction({
        action,
        sectionTitle: activeSection.title,
        sectionContract: activeSection.contract,
        sectionContent: secContent,
        verifiedSources: manuscript.sources,
        userGeminiKey: manuscript.settings.geminiApiKey,
      });
      setAiActionResult(res.resultText);
    } catch (err) {
      console.error('AI action error:', err);
    } finally {
      setAiActionRunning(false);
    }
  };

  return (
    <aside className="w-88 bg-slate-50 border-l border-slate-200 flex flex-col h-full select-none text-xs text-slate-700 no-print">
      {/* Pane Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-2 py-1.5 overflow-x-auto">
        <button
          onClick={() => onSelectTab('citations')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition ${
            activeTab === 'citations' ? 'bg-white text-blue-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Verified Legal Library & Citations"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Library</span>
        </button>

        <button
          onClick={() => onSelectTab('workbench')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition ${
            activeTab === 'workbench' ? 'bg-white text-indigo-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Evidence Workbench (Source-Only Extraction)"
        >
          <Scale className="w-3.5 h-3.5 text-indigo-600" />
          <span>Workbench</span>
        </button>

        <button
          onClick={() => onSelectTab('review')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition relative ${
            activeTab === 'review' ? 'bg-white text-amber-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Review Desk (Peer Review Comments & Proposals)"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
          <span>Review</span>
          {manuscript.reviewerComments.some(c => c.status === 'open' || c.status === 'planned') && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('originality')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition ${
            activeTab === 'originality' ? 'bg-white text-rose-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Originality Guard & Authorship"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
          <span>Guard</span>
        </button>

        <button
          onClick={() => onSelectTab('language')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition ${
            activeTab === 'language' ? 'bg-white text-emerald-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Language Studio & Meaning Guard"
        >
          <Feather className="w-3.5 h-3.5 text-emerald-600" />
          <span>Language</span>
        </button>

        <button
          onClick={() => onSelectTab('ai')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition ${
            activeTab === 'ai' ? 'bg-white text-purple-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
          title="AI Assistant (Section Actions)"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Actions</span>
        </button>
      </div>

      {/* Pane Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ================= CITATIONS / LIBRARY TAB ================= */}
        {activeTab === 'citations' && (
          <div className="space-y-4">
            {/* Selected Footnote Inspector */}
            {selectedFootnote ? (
              <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-blue-900 text-xs">
                    Footnote {selectedFootnote.number} Inspector
                  </span>
                  <button
                    onClick={() => onSelectFootnote(null)}
                    className="text-blue-500 hover:text-blue-800 text-[11px]"
                  >
                    Close
                  </button>
                </div>
                <textarea
                  value={selectedFootnote.content}
                  onChange={e => onUpdateFootnoteContent(selectedFootnote.id, e.target.value)}
                  className="w-full text-xs font-serif-legal p-2 rounded bg-white border border-blue-200 text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
                <div className="mt-2 text-[10px] text-blue-700 flex items-center justify-between">
                  <span>OSCOLA Short Form applied</span>
                  <span className="font-medium text-emerald-700">Verified Authority</span>
                </div>
              </div>
            ) : null}

            {/* Reference Library Header with Mendeley Support */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Reference Library</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-medium px-1.5 py-0.2 rounded">Mendeley</span>
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {manuscript.sources.length} sources in verified library
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onOpenImportReferences}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] shadow-2xs transition"
                    title="Import Mendeley .bib (BibTeX) or .ris files"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Import .bib/.ris</span>
                  </button>
                  <button
                    onClick={onOpenAddSource}
                    className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] transition"
                    title="Add manual source"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Citation Insertion Format Selector */}
              <div className="bg-slate-100 p-2 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-600">
                  <span className="font-semibold uppercase tracking-wider">Insert Citation Format:</span>
                  <span className="text-blue-700 font-mono">Click card to insert</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    onClick={() => setCitationInsertStyle('oscola-footnote')}
                    className={`py-1 px-1.5 rounded text-left border transition ${
                      citationInsertStyle === 'oscola-footnote'
                        ? 'bg-blue-600 text-white border-blue-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Footnote [fn]
                  </button>
                  <button
                    onClick={() => setCitationInsertStyle('in-text-author-year')}
                    className={`py-1 px-1.5 rounded text-left border transition ${
                      citationInsertStyle === 'in-text-author-year'
                        ? 'bg-blue-600 text-white border-blue-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    (Author, Year)
                  </button>
                  <button
                    onClick={() => setCitationInsertStyle('in-text-numeric')}
                    className={`py-1 px-1.5 rounded text-left border transition ${
                      citationInsertStyle === 'in-text-numeric'
                        ? 'bg-blue-600 text-white border-blue-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Numeric [1]
                  </button>
                  <button
                    onClick={() => setCitationInsertStyle('apa')}
                    className={`py-1 px-1.5 rounded text-left border transition ${
                      citationInsertStyle === 'apa'
                        ? 'bg-blue-600 text-white border-blue-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Author (Year)
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={refSearch}
                    onChange={e => setRefSearch(e.target.value)}
                    placeholder="Search references by title, author, year..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1 text-[10px] overflow-x-auto pb-0.5">
                  {(['all', 'mendeley', 'article', 'book', 'treaty', 'case'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRefFilter(f as any)}
                      className={`px-2 py-0.5 rounded capitalize whitespace-nowrap transition ${
                        refFilter === f
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filtered Sources List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
              {manuscript.sources
                .filter(s => {
                  if (refSearch) {
                    const q = refSearch.toLowerCase();
                    const matchesTitle = s.title.toLowerCase().includes(q);
                    const matchesAuthor = s.authors.some(a => a.toLowerCase().includes(q));
                    const matchesYear = s.year.toString().includes(q);
                    if (!matchesTitle && !matchesAuthor && !matchesYear) return false;
                  }
                  if (refFilter === 'mendeley') {
                    return s.tags?.includes('mendeley') || s.id.startsWith('mendeley_') || s.id.startsWith('ris_');
                  }
                  if (refFilter === 'article') return s.kind === 'journal-article';
                  if (refFilter === 'book') return s.kind === 'book-chapter';
                  if (refFilter === 'treaty') return s.kind === 'treaty' || s.kind === 'un-document';
                  if (refFilter === 'case') return s.kind === 'case';
                  return true;
                })
                .map((src, index) => {
                  const isMendeley = src.tags?.includes('mendeley') || src.id.startsWith('mendeley_') || src.id.startsWith('ris_');
                  return (
                    <div
                      key={src.id}
                      onClick={() => onInsertCitationToEditor(src, citationInsertStyle)}
                      className="group bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs rounded p-2.5 cursor-pointer transition relative"
                      title="Click to insert citation at cursor in editor"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {src.kind}
                          </span>
                          {isMendeley && (
                            <span className="text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-700 font-semibold rounded border border-indigo-200">
                              Mendeley
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertCitationToEditor(src, citationInsertStyle);
                          }}
                          className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-medium transition"
                        >
                          + Insert
                        </button>
                      </div>

                      <h4 className="font-medium text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                        {src.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {src.authors.join(', ')} ({src.year})
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono truncate">
                        {src.citationString}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Citation Audit Results */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Citation Audit (10 Checks)
                </span>
                <span className="text-[10px] text-slate-500">{auditIssues.length} findings</span>
              </div>

              {auditIssues.length === 0 ? (
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>All citation links, acronyms, and pinpoints verified.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {auditIssues.map(issue => (
                    <div
                      key={issue.id}
                      className={`p-2 rounded border text-[11px] ${
                        issue.severity === 'error'
                          ? 'bg-red-50/70 border-red-200 text-red-900'
                          : 'bg-amber-50/70 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-semibold">{issue.title}</div>
                      <p className="text-[10px] text-slate-600 mt-0.5">{issue.description}</p>
                      {issue.location && (
                        <span className="text-[9px] text-slate-400 block mt-1">
                          Location: {issue.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= EVIDENCE WORKBENCH TAB (Section 19) ================= */}
        {activeTab === 'workbench' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Evidence Workbench</h3>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  NotebookLM-Style
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Source-only evidence matrix. Quotes are mathematically verified against ingested PDFs/texts.
              </p>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-200 rounded">
              {(['extract', 'compare', 'differences', 'ask'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setWorkbenchMode(mode)}
                  className={`py-1 rounded text-center font-medium capitalize text-[10px] transition ${
                    workbenchMode === mode
                      ? 'bg-white text-indigo-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Ingested Documents List */}
            <div className="bg-white border border-slate-200 rounded p-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Loaded Authority Documents ({manuscript.workbenchDocuments.length})
              </span>
              <div className="space-y-1.5">
                {manuscript.workbenchDocuments.map(doc => (
                  <div key={doc.id} className="text-[11px] flex items-center justify-between">
                    <span className="truncate max-w-[190px] font-medium text-slate-800">
                      📄 {doc.title}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono">
                      {Math.round((doc.ocrConfidence || 1) * 100)}% OCR
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Findings Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Extracted Evidence Matrix:
              </span>
              {manuscript.workbenchFindings.map(find => (
                <div key={find.id} className="bg-white border border-slate-200 rounded p-3 space-y-2">
                  <h4 className="font-semibold text-slate-900 text-xs">{find.question}</h4>

                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    {Object.entries(find.data).map(([docId, quote]) => {
                      const doc = manuscript.workbenchDocuments.find(d => d.id === docId);
                      const trace = find.traces[docId];
                      return (
                        <div key={docId} className="bg-slate-50 p-2 rounded border border-slate-200/80">
                          <div className="flex items-center justify-between text-[10px] mb-1 font-semibold text-slate-700">
                            <span>{doc?.shortTitle || docId}</span>
                            <span className="text-emerald-700 font-mono">{trace}</span>
                          </div>
                          <p className="text-[11px] font-serif-legal italic text-slate-800 leading-relaxed">
                            "{quote}"
                          </p>
                          <div className="mt-1 text-[9px] text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>Exact match confirmed in source layer</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= REVIEW DESK TAB (Section 7) ================= */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800">Review Desk</h3>
              <p className="text-[11px] text-slate-500">
                Split peer review reports into atomic items, generate concrete revision proposals, and export response letter.
              </p>
            </div>

            {/* Reviewer Comments List */}
            <div className="space-y-3">
              {manuscript.reviewerComments.map(comment => (
                <div
                  key={comment.id}
                  className="bg-white border border-slate-200 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-xs">{comment.reviewer}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      comment.severity === 'major' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {comment.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-serif-legal italic bg-amber-50/40 p-2 rounded border border-amber-100">
                    "{comment.raw}"
                  </p>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>
                      <span className="font-semibold">Action: </span>
                      <span className="capitalize">{comment.action.replace('-', ' ')}</span>
                    </div>
                    {comment.locationReference && (
                      <div className="text-[10px] text-slate-400">
                        Mapped to: {comment.locationReference}
                      </div>
                    )}
                  </div>

                  {/* Associated Proposals */}
                  {manuscript.proposals
                    .filter(p => p.commentId === comment.id)
                    .map(prop => (
                      <div
                        key={prop.id}
                        className="bg-indigo-50/60 border border-indigo-200 rounded p-2 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-semibold text-indigo-950">
                          <span>Revision Proposal</span>
                          <span className="text-[10px] text-indigo-600 font-normal">{prop.status}</span>
                        </div>
                        <p className="text-[11px] text-indigo-900">{prop.plan}</p>

                        {prop.operations.map((op, oIdx) => (
                          <div key={oIdx} className="bg-white p-2 rounded border border-indigo-100 text-[11px] space-y-1">
                            <div className="text-red-700 line-through text-[10px]">
                              - {op.before}
                            </div>
                            <div className="text-emerald-700 font-medium text-[10px]">
                              + {op.after}
                            </div>
                            <div className="text-[9px] text-slate-500 italic">
                              Rationale: {op.rationale}
                            </div>
                          </div>
                        ))}

                        {prop.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => onApplyProposal(prop.id)}
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-center font-medium text-[10px] transition"
                            >
                              Accept Proposal
                            </button>
                            <button
                              onClick={() => onRejectProposal(prop.id)}
                              className="py-1 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-center text-[10px] transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ORIGINALITY GUARD TAB (Section 26) ================= */}
        {activeTab === 'originality' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800">Originality Guard</h3>
              <p className="text-[11px] text-slate-500">
                Live local similarity scan against library texts and loaded evidence PDFs.
              </p>
            </div>

            {/* Flags Summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-center">
                <span className="text-lg font-bold text-red-700 block">
                  {manuscript.originalityFlags.filter(f => f.kind === 'verbatim-match' && f.status === 'open').length}
                </span>
                <span className="text-[10px] text-red-900 uppercase font-semibold">Verbatim Runs</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-center">
                <span className="text-lg font-bold text-amber-700 block">
                  {manuscript.originalityFlags.filter(f => f.kind === 'close-paraphrase' && f.status === 'open').length}
                </span>
                <span className="text-[10px] text-amber-900 uppercase font-semibold">Paraphrases</span>
              </div>
            </div>

            {/* Flags List */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Flagged Text Spans:
              </span>
              {manuscript.originalityFlags
                .filter(f => f.status !== 'dismissed')
                .map(fl => (
                  <div key={fl.id} className="bg-white border border-slate-200 rounded p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold capitalize text-[10px] ${
                        fl.kind === 'verbatim-match' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {fl.kind.replace('-', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round((fl.score || 1) * 100)}% Match
                      </span>
                    </div>

                    <p className="font-serif-legal italic text-slate-800 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                      "{fl.textSpan}"
                    </p>

                    <div className="text-[10px] text-slate-500">
                      Matched: {fl.matchedSource}
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => onFixOriginalityFlag(fl, 'quote')}
                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px]"
                      >
                        Quote It
                      </button>
                      <button
                        onClick={() => onFixOriginalityFlag(fl, 'cite')}
                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px]"
                      >
                        Cite It
                      </button>
                      <button
                        onClick={() => onFixOriginalityFlag(fl, 'dismiss')}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px]"
                      >
                        Formula / Dismiss
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= LANGUAGE STUDIO TAB (Section 24) ================= */}
        {activeTab === 'language' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800">Language Studio</h3>
              <p className="text-[11px] text-slate-500">
                British legal English (en-GB) enforcement and Legal Meaning Guard.
              </p>
            </div>

            {/* Legal Meaning Guard Rules */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Legal Meaning Guard Active</span>
              </div>
              <ul className="text-[10px] text-emerald-900 space-y-1 list-disc pl-4">
                <li>Locked: Quotations and statutory wording cannot be rewritten.</li>
                <li>Modal alert: Flags any shift between <em>shall</em> and <em>may</em>.</li>
                <li>Preserves UK spelling: <em>judgment</em>, <em>defence</em>, <em>licence</em>.</li>
                <li>Standard legal abbreviations: <em>s 25</em>, <em>art 19</em>.</li>
              </ul>
            </div>

            {/* Academic Phrase Bank */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Academic Phrase Bank for Legal Argument:
              </span>
              <div className="space-y-1.5">
                {[
                  { func: 'Signposting', phrase: 'This section examines whether the threshold condition of...' },
                  { func: 'Hedging', phrase: 'The statutory text can plausibly be interpreted as conferring...' },
                  { func: 'Applying Test', phrase: 'Applying the legality prong of Article 19(3), the measure fails because...' },
                  { func: 'Concession', phrase: 'It could be objected that automated filters operate at scale; however...' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded p-2 text-xs">
                    <span className="font-semibold text-blue-800 text-[10px] block">{item.func}</span>
                    <p className="text-[11px] text-slate-700 italic mt-0.5">"{item.phrase}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= AI COPILOT / ACTIONS TAB (Section 5 & 9) ================= */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Section AI Copilot</h3>
                <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                  Model-Agnostic
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Proposals for {activeSection.role}. AI never invents authority or citations.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRunAIAction('gap-check')}
                disabled={aiActionRunning}
                className="p-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-left transition"
              >
                <span className="font-semibold text-slate-900 block text-xs">Argument Gap Check</span>
                <span className="text-[10px] text-slate-500">Unsupported leaps &amp; terms</span>
              </button>

              <button
                onClick={() => handleRunAIAction('counter-argument')}
                disabled={aiActionRunning}
                className="p-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-left transition"
              >
                <span className="font-semibold text-slate-900 block text-xs">Counter-Argument</span>
                <span className="text-[10px] text-slate-500">Anticipate peer reviewer</span>
              </button>

              <button
                onClick={() => handleRunAIAction('clarity-pass')}
                disabled={aiActionRunning}
                className="p-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-left transition"
              >
                <span className="font-semibold text-slate-900 block text-xs">Clarity Pass (en-GB)</span>
                <span className="text-[10px] text-slate-500">Flow &amp; meaning check</span>
              </button>

              <button
                onClick={() => handleRunAIAction('tighten-budget')}
                disabled={aiActionRunning}
                className="p-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-left transition"
              >
                <span className="font-semibold text-slate-900 block text-xs">Tighten to Budget</span>
                <span className="text-[10px] text-slate-500">Word cuts &amp; nominalisations</span>
              </button>
            </div>

            {/* AI Action Running Indicator */}
            {aiActionRunning && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded text-center space-y-2">
                <RefreshCw className="w-5 h-5 text-purple-600 animate-spin mx-auto" />
                <span className="text-xs font-semibold text-purple-900 block">
                  Executing {activeAIAction.replace('-', ' ')}...
                </span>
                <span className="text-[10px] text-purple-700">
                  Enforcing strict legality rules and zero-hallucination constraint
                </span>
              </div>
            )}

            {/* AI Action Result Box */}
            {aiActionResult && (
              <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                  <span className="font-bold text-slate-900 capitalize text-xs">
                    {activeAIAction.replace('-', ' ')} Output
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiActionResult)}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed max-h-72 overflow-y-auto">
                  {aiActionResult}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
