/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quick Command & Legal Search Palette (Ctrl+K)
 */

import React, { useState, useEffect } from 'react';
import { Manuscript, Section, Source } from '../../types/manuscript';
import { Search, FileText, BookOpen, MessageSquare, Scale, Plus } from 'lucide-react';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscript: Manuscript;
  onSelectSection: (secId: string) => void;
  onOpenAddSource: () => void;
  onInsertFootnote: () => void;
}

export const CommandSearchModal: React.FC<CommandSearchModalProps> = ({
  isOpen,
  onClose,
  manuscript,
  onSelectSection,
  onOpenAddSource,
  onInsertFootnote,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle or open
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search sections
  const matchedSections = manuscript.sections.filter(
    s => s.title.toLowerCase().includes(q) || s.blocks.some(b => b.content.toLowerCase().includes(q))
  );

  // Search sources
  const matchedSources = manuscript.sources.filter(
    s => s.title.toLowerCase().includes(q) || s.authors.some(a => a.toLowerCase().includes(q))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-xl w-full p-4 text-slate-800">
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command, section title, case, or treaty..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-3 text-xs">
          {/* Quick Actions */}
          {!q && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 block mb-1">
                Common Legal Actions
              </span>
              <button
                onClick={() => {
                  onInsertFootnote();
                  onClose();
                }}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-blue-50 text-slate-800 text-left transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Insert Footnote (Ctrl+Alt+F)</span>
              </button>
              <button
                onClick={() => {
                  onOpenAddSource();
                  onClose();
                }}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-blue-50 text-slate-800 text-left transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Source by DOI or URL</span>
              </button>
            </div>
          )}

          {/* Matched Sections */}
          {matchedSections.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 block mb-1">
                Manuscript Sections
              </span>
              {matchedSections.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelectSection(s.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-100 text-slate-800 text-left transition"
                >
                  <span className="font-medium">{s.title}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{s.role}</span>
                </button>
              ))}
            </div>
          )}

          {/* Matched Sources */}
          {matchedSources.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 block mb-1">
                Verified Sources
              </span>
              {matchedSources.map(src => (
                <div
                  key={src.id}
                  className="p-2 rounded bg-slate-50 border border-slate-200 text-left space-y-0.5"
                >
                  <div className="font-semibold text-slate-900">{src.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {src.authors.join(', ')} ({src.year}) • {src.kind}
                  </div>
                </div>
              ))}
            </div>
          )}

          {q && matchedSections.length === 0 && matchedSources.length === 0 && (
            <div className="py-6 text-center text-slate-400">
              No matching sections or sources found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
