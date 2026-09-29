'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AudioDropzone } from '@/components/AudioDropzone';
import { AudioRecorder } from '@/components/AudioRecorder';
import { ProcessingAnimation } from '@/components/ProcessingAnimation';
import { ResultEditor } from '@/components/ResultEditor';
import { ErrorAlert } from '@/components/ErrorAlert';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { getAllHistory } from '@/lib/indexedDb';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const {
    stage,
    selectedFile,
    audioUrl,
    audioDuration,
    refinedText,
    modelUsed,
    latencyMs,
    fallbackTrail,
    errorMessage,
    isRecording,
    recordingSeconds,
    handleFileSelect,
    startRecording,
    stopRecording,
    cancelRecording,
    processAudio,
    retryProcessing,
    setRefinedText,
    resetAll,
    loadFromHistory,
  } = useVoiceTranscription();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  // Load initial history count from IndexedDB
  useEffect(() => {
    getAllHistory()
      .then((items) => setHistoryCount(items.length))
      .catch(() => {});
  }, [stage]);

  const isProcessing = stage === 'contacting_ai' || stage === 'refining_text';
  const hasAudio = !!selectedFile;

  return (
    <main className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 relative selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-linear-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navbar */}
      <Navbar
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={historyCount}
      />

      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={loadFromHistory}
        onHistoryCountChange={setHistoryCount}
      />

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        {/* PWA Install Banner */}
        <PwaInstallPrompt />

        {/* Hero Header */}
        <section className="text-center mb-8 md:mb-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام 5-Stage Gemini Fallback فائق الدقة</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-50 tracking-tight leading-tight mb-3">
            حوّل رسايل الواتساب الصوتية إلى{' '}
            <span className="bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              نص عربي منقح
            </span>
          </h2>

          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            تفريغ ذكي يشيل التأتأة والكحة وكلمات الحشو (آآ، امم)، ويصحح زلات اللسان تلقائياً
            ليظهر المعنى النهائي المقصود بدقة فائقة.
          </p>
        </section>

        {/* Interactive Main Workspace Card */}
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {/* Stage: Loading & AI Processing Animation */}
            {isProcessing && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full rounded-3xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-xl p-6 shadow-2xl"
              >
                <ProcessingAnimation />
              </motion.div>
            )}

            {/* Stage: Error Card */}
            {stage === 'error' && errorMessage && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <ErrorAlert
                  message={errorMessage}
                  fallbackTrail={fallbackTrail}
                  onRetry={retryProcessing}
                  onReset={resetAll}
                />
              </motion.div>
            )}

            {/* Stage: Refined Result Text Editor */}
            {stage === 'success' && refinedText && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="w-full"
              >
                <ResultEditor
                  text={refinedText}
                  onChangeText={setRefinedText}
                  modelUsed={modelUsed}
                  latencyMs={latencyMs}
                  fallbackTrail={fallbackTrail}
                  onReset={resetAll}
                />
              </motion.div>
            )}

            {/* Stage: Idle / Uploading Form */}
            {!isProcessing && stage !== 'success' && (
              <motion.div
                key="upload-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col gap-5"
              >
                {/* Audio Upload Dropzone */}
                <AudioDropzone
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  audioUrl={audioUrl}
                  audioDuration={audioDuration}
                  onClear={resetAll}
                  disabled={isRecording}
                />

                {/* Direct Mic Audio Recorder */}
                {!selectedFile && (
                  <AudioRecorder
                    isRecording={isRecording}
                    recordingSeconds={recordingSeconds}
                    onStart={startRecording}
                    onStop={stopRecording}
                    onCancel={cancelRecording}
                  />
                )}

                {/* Primary CTA: Process Audio */}
                {hasAudio && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 pt-2"
                  >
                    <button
                      type="button"
                      onClick={processAudio}
                      className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-base flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5 fill-current" />
                      <span>بدء التفريغ والتنقيح بالذكاء الاصطناعي</span>
                    </button>
                    <p className="text-center text-[11px] text-slate-400">
                      يتم الإرسال بأمان عبر نظام Fallback لـ 5 موديلات Gemini بدون تخزين على أي سيرفر خارجي
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feature Highlights Grid */}
        <section className="w-full max-w-2xl mt-14 md:mt-20 pt-8 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">تنقية ذكية وفورية</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              إزالة التردد، الكحة، وكلمات الحشو التلقائية مع استخلاص المقصد الفعلي للمتحدث.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">خصوصية تامة 100%</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              السجل محفوظ بالكامل على جهازك في IndexedDB. لا توجد قواعد بيانات خارجية.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">5 موديلات Fallback</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              تبديل تلقائي مرن بين أحدث موديلات Gemini لضمان عدم توقف الخدمة أبداً.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-400">
          <p>
            تطبيق <span className="text-emerald-400 font-bold">VoiceClear PWA</span> • مصمم للعمل بسلاسة على الموبايل والكمبيوتر
          </p>
        </footer>
      </div>
    </main>
  );
}
