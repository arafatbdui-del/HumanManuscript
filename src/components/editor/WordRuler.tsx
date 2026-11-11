/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Microsoft Word Horizontal Ruler Component
 */

import React from 'react';

export const WordRuler: React.FC = () => {
  // Typical Word 8.5-inch / A4 ruler ticks
  const inches = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="w-[820px] h-5 bg-slate-100 border-b border-x border-slate-300 flex items-center justify-between px-16 select-none text-[9px] text-slate-500 font-mono shadow-2xs relative mb-2 rounded-t-xs no-print">
      {/* Left Margin Indent Slider */}
      <div className="absolute left-16 top-0 bottom-0 flex items-center">
        <div className="w-2 h-3 bg-slate-400 border border-slate-500 rounded-xs shadow-2xs cursor-ew-resize" title="Left Indent (1 inch)" />
      </div>

      {/* Inch subdivisions */}
      <div className="flex-1 flex justify-between items-end h-full pb-0.5 px-4">
        {inches.map(i => (
          <div key={i} className="flex flex-col items-center">
            <span className="font-semibold text-slate-600 leading-none">{i}</span>
            <div className="w-px h-1.5 bg-slate-400 mt-0.5" />
          </div>
        ))}
      </div>

      {/* Right Margin Indent Slider */}
      <div className="absolute right-16 top-0 bottom-0 flex items-center">
        <div className="w-2 h-3 bg-slate-400 border border-slate-500 rounded-xs shadow-2xs cursor-ew-resize" title="Right Margin (1 inch)" />
      </div>
    </div>
  );
};
