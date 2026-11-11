/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Document Upload & Parser Modal (.docx via Mammoth, .pdf via PDF.js, and .txt)
 */

import React, { useState, useRef } from 'react';
import { parseUploadedDocument, ParsedDocumentResult } from '../../services/documentParser';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, X, ArrowRight } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertParsedContent: (result: ParsedDocumentResult, mode: 'replace-section' | 'append-section' | 'new-section') => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onInsertParsedContent,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedDocumentResult | null>(null);
  const [insertMode, setInsertMode] = useState<'replace-section' | 'append-section' | 'new-section'>('replace-section');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setParsedResult(null);

    try {
      const result = await parseUploadedDocument(file);
      setParsedResult(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse uploaded document.');
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmInsert = () => {
    if (!parsedResult) return;
    onInsertParsedContent(parsedResult, insertMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-xl w-full p-6 text-slate-800">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Upload &amp; Parse Document</h3>
              <p className="text-xs text-slate-500">Supports Word (.docx), PDF (.pdf), and Plain Text (.txt)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Dropzone */}
        {!parsedResult && (
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragOver
                ? 'border-emerald-500 bg-emerald-50/60'
                : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".docx,.pdf,.txt,.md"
              className="hidden"
            />
            {parsing ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-2">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="text-sm font-semibold text-slate-800">Converting and formatting document...</span>
                <span className="text-xs text-slate-400">Mammoth / PDF.js text layer extraction active</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900">
                  Drop your .docx, .pdf, or .txt file here
                </h4>
                <p className="text-xs text-slate-500">
                  or click to browse your computer
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-medium">.DOCX (Mammoth)</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-medium">.PDF (PDF.js)</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-medium">.TXT</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Parsed Result Preview */}
        {parsedResult && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-bold text-emerald-950 block">{parsedResult.title}</span>
                  <span className="text-[11px] text-emerald-800">
                    Format: {parsedResult.fileType.toUpperCase()} • {parsedResult.wordCount} words extracted
                  </span>
                </div>
              </div>
              <button
                onClick={() => setParsedResult(null)}
                className="text-[11px] text-emerald-700 hover:underline"
              >
                Change File
              </button>
            </div>

            {/* Extracted preview box */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Extracted Preview:
              </span>
              <div
                className="max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded text-xs font-serif text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parsedResult.htmlContent.substring(0, 1500) + '...' }}
              />
            </div>

            {/* Import destination choice */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-800 block">How would you like to insert this content?</span>
              <div className="space-y-1">
                <label className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="insertMode"
                    value="replace-section"
                    checked={insertMode === 'replace-section'}
                    onChange={() => setInsertMode('replace-section')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="font-semibold block text-slate-800">Replace Current Section</span>
                    <span className="text-[10px] text-slate-500">Overwrites the text of the selected section with this document</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="insertMode"
                    value="append-section"
                    checked={insertMode === 'append-section'}
                    onChange={() => setInsertMode('append-section')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="font-semibold block text-slate-800">Append to Current Section</span>
                    <span className="text-[10px] text-slate-500">Adds the extracted paragraphs below existing text</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="insertMode"
                    value="new-section"
                    checked={insertMode === 'new-section'}
                    onChange={() => setInsertMode('new-section')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="font-semibold block text-slate-800">Create New Manuscript Section</span>
                    <span className="text-[10px] text-slate-500">Adds a brand new section to the skeleton using this document title</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInsert}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs shadow-xs flex items-center gap-1.5 transition"
              >
                <span>Insert Into Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
