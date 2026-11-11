/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mendeley Reference Integration & Library Sync Modal
 */

import React, { useState } from 'react';
import { Source } from '../../types/manuscript';
import { parseMendeleyBibTeX, parseMendeleyRIS, exportToMendeleyBibTeX, exportToMendeleyRIS } from '../../services/mendeleyParser';
import { BookOpen, Upload, Download, Copy, Check, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

interface MendeleyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Source[];
  onImportSources: (newSources: Source[]) => void;
}

export const MendeleyModal: React.FC<MendeleyModalProps> = ({
  isOpen,
  onClose,
  sources,
  onImportSources,
}) => {
  const [tab, setTab] = useState<'import' | 'export'>('import');
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Source[]>([]);
  const [formatType, setFormatType] = useState<'bibtex' | 'ris'>('bibtex');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (!content) return;

      const isRis = file.name.toLowerCase().endsWith('.ris') || content.includes('TY  -');
      const parsed = isRis ? parseMendeleyRIS(content) : parseMendeleyBibTeX(content);
      setParsedPreview(parsed);
      setImportStatus(`Parsed ${parsed.length} references from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) return;
    const isRis = formatType === 'ris' || pastedText.includes('TY  -');
    const parsed = isRis ? parseMendeleyRIS(pastedText) : parseMendeleyBibTeX(pastedText);
    setParsedPreview(parsed);
    setImportStatus(`Found ${parsed.length} citation records ready for library.`);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportSources(parsedPreview);
    setImportStatus(`Successfully added ${parsedPreview.length} sources to your verified library!`);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleDownloadExport = (type: 'bib' | 'ris') => {
    const content = type === 'bib' ? exportToMendeleyBibTeX(sources) : exportToMendeleyRIS(sources);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HumanManuscript_Library_Mendeley_${Date.now()}.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBibText = exportToMendeleyBibTeX(sources);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-2xl w-full max-h-[85vh] flex flex-col p-6 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              M
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Mendeley Reference Manager Integration</h3>
              <p className="text-xs text-slate-500">Sync, import (.bib / .ris), and export reference libraries.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-4 pb-2">
          <button
            onClick={() => setTab('import')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              tab === 'import' ? 'bg-red-50 text-red-800 border border-red-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import from Mendeley</span>
          </button>
          <button
            onClick={() => setTab('export')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              tab === 'export' ? 'bg-red-50 text-red-800 border border-red-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to Mendeley ({sources.length} sources)</span>
          </button>
        </div>

        {/* TAB 1: IMPORT FROM MENDELEY */}
        {tab === 'import' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* File Upload Box */}
            <div className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-5 text-center bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                accept=".bib,.ris,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-7 h-7 text-red-600 mx-auto mb-2" />
              <div className="font-semibold text-xs text-slate-800">
                Drop Mendeley Export (.bib or .ris) here, or browse files
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                In Mendeley: Select references &gt; File &gt; Export &gt; BibTeX (.bib) or RIS (.ris)
              </p>
            </div>

            {/* Paste alternative */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">Or Paste Mendeley BibTeX / RIS Entry:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={formatType}
                    onChange={e => setFormatType(e.target.value as any)}
                    className="text-[11px] bg-slate-100 border border-slate-200 rounded px-2 py-0.5"
                  >
                    <option value="bibtex">BibTeX (@article...)</option>
                    <option value="ris">RIS (TY - JOUR...)</option>
                  </select>
                  <button
                    onClick={handleParsePasted}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-medium transition"
                  >
                    Parse
                  </button>
                </div>
              </div>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="@article{Schauer1982, author={Schauer, F.}, title={An Essay on Constitutional Language}, journal={UCLA L Rev}, year={1982}}..."
                rows={4}
                className="w-full text-xs font-mono p-2.5 rounded border border-slate-300 focus:ring-1 focus:ring-red-500 bg-white"
              />
            </div>

            {/* Preview of Parsed Sources */}
            {parsedPreview.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Parsed Sources Ready to Add ({parsedPreview.length}):
                  </span>
                  <button
                    onClick={handleConfirmImport}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs shadow-xs transition"
                  >
                    Add All to Verified Library
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {parsedPreview.map((src, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                      <div className="font-semibold text-slate-900">{src.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {src.authors.join(', ')} ({src.year}) • {src.publication || src.kind}
                      </div>
                      <div className="text-[10px] text-blue-700 font-mono mt-1 truncate">
                        OSCOLA: {src.citationString}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importStatus && (
              <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs">
                {importStatus}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPORT TO MENDELEY */}
        {tab === 'export' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-950">
              <span className="font-semibold block mb-0.5">Export to Mendeley Reference Manager</span>
              Export all {sources.length} verified manuscript citations as a clean BibTeX or RIS file to import directly into Mendeley Desktop, Mendeley Web, or Mendeley Reference Manager.
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownloadExport('bib')}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-medium text-xs shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Mendeley BibTeX (.bib)</span>
              </button>
              <button
                onClick={() => handleDownloadExport('ris')}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium text-xs shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Mendeley RIS (.ris)</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">BibTeX Preview:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportBibText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy BibTeX'}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={exportBibText}
                rows={8}
                className="w-full text-xs font-mono p-2.5 rounded border border-slate-300 bg-slate-50 text-slate-700"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
