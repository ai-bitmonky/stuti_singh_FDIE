'use client';
/**
 * Stage + iPhone frame. ≥600px wide: a 393×852 device inside a bezel with a
 * dynamic island, scaled to fit the window. Below 600px or on touch-first devices (phones, tablets): full-bleed, with
 * status bar / home indicator areas from the safe-area insets.
 */
import { forwardRef, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { dev } from './device';

interface Props {
  deviceClass: string;
  deviceStyle: CSSProperties;
  children: ReactNode;
}

const PhoneFrame = forwardRef<HTMLDivElement, Props>(function PhoneFrame({ deviceClass, deviceStyle, children }, ref) {
  const [fit, setFit] = useState<{ fit: number; framed: boolean; tall: boolean }>({ fit: 1, framed: true, tall: true });
  const [native, setNative] = useState(false);
  const [full, setFull] = useState(false);
  const probe = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const touch = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches;
      if (w < 600 || touch) {
        dev.fit = 1;
        setFit({ fit: 1, framed: false, tall: h >= 800 });
        setFull(true);
      } else {
        const f = Math.min(1, (h - 64) / 872, (w - 32) / 413);
        dev.fit = f;
        setFit({ fit: f, framed: true, tall: true });
        setFull(false);
      }
      const inset = probe.current ? probe.current.offsetHeight : 0;
      // On a real phone/tablet the OS and browser draw their own status bar — hide the mock one.
      setNative((inset > 0 && w < 600) || touch);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className={'mb' + (full ? ' full' : '') + (native ? ' native-chrome' : '')}>
      <div
        ref={probe}
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, width: 1, height: 'env(safe-area-inset-top, 0px)', visibility: 'hidden', pointerEvents: 'none' }}
      />
      <div className="stage">
        <div
          className="phone-wrap"
          style={fit.framed ? { width: 413 * fit.fit, height: 872 * fit.fit } : undefined}
        >
          <div className="phone" style={{ ['--fit' as string]: fit.fit }}>
            <div ref={ref} className={deviceClass} style={deviceStyle} data-h={fit.tall ? 'tall' : ''}>
              <div className="island" />
              {children}
              <div className="home-ind" />
            </div>
          </div>
        </div>
        <p className="stage-cap">
          <b>FDIE · iOS</b> — resize window below 600px for full-screen
        </p>
      </div>
    </div>
  );
});

export default PhoneFrame;
