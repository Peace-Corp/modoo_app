'use client'

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCanvasStore } from '@/store/useCanvasStore';

/**
 * NavigationListener component
 *
 * Listens to route changes and clears canvas state when navigating away from the editor page.
 * This prevents canvas state from persisting across different pages and products.
 */
export default function NavigationListener() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const resetCanvasState = useCanvasStore((state) => state.resetCanvasState);

  useEffect(() => {
    // Skip on initial mount
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    // Check if we're navigating away from the editor page
    const wasOnEditor = previousPathname.current === '/editor' || previousPathname.current?.startsWith('/editor/');
    const isOnEditor = pathname === '/editor' || pathname.startsWith('/editor/');

    // Reset canvas state when:
    // 1. Navigating away from editor to any other page
    // 2. Navigating between different product editor pages
    if (wasOnEditor && (!isOnEditor || pathname !== previousPathname.current)) {
      console.log('[NavigationListener] Clearing canvas state on navigation');
      resetCanvasState();
    }

    previousPathname.current = pathname;
  }, [pathname, resetCanvasState]);

  return null;
}
