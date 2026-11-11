/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Settings Modal for AI Providers, Privacy Controls, and PWA configuration
 */

import React, { useState } from 'react';
import { Manuscript } from '../../types/manuscript';
import { Sparkles, Shield, Key, Monitor, Wifi, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscript: Manuscript;
  onUpdateSettings: (newSettings: Manuscript['settings']) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  manuscript,
  onUpdateSettings,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [geminiKey, setGeminiKey] = useState(manuscript.settings.geminiApiKey || '');
  const [kimiKey, setKimiKey] = useState(manuscript.settings.kimiApiKey || '');
  const [ollamaUrl, setOllamaUrl] = useState(manuscript.settings.ollamaEndpoint || 'http://localhost:11434');
  const [activeProvider, setActiveProvider] = useState(manuscript.settings.activeProvider || 'gemini');
  const [sensitivity, setSensitivity] = useState(manuscript.settings.originalitySensitivity || 8);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSettings({
      ...manuscript.settings,
      geminiApiKey: geminiKey.trim() || undefined,
      kimiApiKey: kimiKey.trim() || undefined,
      ollamaEndpoint: ollamaUrl.trim() || undefined,
      activeProvider,
      originalitySensitivity: sensitivity,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-lg w-full p-6 text-slate-800">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Project &amp; AI Provider Settings</h3>
              <p className="text-xs text-slate-500">Local-first security: keys stay on your machine.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-4 text-xs">
          {/* PWA Windows Installation section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-semibold block text-slate-800">Windows Desktop App (PWA)</span>
                <span className="text-[11px] text-slate-500">
                  {isInstalled ? 'Running in standalone desktop mode' : 'Installable for offline use on Windows 10/11'}
                </span>
              </div>
            </div>
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-xs transition"
              >
                Install App
              </button>
            )}
            {isInstalled && (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Installed
              </span>
            )}
          </div>

          {/* Active AI Provider selection */}
          <div>
            <label className="font-semibold block mb-1">Active AI Provider (Section 9)</label>
            <select
              value={activeProvider}
              onChange={e => setActiveProvider(e.target.value as any)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="kimi">Moonshot Kimi (API Key)</option>
              <option value="claude">Anthropic Claude</option>
              <option value="ollama">Ollama (100% Offline Local Model)</option>
              <option value="manual-bridge">Manual Copy/Paste Bridge</option>
            </select>
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="font-semibold block mb-1 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <span className="text-[10px] text-amber-700">Optional (Uses AI Studio Key by default)</span>
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
              placeholder="AIzaSy... (leave blank to use system key)"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
            />
          </div>

          {/* Ollama Local URL */}
          {activeProvider === 'ollama' && (
            <div>
              <label className="font-semibold block mb-1">Ollama Local Endpoint</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={e => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
          )}

          {/* Originality Sensitivity */}
          <div>
            <label className="font-semibold block mb-1 flex items-center justify-between">
              <span>Originality Sensitivity Threshold</span>
              <span className="font-mono text-slate-500">{sensitivity} consecutive words</span>
            </label>
            <input
              type="range"
              min="5"
              max="15"
              value={sensitivity}
              onChange={e => setSensitivity(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600"
            />
            <span className="text-[10px] text-slate-400">
              Default is 8 words. Shorter thresholds flag standard legal formulas more frequently.
            </span>
          </div>

          {/* Privacy Guarantee Box */}
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              <span>Offline-First Privacy Guarantee (Section 15)</span>
            </div>
            <p className="text-[10px] text-emerald-800 leading-normal">
              Your unpublished manuscript and confidential reviewer reports are stored locally in your device's database. Nothing is sent to third-party models without explicit author action.
            </p>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-xs shadow-xs flex items-center gap-1 transition"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : null}
            <span>{savedSuccess ? 'Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
