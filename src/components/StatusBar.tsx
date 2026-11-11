/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Word-Style Bottom Status Bar (Words Budget, en-GB, Originality Tally, Zoom)
 */

import React from 'react';
import { ZoomIn, ZoomOut, Shield, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface StatusBarProps {
  currentSectionWords: number;
  sectionTargetWords: number;
  totalManuscriptWords: number;
  originalityRedCount: number;
  originalityOrangeCount: number;
  trackChangesActive: boolean;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  lastBackupText: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentSectionWords,
  sectionTargetWords,
  totalManuscriptWords,
  originalityRedCount,
  originalityOrangeCount,
  trackChangesActive,
  zoomLevel,
  onZoomChange,
  lastBackupText,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <footer className="h-6 bg-slate-100 border-t border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-600 select-none no-print">
      {/* Left: Word Metrics */}
      <div className="flex items-center gap-3">
        <span title="Section word count against contract target">
          Section: <strong className="text-slate-800">{currentSectionWords}</strong> / {sectionTargetWords} wds
        </span>
        <span className="text-slate-300">|</span>
        <span title="Total manuscript word count">
          Total: <strong className="text-slate-800">{totalManuscriptWords}</strong> words
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-emerald-800 font-medium">English (UK) en-GB</span>
      </div>

      {/* Center: Originality & AI Status */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5" title="Live originality flags">
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            {originalityRedCount} verbatim
          </span>
          <span className="text-slate-300">,</span>
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {originalityOrangeCount} paraphrase
          </span>
        </span>

        <span className="text-slate-300">|</span>

        <span
          className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
            trackChangesActive ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-400'
          }`}
        >
          Track Changes: {trackChangesActive ? 'ON' : 'OFF'}
        </span>

        <span className="text-slate-300">|</span>

        <span className="text-slate-500">{lastBackupText}</span>
      </div>

      {/* Right: Zoom Slider */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(70, zoomLevel - 10))}
          className="hover:text-slate-900 transition"
          title="Zoom out"
        >
          <ZoomOut className="w-3 h-3" />
        </button>

        <input
          type="range"
          min="70"
          max="150"
          step="5"
          value={zoomLevel}
          onChange={e => onZoomChange(parseInt(e.target.value, 10))}
          className="w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />

        <button
          onClick={() => onZoomChange(Math.min(150, zoomLevel + 10))}
          className="hover:text-slate-900 transition"
          title="Zoom in"
        >
          <ZoomIn className="w-3 h-3" />
        </button>

        <span className="w-9 text-right font-mono text-[10px]">{zoomLevel}%</span>
      </div>
    </footer>
  );
};
