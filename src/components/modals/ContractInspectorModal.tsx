/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Section Contract Inspector Modal (Section 5)
 */

import React, { useState } from 'react';
import { Section } from '../../types/manuscript';
import { Target, CheckCircle2, Shield, Plus, X } from 'lucide-react';

interface ContractInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section | null;
  onUpdateContract: (sectionId: string, updatedContract: Section['contract']) => void;
}

export const ContractInspectorModal: React.FC<ContractInspectorModalProps> = ({
  isOpen,
  onClose,
  section,
  onUpdateContract,
}) => {
  if (!isOpen || !section) return null;

  const [wordTarget, setWordTarget] = useState(section.contract.wordTarget);
  const [description, setDescription] = useState(section.contract.description);
  const [newMove, setNewMove] = useState('');
  const [moves, setMoves] = useState<string[]>([...section.contract.requiredMoves]);

  const handleAddMove = () => {
    if (newMove.trim() && !moves.includes(newMove.trim())) {
      setMoves([...moves, newMove.trim()]);
      setNewMove('');
    }
  };

  const handleRemoveMove = (m: string) => {
    setMoves(moves.filter(item => item !== m));
  };

  const handleSave = () => {
    onUpdateContract(section.id, {
      ...section.contract,
      wordTarget,
      description,
      requiredMoves: moves,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-lg w-full p-6 text-slate-800">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Section Contract: {section.role}
              </h3>
              <p className="text-xs text-slate-500">
                Enforces rhetorical moves, word budgets, and doctrinal integrity checks.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">Section Word Budget (Target)</label>
            <input
              type="number"
              value={wordTarget}
              onChange={e => setWordTarget(parseInt(e.target.value, 10) || 500)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[10px] text-slate-400">
              Live word counters and AI budget-tightening routines will optimize for this limit.
            </span>
          </div>

          <div>
            <label className="font-semibold block mb-1">Section Mandate &amp; Role</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Required Rhetorical Moves</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {moves.map(m => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1 font-medium"
                >
                  <span>{m}</span>
                  <button onClick={() => handleRemoveMove(m)} className="hover:text-red-600 text-xs">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMove}
                onChange={e => setNewMove(e.target.value)}
                placeholder="Add rhetorical move (e.g. 'counter-argument', 'comparative-law')..."
                className="flex-1 border border-slate-300 rounded px-2.5 py-1"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMove();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddMove}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Citation Rules */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <span className="font-semibold text-slate-700 block mb-1">Active Citation Rules:</span>
            <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-0.5">
              {section.contract.citationRules.map((rule, rIdx) => (
                <li key={rIdx}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-xs"
          >
            Update Contract
          </button>
        </div>
      </div>
    </div>
  );
};
