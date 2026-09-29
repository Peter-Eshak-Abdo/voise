'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Share2,
  Download,
  Sparkles,
  Cpu,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { FallbackAttemptLog } from '@/types';

interface ResultEditorProps {
  text: string;
  onChangeText: (newText: string) => void;
  modelUsed: string;
  latencyMs: number;
  fallbackTrail: FallbackAttemptLog[];
  onReset: () => void;
}

export const ResultEditor: React.FC<ResultEditorProps> = ({
  text,
  onChangeText,
  modelUsed,
  latencyMs,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTimeSec = Math.ceil((wordCount / 200) * 60);

  const handleCopy = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('تم نسخ النص المنقح بنجاح!', {
        description: 'يمكنك الآن لصقه مباشرة في أي محادثة أو تطبيق.',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('تعذر النسخ إلى الحافظة تلقائياً');
    }
  };

  const handleShareWhatsApp = () => {
    if (!text.trim()) return;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'النص المنقح من VoiceClear',
          text: text,
        });
      } catch {
        // Share cancelled or failed
      }
    } else {
      handleShareWhatsApp();
    }
  };

  const handleDownloadTxt = () => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تفريغ_صوتي_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تنزيل الملف النصي بنجاح');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="w-full flex flex-col gap-4"
    >
      {/* Meta Bar: Model badge & Stats (Light Mode) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          {/* Active Model Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-medium">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>{modelUsed || 'Gemini AI'}</span>
            {latencyMs > 0 && (
              <span className="text-emerald-600 font-normal">
                • {(latencyMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        {/* Word / Char counter */}
        <div className="text-xs text-slate-500 flex items-center gap-3 font-mono">
          <span>{wordCount} كلمة</span>
          <span>•</span>
          <span>{charCount} حرف</span>
          <span>•</span>
          <span>~{readingTimeSec} ث قراءة</span>
        </div>
      </div>

      {/* Main Textarea Container (Light Mode) */}
      <div className="relative rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-100 p-5 flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>النص المنقح بالذكاء الاصطناعي (جاهز للتعديل والنسخ)</span>
          </div>

          <button
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            title="تفريغ فويس جديد"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تسجيل جديد</span>
          </button>
        </div>

        {/* Editable Textarea */}
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="سيظهر النص المنقح هنا..."
          rows={8}
          dir="rtl"
          className="w-full bg-transparent resize-y text-slate-900 text-base md:text-lg leading-relaxed focus:outline-none placeholder:text-slate-400 font-sans selection:bg-emerald-100 min-h-40"
        />

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-100">
          {/* Primary Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ النص المنقح</span>
              </>
            )}
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            {/* WhatsApp Direct Share */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              title="مشاركة عبر الواتساب"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>واتساب</span>
            </button>

            {/* Download TXT */}
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              title="تحميل كملف نصي"
            >
              <Download className="w-3.5 h-3.5" />
              <span>حفظ .txt</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
