/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Windows 10 Native-Style Title Bar with PWA Install & Quick Access Toolbar
 */

import React, { useState } from 'react';
import { Save, Undo, Redo, Shield, Download, Wifi, WifiOff, Sparkles, Monitor, Info } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface TitleBarProps {
  documentTitle: string;
  onSave: () => void;
  onBackup: () => void;
  onOpenSettings: () => void;
  isSaving?: boolean;
  lastSavedText?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  documentTitle,
  onSave,
  onBackup,
  onOpenSettings,
  isSaving,
  lastSavedText,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <div className="h-9 bg-slate-900 text-slate-300 flex items-center justify-between px-2 select-none border-b border-slate-800 text-xs no-print">
      {/* Left: Quick Access Toolbar */}
      <div className="flex items-center gap-1">
        {/* App Crest */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-semibold text-slate-100 mr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse" />
          <span className="font-heading-crest tracking-wide text-[11px] text-amber-200">HumanManuscript</span>
          <span className="text-[10px] text-slate-400 font-mono px-1 py-0.2 bg-slate-900 rounded">v0.2 PWA</span>
        </div>

        {/* Quick Action Icons */}
        <button
          onClick={onSave}
          title="Save project (Ctrl+S)"
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1"
        >
          <Save className="w-3.5 h-3.5 text-blue-400" />
          {isSaving && <span className="text-[10px] text-blue-300 animate-pulse">Saving...</span>}
        </button>

        <button
          onClick={onBackup}
          title="Backup offline bundle (.hmbak)"
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
        </button>

        <button
          onClick={() => {}}
          title="Undo (Ctrl+Z)"
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {}}
          title="Redo (Ctrl+Y)"
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* PWA Install Button (Mandatory as per skill) */}
        {!isInstalled && isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-sm transition"
            title="Install HumanManuscript as a standalone Windows desktop app"
          >
            <Monitor className="w-3 h-3" />
            <span>Install on Windows</span>
          </button>
        )}

        {!isInstalled && isIOS && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <Download className="w-3 h-3" />
            <span>Install PWA</span>
          </button>
        )}

        {isInstalled && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
            <Shield className="w-2.5 h-2.5" />
            <span>Desktop Standalone</span>
          </span>
        )}
      </div>

      {/* Center: Window Document Title */}
      <div className="truncate max-w-[360px] md:max-w-[480px] text-center font-medium text-slate-200 text-[11px] flex items-center justify-center gap-2">
        <span>{documentTitle} - HumanManuscript.hmproj</span>
        {lastSavedText && <span className="text-[10px] text-slate-400 font-normal">({lastSavedText})</span>}
      </div>

      {/* Right: Connectivity Status, Settings, Windows Window Controls */}
      <div className="flex items-center gap-2">
        {/* Online / Offline indicator */}
        <div
          title={isOnline ? 'Online: Cloud AI & DOI services active' : 'Offline Mode: Local SQLite & rules active'}
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${
            isOnline
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
              : 'bg-amber-950/50 text-amber-300 border border-amber-800/50'
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        <button
          onClick={onOpenSettings}
          title="Project & AI Settings"
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Windows 10 style min/max/close buttons */}
        <div className="flex items-center ml-2">
          <button
            title="Minimize"
            className="w-8 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            ―
          </button>
          <button
            title="Maximize / Restore"
            className="w-8 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition text-xs"
          >
            □
          </button>
          <button
            title="Close"
            className="w-9 h-7 flex items-center justify-center hover:bg-red-600 text-slate-400 hover:text-white transition text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal if needed */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-200">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              Install on iOS / Safari
            </h3>
            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. Launch directly from your home screen for full offline-first functionality.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-blue-600 hover:bg-blue-500 py-2 text-xs font-semibold text-white transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
