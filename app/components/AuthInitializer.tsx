'use client'

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * AuthInitializer component
 *
 * Initializes authentication state on app load by checking for existing session.
 * Also clears stale checkout/payment sessionStorage on fresh app mount.
 */
export default function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null;
}
