/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Microsoft Word-Inspired Ribbon Component with Law & Human Rights Tabs
 */

import React from 'react';
import {
  FileText,
  Bookmark,
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Eye,
  Search,
  PlusCircle,
  Download,
  Upload,
  Printer,
  History,
  FileCheck,
  Layers,
  Scale,
  Split,
  MessageSquare,
  AlertTriangle,
  Feather,
  BookMarked,
  Sliders,
} from 'lucide-react';

export type RibbonTab =
  | 'File'
  | 'Home'
  | 'Insert'
  | 'References'
  | 'Research'
  | 'Review'
  | 'Language'
  | 'Originality'
  | 'View';

interface RibbonProps {
  activeTab: RibbonTab;
  onSelectTab: (tab: RibbonTab) => void;
  onInsertFootnote: () => void;
  onOpenAddSource: () => void;
  onOpenUploadModal: () => void;
  onOpenImportReferences: () => void;
  onToggleTrackChanges: () => void;
  trackChangesActive: boolean;
  onOpenReviewDesk: () => void;
  onOpenEvidenceWorkbench: () => void;
  onRunCitationAudit: () => void;
  onRunOriginalityScan: () => void;
  onOpenLanguageStudio: () => void;
  onOpenPreSubmissionChecklist: () => void;
  onExportWord: () => void;
  onExportResponseLetter: () => void;
  onExportAIStatement: () => void;
  viewMode: 'pages' | 'draft' | 'focus';
  onSetViewMode: (mode: 'pages' | 'draft' | 'focus') => void;
  onOpenCommandSearch: () => void;
}

export const Ribbon: React.FC<RibbonProps> = ({
  activeTab,
  onSelectTab,
  onInsertFootnote,
  onOpenAddSource,
  onOpenUploadModal,
  onOpenImportReferences,
  onToggleTrackChanges,
  trackChangesActive,
  onOpenReviewDesk,
  onOpenEvidenceWorkbench,
  onRunCitationAudit,
  onRunOriginalityScan,
  onOpenLanguageStudio,
  onOpenPreSubmissionChecklist,
  onExportWord,
  onExportResponseLetter,
  onExportAIStatement,
  viewMode,
  onSetViewMode,
  onOpenCommandSearch,
}) => {
  const tabs: RibbonTab[] = [
    'File',
    'Home',
    'Insert',
    'References',
    'Research',
    'Review',
    'Language',
    'Originality',
    'View',
  ];

  return (
    <div className="bg-slate-50 border-b border-slate-200 select-none no-print">
      {/* Tab Strip */}
      <div className="flex items-center justify-between px-3 pt-1 border-b border-slate-200/80 bg-slate-100/60">
        <div className="flex items-center space-x-0.5">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onSelectTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-all relative ${
                  isActive
                    ? 'bg-slate-50 text-blue-900 border-t-2 border-t-blue-600 border-x border-slate-200 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab === 'File' ? (
                  <span className="text-blue-700 font-bold">File</span>
                ) : (
                  tab
                )}
                {/* Active indicator dot for tabs with actionable items */}
                {tab === 'Review' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                {tab === 'Originality' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Global Search Box (Ctrl+K) */}
        <button
          onClick={onOpenCommandSearch}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-500 bg-white hover:bg-slate-50 rounded border border-slate-200 shadow-2xs hover:border-slate-300 transition my-0.5"
          title="Search tools, commands, or legal citations (Ctrl+K)"
        >
          <Search className="w-3 h-3 text-slate-400" />
          <span className="hidden sm:inline">Search commands or sources...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] bg-slate-100 rounded text-slate-400 border border-slate-200 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Tab Groups / Button Ribbon Toolbar */}
      <div className="h-24 px-4 py-2 flex items-center gap-4 overflow-x-auto text-slate-700">
        {/* FILE TAB */}
        {activeTab === 'File' && (
          <>
            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
              <button
                onClick={onOpenUploadModal}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition shadow-2xs"
                title="Upload .docx, .pdf, or .txt"
              >
                <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-[11px] font-semibold leading-tight text-center">Upload Doc</span>
              </button>
              <button
                onClick={onExportWord}
                className="flex flex-col items-center justify-center p-1.5 w-16 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <Download className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Export .DOCX</span>
              </button>
              <button
                onClick={onOpenPreSubmissionChecklist}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <FileCheck className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Submission Checklist</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
              <button
                onClick={onExportResponseLetter}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <MessageSquare className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Response Letter</span>
              </button>
              <button
                onClick={onExportAIStatement}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <ShieldCheck className="w-5 h-5 text-amber-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">AI Disclosure</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex flex-col items-center justify-center p-1.5 w-16 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <Printer className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Print / PDF</span>
              </button>
            </div>
          </>
        )}

        {/* HOME TAB */}
        {activeTab === 'Home' && (
          <>
            {/* Clipboard & Styles */}
            <div className="flex flex-col gap-1 pr-3 border-r border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Paragraph Style</span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 text-xs bg-white border border-slate-200 rounded font-serif hover:bg-slate-100">
                  Normal (12pt)
                </button>
                <button className="px-2 py-1 text-xs bg-white border border-slate-200 rounded font-bold hover:bg-slate-100">
                  Heading 1
                </button>
                <button className="px-2 py-1 text-xs bg-white border border-slate-200 rounded italic hover:bg-slate-100">
                  Heading 2
                </button>
              </div>
            </div>

            {/* Quick Insert Footnote */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onInsertFootnote}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded bg-blue-50/70 hover:bg-blue-100 text-blue-900 border border-blue-200/80 transition"
                title="Insert Footnote (Ctrl+Alt+F)"
              >
                <BookOpen className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Insert Footnote</span>
              </button>
            </div>

            {/* Track Changes Toggle */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onToggleTrackChanges}
                className={`flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded transition border ${
                  trackChangesActive
                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <History className={`w-5 h-5 mb-1 ${trackChangesActive ? 'text-amber-600 animate-spin-slow' : 'text-slate-500'}`} />
                <span className="text-[11px] font-medium leading-tight text-center">
                  Track Changes: {trackChangesActive ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* View Mode Switching */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Canvas View</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSetViewMode('pages')}
                  className={`px-2 py-1 text-xs rounded border transition ${
                    viewMode === 'pages' ? 'bg-blue-600 text-white border-blue-600 font-medium' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Pages View
                </button>
                <button
                  onClick={() => onSetViewMode('draft')}
                  className={`px-2 py-1 text-xs rounded border transition ${
                    viewMode === 'draft' ? 'bg-blue-600 text-white border-blue-600 font-medium' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Draft View
                </button>
              </div>
            </div>
          </>
        )}

        {/* INSERT TAB */}
        {activeTab === 'Insert' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onInsertFootnote}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <Bookmark className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Footnote [fn]</span>
              </button>
              <button
                onClick={onOpenAddSource}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <PlusCircle className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Add Source</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={() => {}}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <Scale className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Legal Claim</span>
              </button>
              <button
                onClick={() => {}}
                className="flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <Feather className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Block Quote</span>
              </button>
            </div>
          </>
        )}

        {/* REFERENCES TAB */}
        {activeTab === 'References' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onOpenImportReferences}
                className="flex flex-col items-center justify-center p-1.5 w-24 h-18 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition shadow-2xs"
                title="Import .bib or .ris references from Mendeley"
              >
                <BookMarked className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-[11px] font-semibold leading-tight text-center">Import Mendeley</span>
              </button>
              <button
                onClick={onOpenAddSource}
                className="flex flex-col items-center justify-center p-1.5 w-20 h-18 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition"
              >
                <PlusCircle className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">+ Source (DOI/URL)</span>
              </button>
              <button
                onClick={onRunCitationAudit}
                className="flex flex-col items-center justify-center p-1.5 w-20 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <ShieldCheck className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">10-Point Audit</span>
              </button>
            </div>

            {/* Citation Style Selector */}
            <div className="flex flex-col gap-1 pr-3 border-r border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Citation Style</span>
              <select className="text-xs bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800">
                <option value="OSCOLA">OSCOLA (Law Journals)</option>
                <option value="Chicago">Chicago Notes &amp; Bib</option>
                <option value="Bluebook">Bluebook Standard</option>
                <option value="Harvard">Harvard Law</option>
              </select>
              <span className="text-[10px] text-slate-400">Short forms: ibid, supra active</span>
            </div>
          </>
        )}

        {/* RESEARCH TAB (Evidence Workbench & Literature Map) */}
        {activeTab === 'Research' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onOpenEvidenceWorkbench}
                className="flex flex-col items-center justify-center p-1.5 w-24 h-18 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition shadow-xs"
              >
                <Scale className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-[11px] font-semibold leading-tight text-center">Evidence Workbench</span>
              </button>
              <button
                onClick={onOpenEvidenceWorkbench}
                className="flex flex-col items-center justify-center p-1.5 w-20 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <Split className="w-5 h-5 text-purple-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Compare Sources</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Workbench Integrity</span>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Source-only: zero hallucinations
              </span>
              <span className="text-[10px] text-slate-400">Exact passage verification active</span>
            </div>
          </>
        )}

        {/* REVIEW TAB (Review Desk & Snapshots) */}
        {activeTab === 'Review' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onOpenReviewDesk}
                className="flex flex-col items-center justify-center p-1.5 w-22 h-18 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition shadow-xs"
              >
                <MessageSquare className="w-5 h-5 text-amber-600 mb-1" />
                <span className="text-[11px] font-semibold leading-tight text-center">Review Desk (Peer Review)</span>
              </button>
              <button
                onClick={onExportResponseLetter}
                className="flex flex-col items-center justify-center p-1.5 w-20 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <FileText className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Response Table</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onToggleTrackChanges}
                className="flex flex-col items-center justify-center p-1.5 w-20 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <History className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Track Changes</span>
              </button>
            </div>
          </>
        )}

        {/* LANGUAGE TAB (Language Studio) */}
        {activeTab === 'Language' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onOpenLanguageStudio}
                className="flex flex-col items-center justify-center p-1.5 w-22 h-18 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition"
              >
                <Feather className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[11px] font-semibold leading-tight text-center">Language Studio</span>
              </button>
            </div>

            <div className="flex flex-col gap-1 pr-3 border-r border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Legal Meaning Guard</span>
              <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Modal verbs: shall/may locked
              </span>
              <span className="text-[10px] text-slate-500">Spelling: British English (en-GB)</span>
            </div>
          </>
        )}

        {/* ORIGINALITY TAB (Originality Guard) */}
        {activeTab === 'Originality' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={onRunOriginalityScan}
                className="flex flex-col items-center justify-center p-1.5 w-22 h-18 rounded bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition shadow-xs"
              >
                <ShieldCheck className="w-5 h-5 text-rose-600 mb-1" />
                <span className="text-[11px] font-semibold leading-tight text-center">Scan Originality</span>
              </button>
              <button
                onClick={onExportAIStatement}
                className="flex flex-col items-center justify-center p-1.5 w-20 h-18 rounded hover:bg-slate-100 text-slate-700 transition"
              >
                <BookMarked className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[11px] font-medium leading-tight text-center">Authorship Pack</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Live Margin Underlines</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-600" /> Verbatim
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Paraphrase
                </span>
                <span className="flex items-center gap-1 text-purple-600">
                  <span className="w-2 h-2 rounded-full bg-purple-600" /> Unreviewed AI
                </span>
              </div>
            </div>
          </>
        )}

        {/* VIEW TAB */}
        {activeTab === 'View' && (
          <>
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <button
                onClick={() => onSetViewMode('pages')}
                className={`flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded transition border ${
                  viewMode === 'pages' ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                <FileText className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[11px] leading-tight text-center">Pages View</span>
              </button>
              <button
                onClick={() => onSetViewMode('draft')}
                className={`flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded transition border ${
                  viewMode === 'draft' ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                <Layers className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[11px] leading-tight text-center">Draft View</span>
              </button>
              <button
                onClick={() => onSetViewMode('focus')}
                className={`flex flex-col items-center justify-center p-1.5 w-18 h-18 rounded transition border ${
                  viewMode === 'focus' ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                <Eye className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-[11px] leading-tight text-center">Focus Mode</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
