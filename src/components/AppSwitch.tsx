'use client';
/**
 * Picks the desktop or mobile app. Client-only (both apps are loaded with
 * `ssr:false`), so there is never a hydration mismatch — the server renders the splash.
 *
 * Mode resolution: `?view=desktop|mobile` in the URL (persisted to
 * sessionStorage) > sessionStorage override > viewport width (≥1024 desktop).
 * Both apps receive `onSwitch(mode)` to render a "Switch to …" control;
 * calling it pins that mode for the session.
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useViewport } from '@/hooks/useViewport';

export type AppMode = 'desktop' | 'mobile';
/** Props every top-level app receives. */
export interface AppProps {
  /** Switch to the other layout (persists for this browser session). */
  onSwitch: (v: AppMode) => void;
}

const OVERRIDE_KEY = 'fdie.view';

export function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-inner">
        <div className="splash-mark" aria-hidden="true">F</div>
        <div className="splash-spin" aria-hidden="true" />
        <span className="splash-label">Loading FDIE</span>
      </div>
    </div>
  );
}

const DesktopApp = dynamic(() => import('./desktop/DesktopApp'), { ssr: false, loading: () => <Splash /> });
const MobileApp = dynamic(() => import('./mobile/MobileApp'), { ssr: false, loading: () => <Splash /> });

const isMode = (x: unknown): x is AppMode => x === 'desktop' || x === 'mobile';

function readOverride(): AppMode | null {
  try {
    const q = new URLSearchParams(window.location.search).get('view');
    if (isMode(q)) {
      sessionStorage.setItem(OVERRIDE_KEY, q);
      return q;
    }
    const s = sessionStorage.getItem(OVERRIDE_KEY);
    return isMode(s) ? s : null;
  } catch {
    return null;
  }
}

export default function AppSwitch() {
  const { isMobile } = useViewport();
  const [mounted, setMounted] = useState(false);
  const [override, setOverride] = useState<AppMode | null>(null);

  useEffect(() => {
    setOverride(readOverride());
    setMounted(true);
  }, []);

  const onSwitch = useCallback((v: AppMode) => {
    try {
      sessionStorage.setItem(OVERRIDE_KEY, v);
      const url = new URL(window.location.href);
      url.searchParams.set('view', v);
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* ignore */
    }
    setOverride(v);
  }, []);

  if (!mounted) return <Splash />;
  const mode: AppMode = override ?? (isMobile ? 'mobile' : 'desktop');
  return mode === 'desktop' ? <DesktopApp onSwitch={onSwitch} /> : <MobileApp onSwitch={onSwitch} />;
}
