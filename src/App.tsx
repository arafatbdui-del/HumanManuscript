/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * HumanManuscript: Main Legal & Human Rights Studio Application (design.md)
 * Fully functional MS Word-like writing environment with resizable three-column layout,
 * live automated word counts per section, section addition/removal, and smooth editor navigation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
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
import {
  DocumentSectionOutline,
  DEFAULT_OUTLINE_SECTIONS,
  calculateSectionWordCounts,
  generateInitialFullManuscriptHtml,
} from './services/outlineManager';
import { TitleBar } from './components/TitleBar';
import { WordRibbon } from './components/WordRibbon';
import { NavigationPane } from './components/NavigationPane';
import { TipTapEditor, TipTapEditorHandle } from './components/editor/TipTapEditor';
import { TaskPane, AccordionSectionKey } from './components/TaskPane';
import { Editor } from '@tiptap/react';
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
  const [outlineSections, setOutlineSections] = useState<DocumentSectionOutline[]>(
    () => DEFAULT_OUTLINE_SECTIONS
  );
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-title');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevSidebarsRef = useRef<{ left: boolean; right: boolean }>({ left: true, right: true });
  const [activeAccordion, setActiveAccordion] = useState<AccordionSectionKey | null>('library');
  const [selectedFootnote, setSelectedFootnote] = useState<Footnote | null>(null);
  const [viewMode, setViewMode] = useState<'pages' | 'draft' | 'focus'>('pages');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [fontSize, setFontSize] = useState<string>('12pt');
  const [fontFamily, setFontFamily] = useState<string>('font-serif-legal');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState('Saved locally');

  // Full document continuous HTML state
  const [fullContentHtml, setFullContentHtml] = useState<string>(() =>
    generateInitialFullManuscriptHtml()
  );

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

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+Alt+F, Ctrl+K, Ctrl+[, Ctrl+])
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        setIsLeftSidebarOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        setIsRightSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manuscript]);

  // Listen to browser native Fullscreen API changes (including Esc key and F11)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      if (isNowFullscreen) {
        // Entering Fullscreen / Focus Mode: automatically hide both sidebars to maximize editor space
        setIsLeftSidebarOpen(false);
        setIsRightSidebarOpen(false);
        setViewMode('focus');
      } else {
        // Exiting Fullscreen: restore sidebars to previous state
        setIsLeftSidebarOpen(prevSidebarsRef.current.left);
        setIsRightSidebarOpen(prevSidebarsRef.current.right);
        setViewMode('pages');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle Fullscreen using document.documentElement.requestFullscreen() / document.exitFullscreen()
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Save current sidebar states before requesting fullscreen
        prevSidebarsRef.current = {
          left: isLeftSidebarOpen,
          right: isRightSidebarOpen,
        };
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Native requestFullscreen failed or blocked by iframe:', err);
      // Fallback for environments where requestFullscreen is restricted: toggle focus mode state directly
      setIsFullscreen(prev => {
        const next = !prev;
        if (next) {
          prevSidebarsRef.current = { left: isLeftSidebarOpen, right: isRightSidebarOpen };
          setIsLeftSidebarOpen(false);
          setIsRightSidebarOpen(false);
          setViewMode('focus');
        } else {
          setIsLeftSidebarOpen(prevSidebarsRef.current.left);
          setIsRightSidebarOpen(prevSidebarsRef.current.right);
          setViewMode('pages');
        }
        return next;
      });
    }
  };

  // Active section helper
  const activeSection =
    manuscript.sections.find(s => s.id === activeSectionId) || manuscript.sections[0];

  // Calculate live total manuscript words across all active outline sections
  const totalManuscriptWords = outlineSections
    .filter(s => !s.isHidden)
    .reduce((acc, s) => acc + s.wordCount, 0);

  const activeSectionWordCount =
    outlineSections.find(s => s.id === activeSectionId)?.wordCount || 0;

  const originalityRedCount = manuscript.originalityFlags.filter(
    f => f.kind === 'verbatim-match' && f.status === 'open'
  ).length;

  const originalityOrangeCount = manuscript.originalityFlags.filter(
    f => f.kind === 'close-paraphrase' && f.status === 'open'
  ).length;

  // Real-time Content Change handler from TipTap: updates section word counts on every keystroke
  const handleTipTapContentChange = (html: string, plainText: string, wordCount: number) => {
    setFullContentHtml(html);
    const updatedCounts = calculateSectionWordCounts(html, outlineSections);
    setOutlineSections(prev =>
      prev.map(sec => ({
        ...sec,
        wordCount: updatedCounts[sec.id] !== undefined ? updatedCounts[sec.id] : sec.wordCount,
      }))
    );
  };

  // Smooth Navigation to Section in Editor Canvas
  const handleNavigateToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    tipTapRef.current?.scrollToSection(sectionId);
  };

  // Add Custom Section to Document Outline and Editor
  const handleAddOutlineSection = (title: string, wordTarget: number = 1500) => {
    const cleanId = `sec-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;
    const newSec: DocumentSectionOutline = {
      id: cleanId,
      type: 'custom',
      title,
      subtitle: `Substantive section analysis`,
      wordCount: 0,
      wordTarget,
      isHidden: false,
      isDefault: false,
      order: outlineSections.length + 1,
    };

    // Insert new section before Conclusion & Bibliography
    setOutlineSections(prev => {
      const conclusionIdx = prev.findIndex(s => s.type === 'conclusion');
      if (conclusionIdx >= 0) {
        const copy = [...prev];
        copy.splice(conclusionIdx, 0, newSec);
        return copy;
      }
      return [...prev, newSec];
    });

    // Also register a section entry in manuscript.sections for contracts and AI tools
    const manuscriptSection: Section = {
      id: cleanId,
      manuscriptId: manuscript.id,
      order: manuscript.sections.length + 1,
      role: title,
      title,
      wordTarget,
      status: 'drafting',
      contract: {
        role: title,
        description: `Substantive analysis and jurisprudence for ${title}.`,
        wordTarget,
        wordTolerance: 150,
        requiredMoves: ['doctrinal-analysis', 'primary-authority', 'concluding-argument'],
        citationRules: ['Cite relevant treaties, statutes, or regional court precedents.'],
      },
      blocks: [
        {
          id: `blk_${cleanId}_01`,
          sectionId: cleanId,
          order: 1,
          type: 'paragraph',
          content: `Analysis for ${title}...`,
        },
      ],
    };

    setManuscript(prev => ({
      ...prev,
      sections: [...prev.sections, manuscriptSection],
    }));

    // Insert section heading into editor
    const headingHtml = `<h2 id="${cleanId}" class="font-serif font-bold text-lg text-slate-800 mt-8 mb-2.5">${title}</h2><p>Write your substantive analysis for ${title} here...</p>`;
    tipTapRef.current?.insertHtml(headingHtml);

    // Scroll to the new section
    setTimeout(() => {
      handleNavigateToSection(cleanId);
    }, 150);
  };

  // Close / Hide Section from Outline
  const handleRemoveOrHideSection = (sectionId: string) => {
    setOutlineSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, isHidden: true } : s))
    );
  };

  // Restore Hidden Section
  const handleRestoreSection = (sectionId: string) => {
    setOutlineSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, isHidden: false } : s))
    );
  };

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

    tipTapRef.current?.insertCitation(`[fn${nextNumber}]`);

    setManuscript(prev => ({
      ...prev,
      footnotes: [...prev.footnotes, newFootnote],
    }));

    setSelectedFootnote(newFootnote);
    setIsRightSidebarOpen(true);
    setActiveAccordion('library');
  };

  // Document Upload Handler (Mammoth .docx, PDF.js .pdf, .txt)
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
      handleAddOutlineSection(result.title, result.wordCount || 1500);
      setTimeout(() => {
        tipTapRef.current?.insertHtml(result.htmlContent);
      }, 200);
    }
  };

  // Mendeley Reference Import Handler (.bib and .ris)
  const handleImportMendeleySources = (importedSources: Source[]) => {
    setManuscript(prev => ({
      ...prev,
      sources: [...importedSources, ...prev.sources],
    }));
    setIsRightSidebarOpen(true);
    setActiveAccordion('library');
  };

  // Insert Citation at cursor in TipTap Editor
  const handleInsertCitationToEditor = (
    source: Source,
    style: 'oscola-footnote' | 'in-text-author-year' | 'in-text-numeric' | 'apa'
  ) => {
    if (style === 'oscola-footnote') {
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
      const indexNum = manuscript.sources.findIndex(s => s.id === source.id) + 1;
      const citeStr = formatCitationForEditor(source, style, indexNum > 0 ? indexNum : 1);
      tipTapRef.current?.insertCitation(citeStr);
    }
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

    for (const op of prop.operations) {
      if (op.op === 'replace_text') {
        tipTapRef.current?.insertHtml(`<p><strong>[Proposal Accepted]</strong> ${op.after}</p>`);
      }
    }

    setManuscript(prev => ({
      ...prev,
      proposals: prev.proposals.map(p => (p.id === proposalId ? { ...p, status: 'accepted' } : p)),
      reviewerComments: prev.reviewerComments.map(c =>
        c.id === prop.commentId ? { ...c, status: 'applied' } : c
      ),
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
    setIsRightSidebarOpen(true);
    setActiveAccordion('guard');
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
      {/* 1. Native Title Bar with Save and PWA Install */}
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

      {/* 2. Modern Word-Style Dropdown Menu & Compact Formatting Ribbon */}
      <WordRibbon
        editor={editor}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        fontFamily={fontFamily}
        onChangeFontFamily={setFontFamily}
        isLeftSidebarOpen={isLeftSidebarOpen && viewMode !== 'focus'}
        onToggleLeftSidebar={() => {
          setIsLeftSidebarOpen(prev => {
            const next = !prev;
            if (!isFullscreen) prevSidebarsRef.current.left = next;
            return next;
          });
        }}
        isRightSidebarOpen={isRightSidebarOpen && viewMode !== 'focus'}
        onToggleRightSidebar={() => {
          setIsRightSidebarOpen(prev => {
            const next = !prev;
            if (!isFullscreen) prevSidebarsRef.current.right = next;
            return next;
          });
        }}
        onOpenUploadModal={() => setIsUploadDocOpen(true)}
        onOpenImportReferences={() => setIsImportRefsOpen(true)}
        onInsertFootnote={() => handleInsertFootnote()}
        onOpenAddSource={() => setIsAddSourceOpen(true)}
        onToggleTrackChanges={() => {
          setManuscript(prev => ({
            ...prev,
            settings: { ...prev.settings, trackChanges: !prev.settings.trackChanges },
          }));
        }}
        trackChangesActive={manuscript.settings.trackChanges}
        onOpenSection={tab => {
          setIsRightSidebarOpen(true);
          setActiveAccordion(tab);
        }}
        onRunCitationAudit={() => {
          setIsRightSidebarOpen(true);
          setActiveAccordion('library');
        }}
        onRunOriginalityScan={() => {
          handleRunOriginalityScan();
          setIsRightSidebarOpen(true);
          setActiveAccordion('guard');
        }}
        onOpenPreSubmissionChecklist={() => setIsPreSubmissionOpen(true)}
        onExportWord={() => exportToWordDocument(manuscript, manuscript.settings.trackChanges)}
        onExportResponseLetter={() => setIsResponseLetterOpen(true)}
        onExportAIStatement={handleExportAIStatement}
        onOpenSettings={() => setIsSettingsOpen(true)}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onOpenCommandSearch={() => setIsCommandSearchOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* 3. Highly Functional Resizable Three-Column Layout (react-resizable-panels) */}
      <div className="flex-1 overflow-hidden relative">
        <Group orientation="horizontal" className="h-full w-full">
          {/* Left Panel: Document Outline & Navigation */}
          {isLeftSidebarOpen && viewMode !== 'focus' && (
            <>
              <Panel
                id="panel-outline"
                defaultSize="22%"
                minSize="14%"
                maxSize="38%"
                className="h-full overflow-hidden bg-slate-50 border-r border-slate-200 shadow-2xs z-10"
              >
                <NavigationPane
                  sections={outlineSections}
                  activeSectionId={activeSectionId}
                  totalWordCount={totalManuscriptWords}
                  onNavigateToSection={handleNavigateToSection}
                  onAddSection={handleAddOutlineSection}
                  onRemoveOrHideSection={handleRemoveOrHideSection}
                  onRestoreSection={handleRestoreSection}
                  onToggleCollapse={() => setIsLeftSidebarOpen(false)}
                />
              </Panel>

              {/* Left Resizable Drag Handle Divider with smooth CSS transitions */}
              <Separator className="w-1.5 hover:w-2 bg-slate-200 hover:bg-blue-500 active:bg-blue-600 transition-all duration-150 cursor-col-resize flex items-center justify-center group relative z-20 outline-none select-none">
                <div className="w-0.5 h-7 bg-slate-400 group-hover:bg-white rounded-full transition-colors pointer-events-none" />
              </Separator>
            </>
          )}

          {/* Center Panel: Full Rich-Text TipTap Editor Canvas */}
          <Panel id="panel-editor" minSize="35%" className="h-full overflow-hidden flex flex-col z-0">
            <TipTapEditor
              ref={tipTapRef}
              initialContent={fullContentHtml}
              activeSection={activeSection}
              footnotes={manuscript.footnotes}
              viewMode={viewMode}
              zoomLevel={zoomLevel}
              onContentChange={handleTipTapContentChange}
              onOpenUploadModal={() => setIsUploadDocOpen(true)}
              onInsertFootnoteClick={() => handleInsertFootnote()}
              onSelectFootnote={fn => {
                setSelectedFootnote(fn);
                setIsRightSidebarOpen(true);
                setActiveAccordion('library');
              }}
              fontSize={fontSize}
              onChangeFontSize={setFontSize}
              fontFamily={fontFamily}
              onChangeFontFamily={setFontFamily}
              onEditorReady={setEditor}
            />
          </Panel>

          {/* Right Panel: Reference Library & Research Tools */}
          {isRightSidebarOpen && viewMode !== 'focus' && (
            <>
              {/* Right Resizable Drag Handle Divider with smooth CSS transitions */}
              <Separator className="w-1.5 hover:w-2 bg-slate-200 hover:bg-blue-500 active:bg-blue-600 transition-all duration-150 cursor-col-resize flex items-center justify-center group relative z-20 outline-none select-none">
                <div className="w-0.5 h-7 bg-slate-400 group-hover:bg-white rounded-full transition-colors pointer-events-none" />
              </Separator>

              <Panel
                id="panel-taskpane"
                defaultSize="26%"
                minSize="18%"
                maxSize="45%"
                className="h-full overflow-hidden bg-slate-50 border-l border-slate-200 shadow-2xs z-10"
              >
                <TaskPane
                  isOpen={isRightSidebarOpen}
                  onClose={() => setIsRightSidebarOpen(false)}
                  activeAccordion={activeAccordion}
                  onToggleAccordion={key => setActiveAccordion(prev => (prev === key ? null : key))}
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
                  onAddSourceDirectly={handleAddSource}
                />
              </Panel>
            </>
          )}
        </Group>
      </div>

      {/* 4. Bottom Word-Style Status Bar */}
      <StatusBar
        currentSectionWords={activeSectionWordCount}
        sectionTargetWords={activeSection.wordTarget || 1500}
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
        onSelectSection={handleNavigateToSection}
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
