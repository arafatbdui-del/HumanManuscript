/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Word-Style Navigation Pane with Section Contracts & Word Budgets (design.md)
 */

import React, { useState } from 'react';
import { Section } from '../types/manuscript';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  Shield,
  Target,
} from 'lucide-react';

interface NavigationPaneProps {
  sections: Section[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onAddSection: () => void;
  onOpenContractInspector: (sec: Section) => void;
}

export const NavigationPane: React.FC<NavigationPaneProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onOpenContractInspector,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Helper to count words in a section
  const getSectionWordCount = (sec: Section) => {
    return sec.blocks.reduce((acc, b) => {
      const words = b.content.trim().match(/\b\w+\b/g);
      return acc + (words ? words.length : 0);
    }, 0);
  };

  const getStatusBadge = (status: Section['status']) => {
    switch (status) {
      case 'complete':
        return (
          <span title="Section complete">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </span>
        );
      case 'revising':
        return (
          <span title="Revising / Peer review">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </span>
        );
      case 'drafting':
        return (
          <span title="Drafting in progress">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </span>
        );
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-300" title="Not started" />;
    }
  };

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];
  const activeWords = activeSection ? getSectionWordCount(activeSection) : 0;
  const wordPercent = activeSection ? Math.min(100, Math.round((activeWords / activeSection.wordTarget) * 100)) : 0;

  return (
    <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col h-full select-none no-print">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-100/70">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Navigation</span>
        </div>
        <button
          onClick={onAddSection}
          className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-200 rounded transition"
          title="Add New Section to Skeleton"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Headings Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
          Headings &amp; Skeleton
        </div>

        {sections.map(sec => {
          const isSelected = sec.id === activeSectionId;
          const words = getSectionWordCount(sec);
          const isOverBudget = words > sec.wordTarget * 1.15;

          return (
            <div
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`group flex items-start gap-2 p-2 rounded cursor-pointer transition text-xs ${
                isSelected
                  ? 'bg-blue-100/70 text-blue-950 font-semibold border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className="mt-0.5 shrink-0">{getStatusBadge(sec.status)}</div>

              <div className="flex-1 min-w-0">
                <div className="truncate leading-snug">{sec.title}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span className="capitalize">{sec.role}</span>
                  <span className={isOverBudget ? 'text-amber-600 font-semibold' : ''}>
                    {words} / {sec.wordTarget}w
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Section Contract Widget */}
      {activeSection && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
              <Target className="w-3 h-3 text-blue-600" />
              Contract Budget
            </span>
            <button
              onClick={() => onOpenContractInspector(activeSection)}
              className="text-[10px] text-blue-600 hover:underline"
            >
              Rules
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
            <div
              className={`h-full transition-all ${
                wordPercent > 100 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, wordPercent)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{activeWords} words</span>
            <span>Target: {activeSection.wordTarget}w</span>
          </div>

          {/* Rhetorical Moves list */}
          <div className="mt-2 text-[10px] text-slate-600 space-y-0.5">
            <span className="font-semibold text-slate-700 block">Required Moves:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {activeSection.contract.requiredMoves.map(mv => (
                <span
                  key={mv}
                  className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-600"
                >
                  ✓ {mv}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
