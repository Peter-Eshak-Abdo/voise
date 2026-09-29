'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function checkIsIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return isIos && !isStandalone;
}

const emptySubscribe = () => () => {};

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Safely read external browser state without triggering cascading render warnings
  const isIos = useSyncExternalStore(
    emptySubscribe,
    checkIsIosDevice,
    () => false
  );

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const showBanner = !dismissed && (!!deferredPrompt || isIos);

  if (!showBanner) return null;

  return (
    <div className="w-full mb-6">
      <div className="relative overflow-hidden rounded-2xl bg-emerald-50/90 border border-emerald-200 p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600 shadow-2xs">
            <Smartphone className="w-5 h-5" />
          </div>

          <div>
            <h4 className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>تثبيت VoiceClear على الموبايل</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-medium">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-600">
              {isIos
                ? 'اضغط زر المشاركة (Share) في Safari ثم اختر "إضافة إلى الشاشة الرئيسية"'
                : 'نزّل التطبيق على هاتفك وافتحه مباشرة بدون متصفح وبشكل فوري'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت الآن</span>
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
