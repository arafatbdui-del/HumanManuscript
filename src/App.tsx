/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * HumanManuscript: Main Legal & Human Rights Studio Application (design.md)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Manuscript, Section, Block, Footnote, Source, OriginalityFlag, Proposal } from './types/manuscript';
import {
  loadManuscript,
  saveManuscript,
  exportProjectBundle,
  exportToWordDocument,
  generateAIUseStatement,
} from './services/storage';
import { runFullOriginalityScan } from './services/originalityGuard';
import { TitleBar } from './components/TitleBar';
import { Ribbon, RibbonTab } from './components/Ribbon';
import { NavigationPane } from './components/NavigationPane';
import { EditorCanvas } from './components/EditorCanvas';
import { TaskPane, TaskPaneTab } from './components/TaskPane';
import { StatusBar } from './components/StatusBar';
import { AddSourceModal } from './components/modals/AddSourceModal';
import { ResponseLetterModal } from './components/modals/ResponseLetterModal';
import { PreSubmissionModal } from './components/modals/PreSubmissionModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { CommandSearchModal } from './components/modals/CommandSearchModal';
import { ContractInspectorModal } from './components/modals/ContractInspectorModal';

export default function App() {
  const [manuscript, setManuscript] = useState<Manuscript>(() => loadManuscript());
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const loaded = loadManuscript();
    return loaded.sections[2]?.id || loaded.sections[0]?.id || 'sec-intro';
  });
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('Home');
  const [activeTaskPaneTab, setActiveTaskPaneTab] = useState<TaskPaneTab>('citations');
  const [selectedFootnote, setSelectedFootnote] = useState<Footnote | null>(null);
  const [viewMode, setViewMode] = useState<'pages' | 'draft' | 'focus'>('pages');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState('Saved locally');

  // Modals state
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [isResponseLetterOpen, setIsResponseLetterOpen] = useState(false);
  const [isPreSubmissionOpen, setIsPreSubmissionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);
  const [contractInspectorSection, setContractInspectorSection] = useState<Section | null>(null);

  // Auto-Save Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveManuscript(manuscript);
      const now = new Date();
      setLastSavedText(`Saved ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      setIsSaving(false);
    }, manuscript.settings.autoSaveIntervalMs || 5000);

    return () => clearTimeout(timer);
  }, [manuscript]);

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+Alt+F, Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveManuscript(manuscript);
        setIsSaving(true);
        setTimeout(() => {
          setIsSaving(false);
          setLastSavedText('Saved now');
        }, 300);
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleInsertFootnote();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandSearchOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manuscript]);

  // Active section helper
  const activeSection = manuscript.sections.find(s => s.id === activeSectionId) || manuscript.sections[0];

  // Word metrics calculation
  const currentSectionWords = activeSection.blocks.reduce((acc, b) => {
    return acc + (b.content.trim().match(/\b\w+\b/g)?.length || 0);
  }, 0);

  const totalManuscriptWords = manuscript.sections.reduce((acc, s) => {
    return acc + s.blocks.reduce((bAcc, b) => bAcc + (b.content.match(/\b\w+\b/g)?.length || 0), 0);
  }, 0);

  const originalityRedCount = manuscript.originalityFlags.filter(
    f => f.kind === 'verbatim-match' && f.status === 'open'
  ).length;

  const originalityOrangeCount = manuscript.originalityFlags.filter(
    f => f.kind === 'close-paraphrase' && f.status === 'open'
  ).length;

  // Insert Footnote Handler
  const handleInsertFootnote = (targetBlockId?: string) => {
    const nextNumber = manuscript.footnotes.length + 1;
    const newFootnoteId = `fn_${Date.now()}`;

    // Target block: provided or first paragraph in active section
    const blockToAttach = targetBlockId
      ? activeSection.blocks.find(b => b.id === targetBlockId)
      : activeSection.blocks.find(b => b.type === 'paragraph') || activeSection.blocks[0];

    if (!blockToAttach) return;

    const newFootnote: Footnote = {
      id: newFootnoteId,
      number: nextNumber,
      blockId: blockToAttach.id,
      content: `Author footnote citation ${nextNumber}.`,
      citations: [],
    };

    // Append [fnX] marker to block
    const updatedContent = `${blockToAttach.content} [fn${nextNumber}]`;

    setManuscript(prev => ({
      ...prev,
      footnotes: [...prev.footnotes, newFootnote],
      sections: prev.sections.map(sec => {
        if (sec.id !== activeSection.id) return sec;
        return {
          ...sec,
          blocks: sec.blocks.map(b => (b.id === blockToAttach.id ? { ...b, content: updatedContent } : b)),
        };
      }),
    }));

    setSelectedFootnote(newFootnote);
    setActiveTaskPaneTab('citations');
  };

  // Update Block Content
  const handleUpdateBlockContent = (secId: string, blockId: string, newContent: string) => {
    setManuscript(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          blocks: sec.blocks.map(b => (b.id === blockId ? { ...b, content: newContent } : b)),
        };
      }),
    }));
  };

  // Add Paragraph Block to Section
  const handleAddBlock = (secId: string) => {
    const newBlockId = `blk_${Date.now()}`;
    const newBlock: Block = {
      id: newBlockId,
      sectionId: secId,
      order: 99,
      type: 'paragraph',
      content: 'New doctrinal paragraph formulating legal reasoning and applying primary authority...',
    };

    setManuscript(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          blocks: [...sec.blocks, newBlock],
        };
      }),
    }));
  };

  // Add New Section to Manuscript Skeleton
  const handleAddSection = () => {
    const secCount = manuscript.sections.length;
    const newSecId = `sec_${Date.now()}`;
    const newSection: Section = {
      id: newSecId,
      manuscriptId: manuscript.id,
      order: secCount + 1,
      role: 'Additional Analysis',
      title: `${secCount - 2}. Comparative & Empirical Observations`,
      wordTarget: 1500,
      status: 'drafting',
      contract: {
        role: 'Comparative Analysis',
        description: 'Examines comparative state practice and regional jurisprudence.',
        wordTarget: 1500,
        wordTolerance: 150,
        requiredMoves: ['comparative-jurisprudence', 'regional-instruments', 'synthesised-finding'],
        citationRules: ['Must cite primary domestic statutes or regional court judgments.'],
      },
      blocks: [
        {
          id: `blk_${Date.now()}`,
          sectionId: newSecId,
          order: 1,
          type: 'paragraph',
          content: 'A comparative inquiry across jurisdictions illustrates varied institutional responses to algorithmic content governance...',
        },
      ],
    };

    setManuscript(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setActiveSectionId(newSecId);
  };

  // Add Source to Verified Library
  const handleAddSource = (src: Source) => {
    setManuscript(prev => ({
      ...prev,
      sources: [src, ...prev.sources],
    }));
  };

  // Apply Revision Proposal from Review Desk
  const handleApplyProposal = (proposalId: string) => {
    const prop = manuscript.proposals.find(p => p.id === proposalId);
    if (!prop) return;

    let updatedSections = [...manuscript.sections];

    for (const op of prop.operations) {
      if (op.op === 'replace_text') {
        updatedSections = updatedSections.map(sec => ({
          ...sec,
          blocks: sec.blocks.map(b => {
            if (b.id === op.blockId) {
              const updatedText = b.content.includes(op.before)
                ? b.content.replace(op.before, op.after)
                : `${b.content}\n\n${op.after}`;
              return { ...b, content: updatedText };
            }
            return b;
          }),
        }));
      }
    }

    setManuscript(prev => ({
      ...prev,
      sections: updatedSections,
      proposals: prev.proposals.map(p => (p.id === proposalId ? { ...p, status: 'accepted' } : p)),
      reviewerComments: prev.reviewerComments.map(c =>
        c.id === prop.commentId ? { ...c, status: 'applied' } : c
      ),
      changeEvents: [
        {
          id: `chg_${Date.now()}`,
          timestamp: Date.now(),
          actor: { type: 'model', name: 'Gemini (Assistant)', model: prop.model },
          op: 'replace',
          target: { sectionId: activeSection.id, blockId: prop.operations[0]?.blockId || '' },
          before: prop.operations[0]?.before || '',
          after: prop.operations[0]?.after || '',
          reason: `Applied proposal for reviewer comment ${prop.commentId}`,
          commentId: prop.commentId,
          proposalId: prop.id,
          status: 'accepted',
        },
        ...prev.changeEvents,
      ],
    }));
  };

  // Reject Proposal
  const handleRejectProposal = (proposalId: string) => {
    setManuscript(prev => ({
      ...prev,
      proposals: prev.proposals.map(p => (p.id === proposalId ? { ...p, status: 'rejected' } : p)),
    }));
  };

  // Fix Originality Flag
  const handleFixOriginalityFlag = (flag: OriginalityFlag, fixType: 'quote' | 'cite' | 'dismiss') => {
    if (fixType === 'dismiss') {
      setManuscript(prev => ({
        ...prev,
        originalityFlags: prev.originalityFlags.map(f =>
          f.id === flag.id ? { ...f, status: 'dismissed' } : f
        ),
      }));
      return;
    }

    // If 'quote', wrap span in single quotes in the block text
    if (fixType === 'quote') {
      setManuscript(prev => ({
        ...prev,
        originalityFlags: prev.originalityFlags.map(f =>
          f.id === flag.id ? { ...f, status: 'fixed', kind: 'properly-quoted' } : f
        ),
        sections: prev.sections.map(sec => ({
          ...sec,
          blocks: sec.blocks.map(b => {
            if (b.id === flag.blockId) {
              const quoted = `'${flag.textSpan}'`;
              return { ...b, content: b.content.replace(flag.textSpan, quoted) };
            }
            return b;
          }),
        })),
      }));
    } else if (fixType === 'cite') {
      // Attach footnote citation
      handleInsertFootnote(flag.blockId);
      setManuscript(prev => ({
        ...prev,
        originalityFlags: prev.originalityFlags.map(f =>
          f.id === flag.id ? { ...f, status: 'fixed' } : f
        ),
      }));
    }
  };

  // Run Full Originality Scan
  const handleRunOriginalityScan = () => {
    const updatedFlags = runFullOriginalityScan(manuscript);
    setManuscript(prev => ({
      ...prev,
      originalityFlags: updatedFlags,
    }));
    setActiveTaskPaneTab('originality');
  };

  // Update Contract
  const handleUpdateContract = (secId: string, updatedContract: Section['contract']) => {
    setManuscript(prev => ({
      ...prev,
      sections: prev.sections.map(s => (s.id === secId ? { ...s, contract: updatedContract, wordTarget: updatedContract.wordTarget } : s)),
    }));
  };

  // Update Footnote content
  const handleUpdateFootnoteContent = (fnId: string, newContent: string) => {
    setManuscript(prev => ({
      ...prev,
      footnotes: prev.footnotes.map(f => (f.id === fnId ? { ...f, content: newContent } : f)),
    }));
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Manuscript['settings']) => {
    setManuscript(prev => ({
      ...prev,
      settings: newSettings,
    }));
  };

  // Download AI statement
  const handleExportAIStatement = () => {
    const stmt = generateAIUseStatement(manuscript);
    const blob = new Blob([stmt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Use_Disclosure_${manuscript.journalProfile.name.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* 1. Native Windows 10 Title Bar with PWA Install Button */}
      <TitleBar
        documentTitle={manuscript.title}
        onSave={() => {
          saveManuscript(manuscript);
          setIsSaving(true);
          setTimeout(() => {
            setIsSaving(false);
            setLastSavedText('Saved now');
          }, 300);
        }}
        onBackup={() => exportProjectBundle(manuscript)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSaving={isSaving}
        lastSavedText={lastSavedText}
      />

      {/* 2. Word-Inspired Ribbon Toolbar */}
      <Ribbon
        activeTab={activeRibbonTab}
        onSelectTab={setActiveRibbonTab}
        onInsertFootnote={() => handleInsertFootnote()}
        onOpenAddSource={() => setIsAddSourceOpen(true)}
        onToggleTrackChanges={() => {
          setManuscript(prev => ({
            ...prev,
            settings: { ...prev.settings, trackChanges: !prev.settings.trackChanges },
          }));
        }}
        trackChangesActive={manuscript.settings.trackChanges}
        onOpenReviewDesk={() => {
          setActiveRibbonTab('Review');
          setActiveTaskPaneTab('review');
        }}
        onOpenEvidenceWorkbench={() => {
          setActiveRibbonTab('Research');
          setActiveTaskPaneTab('workbench');
        }}
        onRunCitationAudit={() => {
          setActiveRibbonTab('References');
          setActiveTaskPaneTab('citations');
        }}
        onRunOriginalityScan={handleRunOriginalityScan}
        onOpenLanguageStudio={() => {
          setActiveRibbonTab('Language');
          setActiveTaskPaneTab('language');
        }}
        onOpenPreSubmissionChecklist={() => setIsPreSubmissionOpen(true)}
        onExportWord={() => exportToWordDocument(manuscript, manuscript.settings.trackChanges)}
        onExportResponseLetter={() => setIsResponseLetterOpen(true)}
        onExportAIStatement={handleExportAIStatement}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onOpenCommandSearch={() => setIsCommandSearchOpen(true)}
      />

      {/* 3. Main Workspace Area: Navigation Pane | Center Page Canvas | Task Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Pane (Headings tree & contract budget) */}
        {viewMode !== 'focus' && (
          <NavigationPane
            sections={manuscript.sections}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            onAddSection={handleAddSection}
            onOpenContractInspector={sec => setContractInspectorSection(sec)}
          />
        )}

        {/* Center Canvas (Word paper pages layout with footnotes & originality marks) */}
        <EditorCanvas
          sections={manuscript.sections}
          activeSectionId={activeSectionId}
          footnotes={manuscript.footnotes}
          sources={manuscript.sources}
          originalityFlags={manuscript.originalityFlags}
          viewMode={viewMode}
          zoomLevel={zoomLevel}
          trackChangesActive={manuscript.settings.trackChanges}
          onUpdateBlockContent={handleUpdateBlockContent}
          onInsertFootnoteAtBlock={handleInsertFootnote}
          onSelectFootnote={fn => {
            setSelectedFootnote(fn);
            setActiveTaskPaneTab('citations');
          }}
          onFixOriginalityFlag={handleFixOriginalityFlag}
          onAddBlock={handleAddBlock}
        />

        {/* Right Contextual Task Pane (Library, Evidence Workbench, Review Desk, Language Studio, AI Copilot) */}
        {viewMode !== 'focus' && (
          <TaskPane
            activeTab={activeTaskPaneTab}
            onSelectTab={setActiveTaskPaneTab}
            manuscript={manuscript}
            activeSection={activeSection}
            selectedFootnote={selectedFootnote}
            onSelectFootnote={setSelectedFootnote}
            onOpenAddSource={() => setIsAddSourceOpen(true)}
            onApplyProposal={handleApplyProposal}
            onRejectProposal={handleRejectProposal}
            onUpdateFootnoteContent={handleUpdateFootnoteContent}
            onFixOriginalityFlag={handleFixOriginalityFlag}
          />
        )}
      </div>

      {/* 4. Bottom Word-Style Status Bar */}
      <StatusBar
        currentSectionWords={currentSectionWords}
        sectionTargetWords={activeSection.wordTarget}
        totalManuscriptWords={totalManuscriptWords}
        originalityRedCount={originalityRedCount}
        originalityOrangeCount={originalityOrangeCount}
        trackChangesActive={manuscript.settings.trackChanges}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        lastBackupText={lastSavedText}
      />

      {/* 5. Modals */}
      <AddSourceModal
        isOpen={isAddSourceOpen}
        onClose={() => setIsAddSourceOpen(false)}
        onAddSource={handleAddSource}
      />

      <ResponseLetterModal
        isOpen={isResponseLetterOpen}
        onClose={() => setIsResponseLetterOpen(false)}
        manuscript={manuscript}
      />

      <PreSubmissionModal
        isOpen={isPreSubmissionOpen}
        onClose={() => setIsPreSubmissionOpen(false)}
        manuscript={manuscript}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        manuscript={manuscript}
        onUpdateSettings={handleUpdateSettings}
      />

      <CommandSearchModal
        isOpen={isCommandSearchOpen}
        onClose={() => setIsCommandSearchOpen(false)}
        manuscript={manuscript}
        onSelectSection={setActiveSectionId}
        onOpenAddSource={() => setIsAddSourceOpen(true)}
        onInsertFootnote={() => handleInsertFootnote()}
      />

      <ContractInspectorModal
        isOpen={!!contractInspectorSection}
        onClose={() => setContractInspectorSection(null)}
        section={contractInspectorSection}
        onUpdateContract={handleUpdateContract}
      />
    </div>
  );
}
