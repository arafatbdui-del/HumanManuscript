/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Microsoft Word-Inspired Legal Canvas with Footnote Marks, Track Changes & Originality Underlines
 */

import React, { useState } from 'react';
import { Section, Block, Footnote, OriginalityFlag, Source } from '../types/manuscript';
import {
  MessageSquare,
  AlertTriangle,
  Bookmark,
  Check,
  X,
  Sparkles,
  ShieldAlert,
  Quote,
  Plus,
  Trash2,
} from 'lucide-react';

interface EditorCanvasProps {
  sections: Section[];
  activeSectionId: string;
  footnotes: Footnote[];
  sources: Source[];
  originalityFlags: OriginalityFlag[];
  viewMode: 'pages' | 'draft' | 'focus';
  zoomLevel: number;
  trackChangesActive: boolean;
  onUpdateBlockContent: (sectionId: string, blockId: string, newContent: string) => void;
  onInsertFootnoteAtBlock: (blockId: string) => void;
  onSelectFootnote: (fn: Footnote) => void;
  onFixOriginalityFlag: (flag: OriginalityFlag, fixType: 'quote' | 'cite' | 'dismiss') => void;
  onAddBlock: (sectionId: string) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  sections,
  activeSectionId,
  footnotes,
  sources,
  originalityFlags,
  viewMode,
  zoomLevel,
  trackChangesActive,
  onUpdateBlockContent,
  onInsertFootnoteAtBlock,
  onSelectFootnote,
  onFixOriginalityFlag,
  onAddBlock,
}) => {
  const [activeFlagPopover, setActiveFlagPopover] = useState<OriginalityFlag | null>(null);

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  // Helper to render text with clickable footnote superscripts [fn1] and originality flags
  const renderInteractiveBlock = (block: Block) => {
    const raw = block.content;
    const parts = raw.split(/(\[fn\d+\])/g);

    // Find if there are originality flags on this block
    const blockFlags = originalityFlags.filter(f => f.blockId === block.id && f.status !== 'dismissed');

    return (
      <div className="relative group">
        <p className="font-serif-legal text-[15px] leading-[1.85] text-slate-900 tracking-[0.01em] text-justify selection:bg-amber-200">
          {parts.map((part, pIdx) => {
            const match = part.match(/\[fn(\d+)\]/);
            if (match) {
              const fnNum = parseInt(match[1], 10);
              const fnObj = footnotes.find(f => f.number === fnNum) || footnotes[fnNum - 1];

              return (
                <button
                  key={pIdx}
                  onClick={() => fnObj && onSelectFootnote(fnObj)}
                  className="inline-flex items-center text-blue-700 hover:text-blue-900 font-semibold px-0.5 text-xs select-none cursor-pointer align-super transition-colors hover:underline"
                  title={fnObj ? `Footnote ${fnNum}: ${fnObj.content}` : `Footnote ${fnNum}`}
                >
                  [{fnNum}]
                </button>
              );
            }

            // Normal text span: Check for underline flags
            let isFlagged = false;
            let currentFlag: OriginalityFlag | undefined;

            for (const fl of blockFlags) {
              if (part.toLowerCase().includes(fl.textSpan.toLowerCase())) {
                isFlagged = true;
                currentFlag = fl;
                break;
              }
            }

            if (isFlagged && currentFlag) {
              const flagColor =
                currentFlag.kind === 'verbatim-match'
                  ? 'decoration-red-500 text-red-950 bg-red-50/70 border-b-2 border-red-500'
                  : currentFlag.kind === 'close-paraphrase'
                  ? 'decoration-amber-500 bg-amber-50/70 border-b-2 border-amber-500'
                  : currentFlag.kind === 'unreviewed-ai'
                  ? 'decoration-purple-500 bg-purple-50/70 border-b-2 border-purple-500'
                  : 'decoration-slate-400 bg-slate-50 border-b border-slate-400';

              return (
                <span
                  key={pIdx}
                  onClick={() => setActiveFlagPopover(currentFlag)}
                  className={`cursor-pointer ${flagColor} transition-all rounded-xs px-0.5`}
                  title={`Originality Alert: ${currentFlag.kind} (${currentFlag.matchedSource || ''})`}
                >
                  {part}
                </span>
              );
            }

            return <span key={pIdx}>{part}</span>;
          })}
        </p>

        {/* Hover action toolbar for legal block */}
        <div className="absolute right-0 top-0 -mr-14 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white shadow-sm border border-slate-200 rounded p-0.5 text-slate-500 no-print">
          <button
            onClick={() => onInsertFootnoteAtBlock(block.id)}
            title="Add footnote to this paragraph (Ctrl+Alt+F)"
            className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded text-xs"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Flag Margin Marker if any */}
        {blockFlags.length > 0 && (
          <div className="absolute -left-7 top-1 flex flex-col gap-1 no-print">
            {blockFlags.map(fl => (
              <button
                key={fl.id}
                onClick={() => setActiveFlagPopover(fl)}
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white shadow-2xs ${
                  fl.kind === 'verbatim-match' ? 'bg-red-600' : 'bg-amber-500'
                }`}
                title="Click to view match & one-click fixes"
              >
                !
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-200/80 overflow-y-auto flex flex-col items-center py-6 px-4 select-text relative">
      {/* Zoom Container */}
      <div
        className={`transition-all duration-150 w-full flex flex-col items-center`}
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
      >
        {/* Word Document Page (A4 Paper Representation) */}
        <div
          className={`bg-white text-slate-900 border border-slate-300/80 transition-all ${
            viewMode === 'pages'
              ? 'w-[820px] min-h-[1050px] p-16 word-page-shadow my-4 rounded-xs'
              : 'w-full max-w-4xl p-8 rounded-lg shadow-sm my-2'
          }`}
        >
          {/* Page Running Header in Pages View */}
          {viewMode === 'pages' && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-serif pb-6 mb-8 border-b border-slate-100 select-none">
              <span className="italic truncate max-w-md">{activeSection.title}</span>
              <span>Oxford Journal of Legal Studies / HRLR</span>
            </div>
          )}

          {/* Section Heading */}
          <div className="mb-6">
            <h2 className="font-serif-legal font-bold text-2xl text-slate-900 tracking-tight leading-snug">
              {activeSection.title}
            </h2>
            {activeSection.role !== 'Title & Metadata' && (
              <div className="flex items-center gap-3 text-xs text-slate-400 font-sans mt-1 select-none">
                <span className="uppercase tracking-wider font-semibold text-slate-500">
                  {activeSection.role}
                </span>
                <span>•</span>
                <span>Target: {activeSection.wordTarget} words</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">British English (en-GB)</span>
              </div>
            )}
          </div>

          {/* Editable Paragraph Blocks */}
          <div className="space-y-6">
            {activeSection.blocks.map(block => (
              <div key={block.id} className="relative">
                {block.type === 'heading2' ? (
                  <h3 className="font-serif-legal font-bold text-lg text-slate-800 mt-6 mb-2">
                    {block.content}
                  </h3>
                ) : (
                  renderInteractiveBlock(block)
                )}
              </div>
            ))}
          </div>

          {/* Add Block button in this section */}
          <div className="mt-8 pt-4 border-t border-dashed border-slate-200 no-print flex justify-center">
            <button
              onClick={() => onAddBlock(activeSection.id)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Paragraph to {activeSection.role}</span>
            </button>
          </div>

          {/* Footnotes Divider & Bottom Section (True to legal journal format) */}
          {footnotes.length > 0 && (
            <div className="mt-16 pt-6 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-3 select-none">
                <div className="w-24 h-px bg-slate-900" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Footnotes (OSCOLA Standard)
                </span>
              </div>

              <div className="space-y-2 text-xs font-serif-legal text-slate-700 leading-relaxed">
                {footnotes.map(fn => (
                  <div
                    key={fn.id}
                    onClick={() => onSelectFootnote(fn)}
                    className="flex items-start gap-2 hover:bg-blue-50/60 p-1.5 rounded cursor-pointer transition group"
                  >
                    <span className="font-bold text-slate-900 shrink-0 w-5 text-right font-sans">
                      {fn.number}.
                    </span>
                    <div className="flex-1">
                      <span>{fn.content}</span>
                      {fn.citations.length > 0 && (
                        <div className="text-[10px] text-blue-700 font-sans mt-0.5 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Linked to library record: {fn.citations[0].sourceId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page Running Footer in Pages View */}
          {viewMode === 'pages' && (
            <div className="mt-12 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-serif select-none">
              <span>HumanManuscript — Scopus Pre-Submission Draft</span>
              <span className="font-mono">Page 1</span>
            </div>
          )}
        </div>
      </div>

      {/* Originality Match Popover Modal */}
      {activeFlagPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-md w-full p-5 text-slate-800">
            <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h4 className="font-bold text-sm capitalize">
                  {activeFlagPopover.kind.replace('-', ' ')}
                </h4>
              </div>
              <button
                onClick={() => setActiveFlagPopover(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-2">Matched text span in manuscript:</p>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs font-serif-legal italic text-slate-800 mb-3">
              "{activeFlagPopover.textSpan}"
            </div>

            {activeFlagPopover.matchedSource && (
              <div className="text-xs text-slate-600 mb-4 bg-amber-50/60 p-2 rounded border border-amber-200">
                <span className="font-semibold block text-amber-900">Source:</span>
                <span>{activeFlagPopover.matchedSource}</span>
                {activeFlagPopover.matchedPassage && (
                  <p className="mt-1 text-[11px] text-slate-500 italic">
                    {activeFlagPopover.matchedPassage}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                One-Click Fixes (Section 26.3):
              </span>
              <button
                onClick={() => {
                  onFixOriginalityFlag(activeFlagPopover, 'quote');
                  setActiveFlagPopover(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-medium transition"
              >
                <span>Quote It (Wrap in single quotes &amp; link citation)</span>
                <Quote className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  onFixOriginalityFlag(activeFlagPopover, 'cite');
                  setActiveFlagPopover(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-medium transition"
              >
                <span>Cite It (Attach verified footnote to source)</span>
                <Bookmark className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  onFixOriginalityFlag(activeFlagPopover, 'dismiss');
                  setActiveFlagPopover(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition"
              >
                <span>Standard Legal Formula / Dismiss</span>
                <Check className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
