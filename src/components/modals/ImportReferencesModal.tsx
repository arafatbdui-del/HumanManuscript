/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mendeley & Zotero Reference Import Modal (.bib and .ris formats)
 */

import React, { useState, useRef } from 'react';
import { parseReferenceFile, ParsedReferenceResult } from '../../services/referenceParser';
import { Source } from '../../types/manuscript';
import { BookOpen, Upload, CheckCircle, AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface ImportReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSources: (sources: Source[]) => void;
}

export const ImportReferencesModal: React.FC<ImportReferencesModalProps> = ({
  isOpen,
  onClose,
  onImportSources,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedReferenceResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);

    try {
      const parsed = await parseReferenceFile(file);
      if (parsed.sources.length === 0) {
        setError('No valid bibliographic entries found in this file. Please ensure it is a valid .bib (BibTeX) or .ris file.');
      } else {
        setResult(parsed);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to parse reference file.');
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

  const handleConfirm = () => {
    if (!result) return;
    onImportSources(result.sources);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-lg w-full p-6 text-slate-800">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Import Mendeley / Zotero References
              </h3>
              <p className="text-xs text-slate-500">
                Supports .bib (BibTeX) and .ris standard citation exchange files
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {!result ? (
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
                ? 'border-blue-500 bg-blue-50/60'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".bib,.ris,.txt"
              className="hidden"
            />
            {parsing ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-2">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-sm font-semibold text-slate-800">Parsing citation records...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900">
                  Drop your .bib or .ris file here
                </h4>
                <p className="text-xs text-slate-500">
                  Export your library from Mendeley desktop or web as BibTeX (.bib) or RIS (.ris)
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-medium">Mendeley .bib</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-medium">Mendeley .ris</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-medium">Zotero export</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-bold text-blue-950 block">
                    {result.count} References Successfully Parsed
                  </span>
                  <span className="text-[11px] text-blue-800">
                    Format: {result.format.toUpperCase()} • Ready to add to library
                  </span>
                </div>
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-[11px] text-blue-700 hover:underline"
              >
                Change File
              </button>
            </div>

            {/* List Preview */}
            <div className="max-h-52 overflow-y-auto space-y-2 border border-slate-200 rounded p-2 bg-slate-50">
              {result.sources.slice(0, 20).map((src, i) => (
                <div key={src.id} className="bg-white p-2 rounded border border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-semibold text-blue-700 uppercase">{src.kind}</span>
                    <span>{src.year}</span>
                  </div>
                  <h5 className="font-medium text-slate-900 leading-snug">{src.title}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">{src.authors.join(', ')}</p>
                </div>
              ))}
              {result.sources.length > 20 && (
                <div className="text-center text-xs text-slate-400 py-1">
                  + {result.sources.length - 20} more references
                </div>
              )}
            </div>

            {/* Confirm Actions */}
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
                onClick={handleConfirm}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-xs shadow-xs transition"
              >
                Add {result.count} References to Library
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
