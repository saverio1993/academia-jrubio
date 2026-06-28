'use client';

import { useEffect } from 'react';

export function PingTracker() {
  useEffect(() => {
    const ping = () => fetch('/api/ping', { method: 'POST' }).catch(() => {});
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
