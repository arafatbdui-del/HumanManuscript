/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * HumanManuscript: Main Legal & Human Rights Studio Application (design.md)
 * Fully functional rich-text editor (TipTap), Word document parser (Mammoth),
 * PDF parser (PDF.js), and Mendeley reference importer (.bib and .ris).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Manuscript, Section, Block, Footnote, Source, OriginalityFlag } from './types/manuscript';
import {
  loadManuscript,
  saveManuscript,
  exportProjectBundle,
  exportToWordDocument,
  generateAIUseStatement,
} from './services/storage';
import { runFullOriginalityScan } from './services/originalityGuard';
import { ParsedDocumentResult } from './services/documentParser';
import { formatCitationForEditor } from './services/referenceParser';
import { TitleBar } from './components/TitleBar';
import { Ribbon, RibbonTab } from './components/Ribbon';
import { NavigationPane } from './components/NavigationPane';
import { TipTapEditor, TipTapEditorHandle } from './components/editor/TipTapEditor';
import { TaskPane, TaskPaneTab } from './components/TaskPane';
import { StatusBar } from './components/StatusBar';
import { AddSourceModal } from './components/modals/AddSourceModal';
import { DocumentUploadModal } from './components/modals/DocumentUploadModal';
import { ImportReferencesModal } from './components/modals/ImportReferencesModal';
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
  const [fontSize, setFontSize] = useState<string>('12pt');
  const [fontFamily, setFontFamily] = useState<string>('font-serif-legal');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState('Saved locally');

  // Modals state
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isImportRefsOpen, setIsImportRefsOpen] = useState(false);
  const [isResponseLetterOpen, setIsResponseLetterOpen] = useState(false);
  const [isPreSubmissionOpen, setIsPreSubmissionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);
  const [contractInspectorSection, setContractInspectorSection] = useState<Section | null>(null);

  // TipTap Editor reference
  const tipTapRef = useRef<TipTapEditorHandle>(null);

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

  // Prepare initial HTML content for active section
  const getActiveSectionHtml = () => {
    return activeSection.blocks
      .map(b => {
        if (b.type === 'heading1') return `<h1>${b.content}</h1>`;
        if (b.type === 'heading2') return `<h2>${b.content}</h2>`;
        if (b.type === 'heading3') return `<h3>${b.content}</h3>`;
        if (b.type === 'quote') return `<blockquote>${b.content}</blockquote>`;
        return `<p>${b.content}</p>`;
      })
      .join('');
  };

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

    const newFootnote: Footnote = {
      id: newFootnoteId,
      number: nextNumber,
      blockId: targetBlockId || activeSection.blocks[0]?.id || `blk_${Date.now()}`,
      content: `Author footnote citation ${nextNumber}.`,
      citations: [],
    };

    // Insert [fnX] superscript directly into the TipTap editor at cursor position
    tipTapRef.current?.insertCitation(`[fn${nextNumber}]`);

    setManuscript(prev => ({
      ...prev,
      footnotes: [...prev.footnotes, newFootnote],
    }));

    setSelectedFootnote(newFootnote);
    setActiveTaskPaneTab('citations');
  };

  // Content updated from TipTap Editor
  const handleTipTapContentChange = (html: string, plainText: string, wordCount: number) => {
    // Parse paragraphs from HTML to update active section blocks
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.children);

    const updatedBlocks: Block[] = nodes.map((node, idx) => {
      let type: Block['type'] = 'paragraph';
      const tag = node.tagName.toLowerCase();
      if (tag === 'h1') type = 'heading1';
      else if (tag === 'h2') type = 'heading2';
      else if (tag === 'h3') type = 'heading3';
      else if (tag === 'blockquote') type = 'quote';

      return {
        id: activeSection.blocks[idx]?.id || `blk_${Date.now()}_${idx}`,
        sectionId: activeSection.id,
        order: idx + 1,
        type,
        content: node.textContent || '',
      };
    });

    setManuscript(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id !== activeSection.id) return s;
        return {
          ...s,
          blocks: updatedBlocks.length > 0 ? updatedBlocks : s.blocks,
        };
      }),
    }));
  };

  // Document Upload Insertion Handler (Mammoth .docx, PDF.js .pdf, .txt)
  const handleInsertParsedDocument = (
    result: ParsedDocumentResult,
    mode: 'replace-section' | 'append-section' | 'new-section'
  ) => {
    if (mode === 'replace-section') {
      tipTapRef.current?.setContent(result.htmlContent);
      handleTipTapContentChange(result.htmlContent, result.plainText, result.wordCount);
    } else if (mode === 'append-section') {
      tipTapRef.current?.insertHtml(result.htmlContent);
    } else if (mode === 'new-section') {
      const newSecId = `sec_${Date.now()}`;
      const newSection: Section = {
        id: newSecId,
        manuscriptId: manuscript.id,
        order: manuscript.sections.length + 1,
        role: 'Uploaded Document',
        title: result.title,
        wordTarget: result.wordCount || 1500,
        status: 'drafting',
        contract: {
          role: 'Uploaded Content',
          description: `Extracted from uploaded ${result.fileType.toUpperCase()} file.`,
          wordTarget: result.wordCount || 1500,
          wordTolerance: 150,
          requiredMoves: ['substantive-analysis', 'primary-authority'],
          citationRules: ['Ensure citations are verified against library.'],
        },
        blocks: [
          {
            id: `blk_${Date.now()}`,
            sectionId: newSecId,
            order: 1,
            type: 'paragraph',
            content: result.plainText.substring(0, 500) + '...',
          },
        ],
      };

      setManuscript(prev => ({
        ...prev,
        sections: [...prev.sections, newSection],
      }));
      setActiveSectionId(newSecId);
      setTimeout(() => {
        tipTapRef.current?.setContent(result.htmlContent);
      }, 50);
    }
  };

  // Mendeley Reference Import Handler (.bib and .ris)
  const handleImportMendeleySources = (importedSources: Source[]) => {
    setManuscript(prev => ({
      ...prev,
      sources: [...importedSources, ...prev.sources],
    }));
    setActiveTaskPaneTab('citations');
  };

  // Insert Citation at cursor in TipTap Editor
  const handleInsertCitationToEditor = (
    source: Source,
    style: 'oscola-footnote' | 'in-text-author-year' | 'in-text-numeric' | 'apa'
  ) => {
    if (style === 'oscola-footnote') {
      // Create new footnote and insert [fnX]
      const nextNum = manuscript.footnotes.length + 1;
      const newFn: Footnote = {
        id: `fn_${Date.now()}`,
        number: nextNum,
        blockId: activeSection.blocks[0]?.id || `blk_${Date.now()}`,
        content: source.citationString || `${source.title} (${source.year})`,
        citations: [
          {
            id: `cit_${Date.now()}`,
            footnoteId: `fn_${Date.now()}`,
            sourceId: source.id,
          },
        ],
      };

      tipTapRef.current?.insertCitation(`[fn${nextNum}]`);

      setManuscript(prev => ({
        ...prev,
        footnotes: [...prev.footnotes, newFn],
      }));
    } else {
      // In-text citation
      const indexNum = manuscript.sources.findIndex(s => s.id === source.id) + 1;
      const citeStr = formatCitationForEditor(source, style, indexNum > 0 ? indexNum : 1);
      tipTapRef.current?.insertCitation(citeStr);
    }
  };

  // Add Section to Skeleton
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

        // Also update active TipTap editor if current section
        const activeBlock = activeSection.blocks.find(b => b.id === op.blockId);
        if (activeBlock) {
          tipTapRef.current?.insertHtml(`<p><strong>[Proposal Accepted]</strong> ${op.after}</p>`);
        }
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

    if (fixType === 'quote') {
      tipTapRef.current?.insertCitation(`'${flag.textSpan}'`);
      setManuscript(prev => ({
        ...prev,
        originalityFlags: prev.originalityFlags.map(f =>
          f.id === flag.id ? { ...f, status: 'fixed', kind: 'properly-quoted' } : f
        ),
      }));
    } else if (fixType === 'cite') {
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
      sections: prev.sections.map(s =>
        s.id === secId ? { ...s, contract: updatedContract, wordTarget: updatedContract.wordTarget } : s
      ),
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
        onOpenUploadModal={() => setIsUploadDocOpen(true)}
        onOpenImportReferences={() => setIsImportRefsOpen(true)}
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

      {/* 3. Main Workspace Area: Left Navigation | Center TipTap Editor | Right Task Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Pane (Headings tree & section contracts) */}
        {viewMode !== 'focus' && (
          <NavigationPane
            sections={manuscript.sections}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            onAddSection={handleAddSection}
            onOpenContractInspector={sec => setContractInspectorSection(sec)}
          />
        )}

        {/* Center Canvas: Full Rich Text TipTap Editor with Word A4 Pages View */}
        <TipTapEditor
          ref={tipTapRef}
          initialContent={getActiveSectionHtml()}
          activeSection={activeSection}
          footnotes={manuscript.footnotes}
          viewMode={viewMode}
          zoomLevel={zoomLevel}
          onContentChange={handleTipTapContentChange}
          onOpenUploadModal={() => setIsUploadDocOpen(true)}
          onInsertFootnoteClick={() => handleInsertFootnote()}
          onSelectFootnote={fn => {
            setSelectedFootnote(fn);
            setActiveTaskPaneTab('citations');
          }}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          fontFamily={fontFamily}
          onChangeFontFamily={setFontFamily}
        />

        {/* Right Contextual Task Pane (Reference Library with Mendeley support, Workbench, Review Desk, etc.) */}
        {viewMode !== 'focus' && (
          <TaskPane
            activeTab={activeTaskPaneTab}
            onSelectTab={setActiveTaskPaneTab}
            manuscript={manuscript}
            activeSection={activeSection}
            selectedFootnote={selectedFootnote}
            onSelectFootnote={setSelectedFootnote}
            onOpenAddSource={() => setIsAddSourceOpen(true)}
            onOpenImportReferences={() => setIsImportRefsOpen(true)}
            onInsertCitationToEditor={handleInsertCitationToEditor}
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

      <DocumentUploadModal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        onInsertParsedContent={handleInsertParsedDocument}
      />

      <ImportReferencesModal
        isOpen={isImportRefsOpen}
        onClose={() => setIsImportRefsOpen(false)}
        onImportSources={handleImportMendeleySources}
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
