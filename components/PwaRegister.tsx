'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaRegister() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      ('standalone' in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches;

    setIsIos(ios);
    if (standalone) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (ios && !standalone) {
      const dismissed = sessionStorage.getItem('pwa-ios-dismissed');
      if (!dismissed) {
        const t = setTimeout(() => setShow(true), 4000);
        return () => {
          clearTimeout(t);
          window.removeEventListener('beforeinstallprompt', handler);
        };
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  }

  function dismiss() {
    setShow(false);
    if (isIos) sessionStorage.setItem('pwa-ios-dismissed', '1');
  }

  if (!show) return null;

  if (isIos) {
    return (
      <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-50 animate-fade-in">
        <div
          className="bg-slate-800 rounded-2xl px-4 py-3.5"
          style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">เพิ่มลงหน้าหลัก</p>
              <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                กด{' '}
                <svg
                  className="inline w-3.5 h-3.5 mb-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>{' '}
                แชร์ แล้วเลือก{' '}
                <span className="text-white font-semibold">"เพิ่มใน Home Screen"</span>
              </p>
            </div>
            <button
              onClick={dismiss}
              className="text-slate-400 active:text-white text-2xl leading-none px-1"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-50">
      <div
        className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}
      >
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-lg">P</span>
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">ติดตั้ง PortFlow</p>
          <p className="text-slate-400 text-xs">ใช้แบบ App บนหน้าจอหลัก</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold active:bg-indigo-700 flex-shrink-0"
        >
          ติดตั้ง
        </button>
        <button
          onClick={dismiss}
          className="w-7 h-7 flex items-center justify-center text-slate-400 text-xl leading-none active:text-white flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}
