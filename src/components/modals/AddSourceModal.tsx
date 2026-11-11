/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Add Legal Source Modal (Treaties, UN Docs, Statutes, Cases, Articles, Books)
 */

import React, { useState } from 'react';
import { LegalSourceKind, Source } from '../../types/manuscript';
import { formatOscolaCitation } from '../../services/citationEngine';
import { Plus, Check, X } from 'lucide-react';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSource: (src: Source) => void;
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({ isOpen, onClose, onAddSource }) => {
  const [kind, setKind] = useState<LegalSourceKind>('journal-article');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [publication, setPublication] = useState('');
  const [doi, setDoi] = useState('');
  const [unSymbol, setUnSymbol] = useState('');
  const [pinpoint, setPinpoint] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newSource: Source = {
      id: `src_${Date.now()}`,
      kind,
      title: title.trim(),
      authors: authors.split(',').map(a => a.trim()).filter(Boolean),
      year: year.trim(),
      publication: publication.trim() || undefined,
      doi: doi.trim() || undefined,
      unSymbol: unSymbol.trim() || undefined,
      verification: 'confirmed',
      citationString: '',
    };

    newSource.citationString = formatOscolaCitation(newSource, pinpoint);
    onAddSource(newSource);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-lg w-full p-6 text-slate-800">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Add Legal Authority to Verified Library</h3>
            <p className="text-xs text-slate-500">Only verified sources may be cited by AI or inserted in footnotes.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold block mb-1">Source Kind (Legal Authority)</label>
            <select
              value={kind}
              onChange={e => setKind(e.target.value as LegalSourceKind)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="journal-article">Journal Article</option>
              <option value="treaty">Treaty / Convention (ICCPR, ECHR)</option>
              <option value="un-document">UN Document / General Comment</option>
              <option value="case">Case Law / Judicial Decision</option>
              <option value="statute">Statute / Ordinance / Act</option>
              <option value="book-chapter">Book / Chapter</option>
              <option value="report">Report / Grey Literature</option>
              <option value="news-web">News / Online Source</option>
            </select>
          </div>

          <div>
            <label className="font-semibold block mb-1">Full Title / Official Instrument Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. International Covenant on Civil and Political Rights"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Author(s) / Body / Court</label>
              <input
                type="text"
                value={authors}
                onChange={e => setAuthors(e.target.value)}
                placeholder="Comma separated: UN HRC, Kaye"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Year / Adoption Date</label>
              <input
                type="text"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">
                {kind === 'un-document' ? 'UN Document Symbol' : kind === 'case' ? 'Law Report / Citation' : 'Publication / Journal'}
              </label>
              <input
                type="text"
                value={publication}
                onChange={e => setPublication(e.target.value)}
                placeholder={kind === 'case' ? '(1979) 2 EHRR 245' : 'Oxford University Press'}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">DOI / Official URL</label>
              <input
                type="text"
                value={doi}
                onChange={e => setDoi(e.target.value)}
                placeholder="10.1093/... or https://..."
                className="w-full border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-xs"
            >
              Save to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
