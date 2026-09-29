'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw, ArrowRight } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  onRetry,
  onReset,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full rounded-2xl border border-rose-200 bg-white p-6 shadow-md shadow-rose-100/50"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>

        <div className="flex-1">
          <h4 className="text-base font-bold text-slate-800 mb-1">
            تعذر تفريغ الصوت في الوقت الحالي
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            {message || 'حدث ضغط مؤقت على سيرفرات الذكاء الاصطناعي. يرجى الضغط على زر "حاول تاني".'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>حاول تاني</span>
            </button>

            <button
              onClick={onReset}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-all cursor-pointer"
            >
              اختيار فويس آخر
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
