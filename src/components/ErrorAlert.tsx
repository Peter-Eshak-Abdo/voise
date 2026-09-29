'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Layers } from 'lucide-react';
import { FallbackAttemptLog } from '@/types';

interface ErrorAlertProps {
  message: string;
  fallbackTrail?: FallbackAttemptLog[];
  onRetry: () => void;
  onReset: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  fallbackTrail,
  onRetry,
  onReset,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full rounded-3xl border border-rose-500/30 bg-linear-to-b from-rose-950/40 to-slate-950 p-6 shadow-2xl shadow-rose-950/30"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
        </div>

        <div className="flex-1">
          <h4 className="text-base font-bold text-rose-200 mb-1">
            تعذر إكمال تفريغ الرسالة الصوتية
          </h4>
          <p className="text-sm text-rose-300/80 leading-relaxed mb-4">
            {message || 'حدث خطأ غير متوقع أثناء معالجة الصوت بالذكاء الاصطناعي.'}
          </p>

          {/* Fallback attempts summary if available */}
          {fallbackTrail && fallbackTrail.length > 0 && (
            <div className="mb-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>الموديلات التي تم فحصها ({fallbackTrail.length}):</span>
              </div>
              <ul className="space-y-1">
                {fallbackTrail.map((item, i) => (
                  <li key={i} className="truncate">
                    • <span className="text-slate-300">{item.model}</span>: {item.error || 'فشل الاستجابة'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>حاول تاني</span>
            </button>

            <button
              onClick={onReset}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-800 transition-all"
            >
              اختيار ملف صوتي آخر
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
