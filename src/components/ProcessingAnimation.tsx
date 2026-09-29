'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const FUNNY_STAGES = [
  '🎧 بنسمع الرسالة الصوتية وبنحلل اللهجة بدقة...',
  '✂️ بنقصقص الـ "آآآآ" و"امممم" والتردد والكحة...',
  '🧠 لو غلطت وصلحت لنفسك في الجملة.. بنطلع المقصد النهائي بس...',
  '✨ بنظبط علامات الترقيم وصياغة الجمل لتبقى مفهومة وشيك...',
  '🚀 بنضع اللمسات الأخيرة للنص المنقح...',
];

export const ProcessingAnimation: React.FC = () => {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % FUNNY_STAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center py-10 px-4 text-center">
      {/* Central Visualizer Pod (Light Mode) */}
      <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center mb-6">
        {/* Animated Concentric Rings */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full border border-emerald-300 bg-emerald-50/50 blur-sm"
        />
        <motion.div
          animate={{ scale: [1.1, 1.45, 1.1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.4 }}
          className="absolute inset-0 rounded-full border border-teal-200 bg-teal-50/30"
        />

        {/* Orbiting AI Sparkles */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-between pointer-events-none p-1"
        >
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
          <div className="w-2 h-2 rounded-full bg-teal-400 shadow-md shadow-teal-400/50" />
        </motion.div>

        {/* Central Core Pod */}
        <div className="relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-white border border-emerald-300 shadow-xl shadow-emerald-500/10 flex flex-col items-center justify-center p-3 overflow-hidden">
          {/* Equalizer Bars morphing */}
          <div className="flex items-center gap-1.5 h-12">
            {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((heightRatio, i) => (
              <motion.div
                key={i}
                animate={{
                  height: ['20%', `${heightRatio * 100}%`, '25%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8 + (i % 3) * 0.2,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                  delay: i * 0.1,
                }}
                className="w-1.5 rounded-full bg-linear-to-t from-emerald-600 via-teal-500 to-emerald-400"
              />
            ))}
          </div>

          <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700">
            <Sparkles className="w-2.5 h-2.5 animate-spin" />
            <span>AI Listening</span>
          </div>
        </div>
      </div>

      {/* Dynamic Status Message */}
      <div className="h-16 flex items-center justify-center max-w-md px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={stageIndex}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-center gap-2 text-sm md:text-base font-bold text-slate-800"
          >
            <span>{FUNNY_STAGES[stageIndex]}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-xs text-slate-500 mt-2 font-mono">
        يستغرق التفريغ والتنقيح عادة ثوانٍ معدودة فقط
      </p>
    </div>
  );
};
