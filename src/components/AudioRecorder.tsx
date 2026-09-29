'use client';

import React from 'react';
import { Mic, Square, X, Radio } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface AudioRecorderProps {
  isRecording: boolean;
  recordingSeconds: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  isRecording,
  recordingSeconds,
  onStart,
  onStop,
  onCancel,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      {!isRecording ? (
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className="w-full py-3 px-4 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 flex items-center justify-center gap-2.5 font-medium text-sm transition-all active:scale-[0.99] disabled:opacity-50"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Mic className="w-4 h-4" />
          </div>
          <span>أو سجّل بصوتك مباشرة من هنا</span>
        </button>
      ) : (
        /* Active Recording State */
        <div className="w-full rounded-2xl bg-rose-950/30 border border-rose-500/40 p-4 flex items-center justify-between shadow-lg shadow-rose-950/20">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
            </span>

            <div className="flex items-center gap-2 font-mono text-sm font-bold text-rose-300">
              <Radio className="w-4 h-4 animate-pulse text-rose-400" />
              <span>جاري التسجيل: {formatDuration(recordingSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cancel */}
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
              title="إلغاء التسجيل"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Stop & Done */}
            <button
              type="button"
              onClick={onStop}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>إنهاء واعتماد</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
