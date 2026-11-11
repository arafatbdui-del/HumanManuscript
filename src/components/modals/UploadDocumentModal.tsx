/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Upload Document Modal (.docx, .txt, .md, Paste text)
 */

import React, { useState } from 'react';
import { parseDocxFile, parseRawTextToSections, ImportResult } from '../../services/documentImporter';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Layers } from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDocument: (result: ImportResult, mode: 'replace' | 'append') => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onImportDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      if (file.name.toLowerCase().endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const res = await parseDocxFile(arrayBuffer, file.name);
        setParsedPreview(res);
      } else {
        const text = await file.text();
        const res = parseRawTextToSections(text, file.name.replace(/\.[^/.]+$/, ''));
        setParsedPreview(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) return;
    const res = parseRawTextToSections(pastedText, pastedTitle.trim() || 'Pasted Legal Article');
    setParsedPreview(res);
  };

  const handleConfirmImport = () => {
    if (!parsedPreview) return;
    onImportDocument(parsedPreview, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-2xl w-full max-h-[85vh] flex flex-col p-6 text-slate-800">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Upload &amp; Import Manuscript Document</h3>
              <p className="text-xs text-slate-500">
                Upload Microsoft Word (.docx), text (.txt), Markdown (.md), or paste draft.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-4 pb-2">
          <button
            onClick={() => {
              setActiveTab('upload');
              setParsedPreview(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'upload' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (.docx / .txt / .md)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('paste');
              setParsedPreview(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'paste' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Full Text / Article</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {activeTab === 'upload' ? (
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                accept=".docx,.txt,.md"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText className="w-10 h-10 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-sm text-slate-800">
                Choose a Microsoft Word (.docx), text (.txt), or markdown (.md) file
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Paragraphs, headings, and structure will be extracted cleanly into editable pages.
              </p>
              {loading && <p className="text-xs text-blue-600 font-bold mt-2 animate-pulse">Extracting text with Mammoth...</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-xs block mb-1">Article Title (Optional)</label>
                <input
                  type="text"
                  value={pastedTitle}
                  onChange={e => setPastedTitle(e.target.value)}
                  placeholder="e.g. Constitutional Implications of Emergency Decrees"
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-xs block mb-1">Paste Manuscript Text</label>
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste your legal article, sections, and paragraphs here..."
                  rows={8}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 font-serif-legal bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleParsePasted}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition"
              >
                Parse into Sections
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 rounded border border-red-200 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Parsed Preview */}
          {parsedPreview && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Parsed Document</span>
                  <h4 className="font-bold text-sm text-slate-900">{parsedPreview.title}</h4>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {parsedPreview.sections.length} Sections Extracted
                </span>
              </div>

              {/* Import Mode: Replace vs Append */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-4 text-xs">
                <span className="font-semibold text-slate-700">Import Destination:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-blue-600"
                  />
                  <span>Replace current document</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-blue-600"
                  />
                  <span>Append to current document</span>
                </label>
              </div>

              {/* Sections list */}
              <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                {parsedPreview.sections.map((sec, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border border-slate-200 flex justify-between">
                    <span className="font-medium text-slate-800 truncate max-w-sm">{sec.title}</span>
                    <span className="text-slate-400 text-[11px]">{sec.blocks.length} paragraphs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Document will open immediately in Word-style editable canvas.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              disabled={!parsedPreview}
              onClick={handleConfirmImport}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded text-xs shadow-xs transition"
            >
              Load into Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
