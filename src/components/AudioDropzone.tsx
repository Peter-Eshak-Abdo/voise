'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, Music, Play, Pause, FileAudio, Trash2, CheckCircle2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface AudioDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  audioUrl: string | null;
  audioDuration: number;
  onClear: () => void;
  disabled?: boolean;
}

export const AudioDropzone: React.FC<AudioDropzoneProps> = ({
  onFileSelect,
  selectedFile,
  audioUrl,
  audioDuration,
  onClear,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidAudio(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const isValidAudio = (file: File): boolean => {
    const validExtensions = ['.opus', '.ogg', '.m4a', '.wav', '.mp3', '.aac', '.webm'];
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return (
      validExtensions.some((ext) => name.endsWith(ext)) ||
      type.startsWith('audio/') ||
      type.includes('ogg') ||
      type.includes('opus')
    );
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setCurrentTime(audioPlayerRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".opus,.ogg,.m4a,.wav,.mp3,.aac,.webm,audio/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {!selectedFile ? (
        /* Empty Upload Dropzone (Light Mode) */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-6 md:p-8 transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden
            ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01] shadow-md shadow-emerald-500/10'
                : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50/60 shadow-xs'
            }
            ${disabled ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          {/* Central Animated Icon */}
          <div className="relative mb-4 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover:scale-105 group-hover:border-emerald-400 transition-transform">
              <UploadCloud className="w-8 h-8 text-emerald-600 group-hover:animate-bounce" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-emerald-300 flex items-center justify-center shadow-xs">
              <FileAudio className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>

          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-1">
            اضغط لاختيار أو اسحب فويس الواتساب هنا
          </h3>
          <p className="text-xs md:text-sm text-slate-500 max-w-sm mb-4">
            يدعم ملفات الواتساب الصوتية مباشرة بدون الحاجة لأي برامج تحويل
          </p>

          {/* Format Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {['.opus', '.ogg', '.m4a', '.wav', '.mp3'].map((format) => (
              <span
                key={format}
                className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* Selected Audio Preview Card (Light Mode) */
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-white p-5 shadow-md shadow-emerald-500/5">
          <audio
            ref={audioPlayerRef}
            src={audioUrl || ''}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
            preload="metadata"
            className="hidden"
          />

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Music className="w-6 h-6 text-emerald-600" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-bold text-slate-800 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • جاهز للتفريغ الذكي
                </p>
              </div>
            </div>

            {/* Remove / Replace File */}
            {!disabled && (
              <button
                onClick={onClear}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                title="إلغاء الملف واختيار غيره"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Interactive Mini Player */}
          {audioUrl && (
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm shadow-emerald-600/20 cursor-pointer"
                title={isPlaying ? 'إيقاف مؤقت' : 'استماع للملف'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <div className="flex-1">
                {/* Progress bar */}
                <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-emerald-600 rounded-full transition-all duration-100"
                    style={{
                      width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{audioDuration > 0 ? formatDuration(audioDuration) : '--:--'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
