/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Microsoft Word-Style TipTap Editor Canvas (A4 Paper Layout & Rich Formatting)
 */

import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Footnote, Section } from '../../types/manuscript';
import { WordRuler } from './WordRuler';
import { RichTextToolbar } from './RichTextToolbar';

export interface TipTapEditorHandle {
  insertCitation: (citationText: string) => void;
  insertHtml: (html: string) => void;
  setContent: (htmlOrText: string) => void;
  getHtml: () => string;
  getText: () => string;
}

interface TipTapEditorProps {
  initialContent: string;
  activeSection: Section;
  footnotes: Footnote[];
  viewMode: 'pages' | 'draft' | 'focus';
  zoomLevel: number;
  onContentChange: (html: string, plainText: string, wordCount: number) => void;
  onOpenUploadModal: () => void;
  onInsertFootnoteClick: () => void;
  onSelectFootnote: (fn: Footnote) => void;
  fontSize: string;
  onChangeFontSize: (size: string) => void;
  fontFamily: string;
  onChangeFontFamily: (font: string) => void;
}

export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  (
    {
      initialContent,
      activeSection,
      footnotes,
      viewMode,
      zoomLevel,
      onContentChange,
      onOpenUploadModal,
      onInsertFootnoteClick,
      onSelectFootnote,
      fontSize,
      onChangeFontSize,
      fontFamily,
      onChangeFontFamily,
    },
    ref
  ) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          defaultAlignment: 'justify',
        }),
        Highlight.configure({
          multicolor: true,
        }),
        Subscript,
        Superscript,
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: `focus:outline-none min-h-[700px] text-justify selection:bg-amber-200 ${fontFamily}`,
          style: `font-size: ${fontSize};`,
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        const html = currentEditor.getHTML();
        const text = currentEditor.getText();
        const matches = text.trim().match(/\b[\w'-]+\b/g);
        const wordCount = matches ? matches.length : 0;
        onContentChange(html, text, wordCount);
      },
    });

    // Expose methods via ref so Reference Library in right sidebar can insert citations
    useImperativeHandle(ref, () => ({
      insertCitation: (citationText: string) => {
        if (!editor) return;
        // If it starts with [fn, insert as superscript
        if (citationText.startsWith('[fn') || citationText.startsWith('[')) {
          editor.chain().focus().insertContent(`<sup>${citationText}</sup> `).run();
        } else {
          editor.chain().focus().insertContent(` ${citationText} `).run();
        }
      },
      insertHtml: (html: string) => {
        if (!editor) return;
        editor.chain().focus().insertContent(html).run();
      },
      setContent: (htmlOrText: string) => {
        if (!editor) return;
        editor.commands.setContent(htmlOrText);
      },
      getHtml: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
    }));

    // Update editor content when active section changes
    useEffect(() => {
      if (editor && initialContent) {
        // Only update if fundamentally different to avoid cursor reset
        const currentHtml = editor.getHTML();
        if (currentHtml.trim() !== initialContent.trim() && initialContent !== '') {
          editor.commands.setContent(initialContent);
        }
      }
    }, [activeSection.id, editor]);

    return (
      <div className="flex-1 flex flex-col h-full bg-slate-200/90 overflow-hidden select-text">
        {/* Word-style Rich Text Toolbar at top */}
        <RichTextToolbar
          editor={editor}
          onOpenUploadModal={onOpenUploadModal}
          onInsertFootnote={onInsertFootnoteClick}
          fontSize={fontSize}
          onChangeFontSize={onChangeFontSize}
          fontFamily={fontFamily}
          onChangeFontFamily={onChangeFontFamily}
        />

        {/* Scrollable Canvas Area */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center py-6 px-4">
          <div
            className="transition-all duration-150 flex flex-col items-center"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {/* Word Horizontal Ruler in Pages View */}
            {viewMode === 'pages' && <WordRuler />}

            {/* Word A4 Page Representation */}
            <div
              className={`bg-white text-slate-900 border border-slate-300/80 transition-all ${
                viewMode === 'pages'
                  ? 'w-[820px] min-h-[1050px] px-16 py-14 word-page-shadow my-2 rounded-xs'
                  : 'w-full max-w-4xl p-8 rounded-lg shadow-sm my-2'
              }`}
            >
              {/* Running Header */}
              {viewMode === 'pages' && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-serif pb-4 mb-6 border-b border-slate-200/60 select-none">
                  <span className="italic truncate max-w-md">{activeSection.title}</span>
                  <span className="font-sans text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Oxford Journal of Legal Studies / HRLR
                  </span>
                </div>
              )}

              {/* TipTap Rich Text Editor Surface */}
              <div
                className="leading-[1.85] text-slate-900"
                style={{ fontSize }}
              >
                <EditorContent editor={editor} />
              </div>

              {/* Footnotes Section at Bottom of Page */}
              {footnotes.length > 0 && (
                <div className="mt-14 pt-4 border-t border-slate-900/80 select-text">
                  <div className="flex items-center justify-between mb-3 select-none">
                    <div className="w-24 h-px bg-slate-900" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                      Footnotes (OSCOLA Standard)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-serif text-slate-700 leading-relaxed">
                    {footnotes.map(fn => (
                      <div
                        key={fn.id}
                        onClick={() => onSelectFootnote(fn)}
                        className="flex items-start gap-2 hover:bg-blue-50/70 p-1 rounded cursor-pointer transition group"
                      >
                        <span className="font-bold text-slate-900 shrink-0 w-5 text-right font-sans">
                          {fn.number}.
                        </span>
                        <div className="flex-1">
                          <span>{fn.content}</span>
                          {fn.citations.length > 0 && (
                            <span className="text-[10px] text-blue-700 font-sans ml-2">
                              [Linked to {fn.citations[0].sourceId}]
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Running Footer */}
              {viewMode === 'pages' && (
                <div className="mt-12 pt-4 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-serif select-none">
                  <span>HumanManuscript — Scopus / WoS Journal Manuscript</span>
                  <span className="font-mono text-[10px]">Page 1</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
