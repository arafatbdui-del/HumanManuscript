/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Microsoft Word Rich-Text Toolbar Component (TipTap powered)
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
  Bookmark,
  Upload,
  Download,
  Minus,
} from 'lucide-react';

interface RichTextToolbarProps {
  editor: Editor | null;
  onOpenUploadModal: () => void;
  onInsertFootnote: () => void;
  fontSize: string;
  onChangeFontSize: (size: string) => void;
  fontFamily: string;
  onChangeFontFamily: (font: string) => void;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  editor,
  onOpenUploadModal,
  onInsertFootnote,
  fontSize,
  onChangeFontSize,
  fontFamily,
  onChangeFontFamily,
}) => {
  if (!editor) return null;

  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : 'p';

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'p') {
      editor.chain().focus().setParagraph().run();
    } else if (val === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (val === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (val === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  };

  return (
    <div className="bg-slate-100/90 border-b border-slate-300 px-3 py-1.5 flex flex-wrap items-center gap-1 text-slate-700 select-none shadow-2xs no-print">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Font Family Selector */}
      <div className="flex items-center pr-1.5 border-r border-slate-300">
        <select
          value={fontFamily}
          onChange={e => onChangeFontFamily(e.target.value)}
          className="h-7 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          title="Font Family"
        >
          <option value="font-serif-legal">Lora / Times Legal (Serif)</option>
          <option value="font-heading-crest">Cinzel (Roman Crest)</option>
          <option value="font-sans">Plus Jakarta / Arial (Sans)</option>
          <option value="font-mono-code">JetBrains (Monospace)</option>
        </select>
      </div>

      {/* Font Size Selector */}
      <div className="flex items-center pr-1.5 border-r border-slate-300">
        <select
          value={fontSize}
          onChange={e => onChangeFontSize(e.target.value)}
          className="h-7 text-xs bg-white border border-slate-300 rounded px-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 w-16"
          title="Font Size"
        >
          <option value="10pt">10 pt</option>
          <option value="11pt">11 pt</option>
          <option value="12pt">12 pt (Std)</option>
          <option value="14pt">14 pt</option>
          <option value="16pt">16 pt</option>
          <option value="18pt">18 pt</option>
          <option value="24pt">24 pt</option>
        </select>
      </div>

      {/* Paragraph / Headings Dropdown */}
      <div className="flex items-center pr-1.5 border-r border-slate-300">
        <select
          value={currentHeading}
          onChange={handleHeadingChange}
          className="h-7 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          title="Styles & Headings"
        >
          <option value="p">Normal (Body text)</option>
          <option value="h1">Heading 1 (Title / Part)</option>
          <option value="h2">Heading 2 (Section)</option>
          <option value="h3">Heading 3 (Sub-section)</option>
        </select>
      </div>

      {/* Character Formatting: Bold, Italic, Underline, Strikethrough, Highlight */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('bold') ? 'bg-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('italic') ? 'bg-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('underline') ? 'bg-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('strike') ? 'bg-blue-200 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('highlight') ? 'bg-amber-200 text-amber-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Text Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('subscript') ? 'bg-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Subscript"
        >
          <SubscriptIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('superscript') ? 'bg-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Superscript (Citation/Footnote mark)"
        >
          <SuperscriptIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Paragraph Alignment: Left, Center, Right, Justify */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded transition ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-blue-200 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Align Left (Ctrl+L)"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded transition ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-blue-200 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Align Center (Ctrl+E)"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded transition ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-blue-200 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Align Right (Ctrl+R)"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded transition ${
            editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Justify (Standard Legal Journal Text)"
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lists & Quotes */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-300">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('bulletList') ? 'bg-blue-200 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('orderedList') ? 'bg-blue-200 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('blockquote') ? 'bg-blue-200 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Block Quote / Statutory Extract"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
          title="Horizontal Rule"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legal Actions: Insert Footnote Citation & Upload Document */}
      <div className="flex items-center gap-1.5 pl-1">
        <button
          onClick={onInsertFootnote}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-semibold shadow-2xs transition"
          title="Insert Footnote (Ctrl+Alt+F)"
        >
          <Bookmark className="w-3.5 h-3.5 text-blue-600" />
          <span>Insert Footnote</span>
        </button>

        <button
          onClick={onOpenUploadModal}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold shadow-2xs transition"
          title="Upload Word (.docx), PDF (.pdf), or Text (.txt)"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-600" />
          <span>Upload Doc</span>
        </button>
      </div>
    </div>
  );
};
