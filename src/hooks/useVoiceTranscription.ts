'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FallbackAttemptLog,
  HistoryItem,
  ProcessingStage,
  TranscriptionApiResponse,
} from '@/types';
import { saveHistoryItem } from '@/lib/indexedDb';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface UseVoiceTranscriptionReturn {
  // State
  stage: ProcessingStage;
  selectedFile: File | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioDuration: number;
  refinedText: string;
  modelUsed: string;
  latencyMs: number;
  fallbackTrail: FallbackAttemptLog[];
  errorMessage: string | null;
  isRecording: boolean;
  recordingSeconds: number;

  // Actions
  handleFileSelect: (file: File) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  processAudio: (fileOverride?: File) => Promise<void>;
  retryProcessing: () => Promise<void>;
  setRefinedText: (text: string) => void;
  resetAll: () => void;
  loadFromHistory: (item: HistoryItem) => void;
}

export function useVoiceTranscription(): UseVoiceTranscriptionReturn {
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  const [refinedText, setRefinedText] = useState<string>('');
  const [modelUsed, setModelUsed] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [fallbackTrail, setFallbackTrail] = useState<FallbackAttemptLog[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [audioUrl]);

  // Handle file chosen by user or drag & dropped
  const handleFileSelect = useCallback((file: File) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setSelectedFile(file);
    setAudioBlob(file);
    const newUrl = URL.createObjectURL(file);
    setAudioUrl(newUrl);
    setErrorMessage(null);
    setStage('idle');

    // Estimate duration
    const tempAudio = new Audio(newUrl);
    tempAudio.onloadedmetadata = () => {
      if (Number.isFinite(tempAudio.duration)) {
        setAudioDuration(Math.round(tempAudio.duration));
      }
    };
  }, [audioUrl]);

  // Start in-browser recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determine best audio mime type supported by browser
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(recordedBlob);
        const fileName = `تسجيل_${new Date().toLocaleTimeString('ar-EG').replace(/:/g, '-')}.ogg`;
        const recordedFile = new File([recordedBlob], fileName, { type: mimeType });
        setSelectedFile(recordedFile);

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const newUrl = URL.createObjectURL(recordedBlob);
        setAudioUrl(newUrl);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setStage('recording');

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Mic access error:', err);
      toast.error('تعذر الوصول إلى الميكروفون. يرجى إعطاء الإذن للمتصفح.');
    }
  }, [audioUrl]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setAudioDuration(recordingSeconds);
      setStage('idle');
    }
  }, [isRecording, recordingSeconds]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setStage('idle');
      audioChunksRef.current = [];
    }
  }, [isRecording]);

  // Process the audio through Gemini 5-stage fallback
  const processAudio = useCallback(async (fileOverride?: File) => {
    const fileToUpload =
      fileOverride ||
      selectedFile ||
      (audioBlob
        ? new File([audioBlob], 'whatsapp_voice.ogg', {
            type: audioBlob?.type || 'audio/ogg',
          })
        : null);

    if (!fileToUpload) {
      toast.error('يرجى اختيار أو تسجيل ملف صوتي أولاً.');
      return;
    }

    setStage('contacting_ai');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', fileToUpload);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data: TranscriptionApiResponse = await res.json();

      if (!data.success) {
        setStage('error');
        setErrorMessage(data.error || 'حدث خطأ أثناء معالجة الصوت.');
        setFallbackTrail(data.fallbackTrail || []);
        toast.error('تعذر تفريغ الصوت بنجاح');
        return;
      }

      setRefinedText(data.refinedText);
      setModelUsed(data.modelUsed);
      setLatencyMs(data.latencyMs);
      setFallbackTrail(data.fallbackTrail);
      setStage('success');

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#38bdf8'],
        });
      } catch {
        // ignore confetti failures
      }

      toast.success('تم تفريغ وتنقيح الرسالة الصوتية بنجاح!');

      // Save to client-side IndexedDB for offline history
      const historyItem: HistoryItem = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        fileName: fileToUpload.name,
        fileSizeFormatted: data.audioMeta?.sizeFormatted || 'غير محدد',
        durationSeconds: audioDuration || undefined,
        refinedText: data.refinedText,
        modelUsed: data.modelUsed,
        latencyMs: data.latencyMs,
        isFavorite: false,
      };

      await saveHistoryItem(historyItem);
    } catch (err: unknown) {
      console.error('Transcription error:', err);
      setStage('error');
      const msg =
        err instanceof Error
          ? err.message
          : 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  }, [audioBlob, selectedFile, audioDuration]);

  // Retry processing
  const retryProcessing = useCallback(async () => {
    await processAudio();
  }, [processAudio]);

  // Reset state
  const resetAll = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setSelectedFile(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setRefinedText('');
    setModelUsed('');
    setLatencyMs(0);
    setFallbackTrail([]);
    setErrorMessage(null);
    setStage('idle');
  }, [audioUrl]);

  // Load an existing item from IndexedDB history
  const loadFromHistory = useCallback((item: HistoryItem) => {
    setRefinedText(item.refinedText);
    setModelUsed(item.modelUsed);
    setLatencyMs(item.latencyMs);
    setAudioDuration(item.durationSeconds || 0);
    setErrorMessage(null);
    setStage('success');
    toast.info('تم استرجاع التسجيل من السجل المحلي');
  }, []);

  return {
    stage,
    selectedFile,
    audioBlob,
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
  };
}
