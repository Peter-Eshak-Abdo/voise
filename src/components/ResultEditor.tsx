'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Share2,
  Download,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
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
  fallbackTrail,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTrail, setShowTrail] = useState(false);

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
    // WhatsApp direct Web / App URI
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
      {/* Meta Bar: Model badge & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          {/* Active Model Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>{modelUsed || 'Gemini AI'}</span>
            {latencyMs > 0 && (
              <span className="text-emerald-500/80 font-normal">
                • {(latencyMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {/* Fallback trail badge if multiple models were attempted */}
          {fallbackTrail && fallbackTrail.length > 1 && (
            <button
              onClick={() => setShowTrail(!showTrail)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-colors"
              title="عرض مسار الـ Fallback"
            >
              <Layers className="w-3 h-3 text-teal-400" />
              <span>{fallbackTrail.length} موديلات جربت</span>
              {showTrail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Word / Char counter */}
        <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
          <span>{wordCount} كلمة</span>
          <span>•</span>
          <span>{charCount} حرف</span>
          <span>•</span>
          <span>~{readingTimeSec} ث قراءة</span>
        </div>
      </div>

      {/* Fallback Trail Drawer Details (if toggled) */}
      {showTrail && fallbackTrail.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 text-xs space-y-2 font-mono overflow-hidden"
        >
          <p className="font-bold text-slate-300 mb-1">مسار فحص موديلات Gemini:</p>
          {fallbackTrail.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded-xl ${
                item.success
                  ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/30 border border-rose-900/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{idx + 1}. {item.model}</span>
                <span className="text-[10px] opacity-75">
                  ({(item.durationMs / 1000).toFixed(2)}s)
                </span>
              </div>
              <span>{item.success ? '✓ نجاح وتفريغ' : `✗ فشل (${item.statusCode || 'خطأ'})`}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Main Textarea Container with Sleek Glow */}
      <div className="relative group rounded-3xl p-[1px] bg-linear-to-b from-emerald-500/20 via-slate-800 to-slate-900 shadow-2xl">
        <div className="relative bg-slate-950/95 rounded-[23px] p-4 md:p-5 flex flex-col backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>النص المنقح بالذكاء الاصطناعي (جاهز للتعديل والنسخ)</span>
            </div>

            <button
              onClick={onReset}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              title="تفريغ فويس جديد"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تسجيل جديد</span>
            </button>
          </div>

          {/* Editable Textarea with Staggered Entrance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <textarea
              value={text}
              onChange={(e) => onChangeText(e.target.value)}
              placeholder="سيظهر النص المنقح هنا..."
              rows={8}
              dir="rtl"
              className="w-full bg-transparent resize-y text-slate-100 text-base md:text-lg leading-relaxed focus:outline-none placeholder:text-slate-600 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 min-h-[160px]"
            />
          </motion.div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-800/80">
            {/* Primary Copy Button with Shadcn / Sonner Toast */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-lienar-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
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
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 text-xs font-semibold hover:border-emerald-500 active:scale-95 transition-all"
                title="مشاركة عبر الواتساب"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </button>

              {/* Download TXT */}
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold hover:border-slate-700 active:scale-95 transition-all"
                title="تحميل كملف نصي"
              >
                <Download className="w-3.5 h-3.5" />
                <span>حفظ .txt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
