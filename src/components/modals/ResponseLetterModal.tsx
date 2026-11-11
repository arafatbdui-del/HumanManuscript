/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Point-by-Point Response-to-Reviewers Table Generator Modal (design.md Section 7.4)
 */

import React, { useState } from 'react';
import { Manuscript } from '../../types/manuscript';
import { generateResponseLetterMarkdown } from '../../services/storage';
import { Copy, Download, Check, FileText } from 'lucide-react';

interface ResponseLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscript: Manuscript;
}

export const ResponseLetterModal: React.FC<ResponseLetterModalProps> = ({
  isOpen,
  onClose,
  manuscript,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const markdown = generateResponseLetterMarkdown(manuscript);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Response_to_Reviewers_${manuscript.journalProfile.name.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[85vh] flex flex-col p-6 text-slate-800">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Response to Reviewers Table (Peer Review Round 1)
            </h3>
            <p className="text-xs text-slate-500">
              Generated from change log events. Locations cannot drift from the manuscript.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Table Preview */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded p-4 bg-slate-50 mb-4 text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-200/80 text-left text-[11px] font-bold text-slate-700">
                <th className="p-2 border border-slate-300 w-16">#</th>
                <th className="p-2 border border-slate-300 w-1/3">Reviewer Comment (Verbatim)</th>
                <th className="p-2 border border-slate-300">Author Response</th>
                <th className="p-2 border border-slate-300">Changes Made</th>
                <th className="p-2 border border-slate-300 w-28">Location</th>
              </tr>
            </thead>
            <tbody>
              {manuscript.reviewerComments.map(c => (
                <tr key={c.id} className="bg-white hover:bg-slate-50 transition">
                  <td className="p-2 border border-slate-300 font-bold text-amber-900">{c.id}</td>
                  <td className="p-2 border border-slate-300 font-serif-legal italic text-slate-700">
                    "{c.raw}"
                  </td>
                  <td className="p-2 border border-slate-300 text-slate-800">
                    {c.responseDraft || 'Pending author draft.'}
                  </td>
                  <td className="p-2 border border-slate-300 text-slate-600">
                    {c.proposedChangesSummary || 'Text revised.'}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-[10px] text-blue-700">
                    {c.locationReference || 'Revised section'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {manuscript.reviewerComments.length} reviewer comments mapped &amp; tracked
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.md)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
