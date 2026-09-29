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
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

  // Handle incoming audio from WhatsApp via Web Share Target (Multi-Storage Bridge)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isCancelled = false;

    async function checkAndLoadSharedAudio() {
      try {
        let fileToLoad: File | null = null;

        // 1. Check CacheStorage first (Native blob, zero length limits, cross-window)
        if ('caches' in window) {
          try {
            const cache = await caches.open('voiceclear-shared-cache');
            const cachedRes = await cache.match('/shared-audio-file');
            if (cachedRes) {
              const blob = await cachedRes.blob();
              if (blob && blob.size > 0) {
                const rawName = cachedRes.headers.get('X-File-Name');
                const fileName = rawName ? decodeURIComponent(rawName) : 'whatsapp_voice.ogg';
                const mimeType = cachedRes.headers.get('Content-Type') || blob.type || 'audio/ogg';
                fileToLoad = new File([blob], fileName, { type: mimeType });
                await cache.delete('/shared-audio-file');
              }
            }
          } catch (e) {
            console.warn('CacheStorage read error:', e);
          }
        }

        // 2. Check IndexedDB if not found in CacheStorage
        if (!fileToLoad && 'indexedDB' in window) {
          try {
            fileToLoad = await new Promise<File | null>((resolve) => {
              const req = indexedDB.open('voiceclear-share-db', 2);
              req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('shared')) {
                  db.createObjectStore('shared', { keyPath: 'id' });
                }
              };
              req.onsuccess = (e: Event) => {
                try {
                  const db = (e.target as IDBOpenDBRequest).result;
                  if (!db.objectStoreNames.contains('shared')) {
                    resolve(null);
                    return;
                  }
                  const tx = db.transaction('shared', 'readwrite');
                  const store = tx.objectStore('shared');
                  const getReq = store.get('latest_share');
                  getReq.onsuccess = () => {
                    const res = getReq.result;
                    if (res) {
                      store.delete('latest_share');
                      if (res.blob instanceof Blob && res.blob.size > 0) {
                        const f = new File(
                          [res.blob],
                          res.payload?.name || 'whatsapp_voice.ogg',
                          { type: res.payload?.type || res.blob.type || 'audio/ogg' }
                        );
                        resolve(f);
                        return;
                      } else if (res.payload?.base64) {
                        const byteChars = atob(res.payload.base64);
                        const u8 = new Uint8Array(byteChars.length);
                        for (let i = 0; i < byteChars.length; i++) {
                          u8[i] = byteChars.charCodeAt(i);
                        }
                        const f = new File([u8], res.payload.name || 'whatsapp_voice.ogg', {
                          type: res.payload.type || 'audio/ogg',
                        });
                        resolve(f);
                        return;
                      }
                    }
                    resolve(null);
                  };
                  getReq.onerror = () => resolve(null);
                } catch {
                  resolve(null);
                }
              };
              req.onerror = () => resolve(null);
              setTimeout(() => resolve(null), 800);
            });
          } catch (e) {
            console.warn('IndexedDB read error:', e);
          }
        }

        // 3. Check localStorage
        if (!fileToLoad) {
          try {
            const raw = localStorage.getItem('voiceclear_shared_audio');
            if (raw) {
              localStorage.removeItem('voiceclear_shared_audio');
              const parsed = JSON.parse(raw);
              if (parsed.base64) {
                const byteChars = atob(parsed.base64);
                const u8 = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                  u8[i] = byteChars.charCodeAt(i);
                }
                fileToLoad = new File([u8], parsed.name || 'whatsapp_voice.ogg', {
                  type: parsed.type || 'audio/ogg',
                });
              }
            }
          } catch (e) {
            console.warn('localStorage read error:', e);
          }
        }

        // 4. Check sessionStorage
        if (!fileToLoad) {
          try {
            const raw = sessionStorage.getItem('voiceclear_shared_audio');
            if (raw) {
              sessionStorage.removeItem('voiceclear_shared_audio');
              const parsed = JSON.parse(raw);
              if (parsed.base64) {
                const byteChars = atob(parsed.base64);
                const u8 = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                  u8[i] = byteChars.charCodeAt(i);
                }
                fileToLoad = new File([u8], parsed.name || 'whatsapp_voice.ogg', {
                  type: parsed.type || 'audio/ogg',
                });
              }
            }
          } catch (e) {
            console.warn('sessionStorage read error:', e);
          }
        }

        if (isCancelled || !fileToLoad) return;

        // Clean up URL parameters
        const url = new URL(window.location.href);
        const shouldAutostart =
          url.searchParams.get('autostart') === '1' ||
          url.searchParams.get('shared') === '1';

        if (
          url.searchParams.has('shared') ||
          url.searchParams.has('autostart') ||
          url.searchParams.has('error')
        ) {
          url.searchParams.delete('shared');
          url.searchParams.delete('autostart');
          url.searchParams.delete('error');
          window.history.replaceState({}, '', url.pathname);
        }

        // Put audio into dropzone and player
        handleFileSelect(fileToLoad);

        toast.success('تم استلام الفويس من الواتساب بنجاح! 🎙️', {
          description: shouldAutostart
            ? 'جاري بدء التفريغ والتنقيح التلقائي بالذكاء الاصطناعي...'
            : 'جاهز الآن للتفريغ والتنقيح.',
        });

        // Automatically trigger AI transcription without requiring user click!
        if (shouldAutostart) {
          setTimeout(() => {
            if (!isCancelled) {
              processAudio(fileToLoad);
            }
          }, 400);
        }
      } catch (err) {
        console.error('Error restoring shared audio:', err);
      }
    }

    checkAndLoadSharedAudio();

    return () => {
      isCancelled = true;
    };
  }, [handleFileSelect, processAudio]);

  const isProcessing = stage === 'contacting_ai' || stage === 'refining_text';
  const hasAudio = !!selectedFile;

  return (
    <main className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 relative selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Background Soft Ambient Light */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-linear-to-b from-emerald-100/50 via-teal-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

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

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        {/* PWA Install Banner */}
        <PwaInstallPrompt />

        {/* Hero Header (Clean Light Mode) */}
        <section className="text-center mb-8 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>تفريغ وتنقيح ذكي بالذكاء الاصطناعي</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2.5">
            حوّل رسايل الواتساب الصوتية إلى{' '}
            <span className="bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              نص عربي منقح
            </span>
          </h2>

          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            يشيل التأتأة والكحة وكلمات الحشو (آآ، امم)، ويصحح زلات اللسان تلقائياً
            ليظهر المعنى المقصود بوضوح وسلاسة.
          </p>
        </section>

        {/* Interactive Main Workspace Card */}
        <div className="w-full flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {/* Stage: Loading & AI Processing Animation */}
            {isProcessing && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full rounded-3xl bg-white border border-emerald-200 p-6 shadow-lg shadow-emerald-500/5"
              >
                <ProcessingAnimation />
              </motion.div>
            )}

            {/* Stage: Simple & Clean Error Card */}
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
                className="w-full flex flex-col gap-4"
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
                      onClick={() => processAudio()}
                      className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5 fill-current" />
                      <span>بدء التفريغ والتنقيح بالذكاء الاصطناعي</span>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clean Minimal Footer */}
        <footer className="mt-14 text-center text-xs text-slate-400">
          <p>
            تطبيق <span className="text-emerald-700 font-bold">VoiceClear PWA</span> • تفريغ فوري ومحلي لصوتيات الواتساب
          </p>
        </footer>
      </div>
    </main>
  );
}
