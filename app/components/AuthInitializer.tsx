'use client'

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize().then(() => {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;

      try {
        const raw = localStorage.getItem('checkout:loginReturn');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const FIVE_MINUTES = 5 * 60 * 1000;
        const isRecent = Date.now() - (parsed.savedAt || 0) < FIVE_MINUTES;
        if (isRecent && window.location.pathname !== '/checkout') {
          window.location.replace('/checkout');
        }
      } catch { /* ignore */ }
    });
  }, [initialize]);

  return null;
}
