'use client';

import Script from 'next/script';
import { signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useRef } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: { id: number; first_name: string; username?: string; photo_url?: string };
        };
        ready(): void;
        expand(): void;
        colorScheme: 'light' | 'dark';
      };
    };
  }
}

export function TgInit() {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);

  function onLoad() {
    if (done.current) return;
    done.current = true;

    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    if (tg.colorScheme === 'light') {
      document.documentElement.classList.add('light');
    }

    const initData = tg.initData;
    if (!initData) return;

    // Store initData for vincular page
    try { sessionStorage.setItem('tg_init_data', initData); } catch {}

    if (pathname.startsWith('/tg/vincular')) return;

    signIn('telegram', { initData, redirect: false }).then((res) => {
      if (res?.ok) {
        router.refresh();
      } else {
        router.push('/tg/vincular');
      }
    });
  }

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onLoad={onLoad}
    />
  );
}
