'use client';

import React from 'react';
import { History, Volume2, ShieldCheck, Download } from 'lucide-react';

interface NavbarProps {
  onOpenHistory: () => void;
  historyCount: number;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  historyCount,
  onInstallPwa,
  canInstallPwa,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/85 border-b border-slate-200/80 transition-all">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-linear-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-[1px] shadow-sm shadow-emerald-500/10">
            <div className="w-full h-full bg-white rounded-[15px] flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-emerald-600 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-lg tracking-tight bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                VoiceClear
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              تفريغ وتنقيح فوري لصوتيات الواتساب
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Privacy badge */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/80 border border-emerald-200 rounded-full px-3 py-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>بياناتك محلية 100% (IndexedDB)</span>
          </div>

          {/* PWA Install Button */}
          {canInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              title="تثبيت التطبيق على جهازك"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت التطبيق</span>
            </button>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="relative p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-600 transition-all active:scale-95 shadow-xs cursor-pointer"
            aria-label="سجل التسجيلات السابقة"
            title="السجل المحلي للتفريغات"
          >
            <History className="w-5 h-5" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
