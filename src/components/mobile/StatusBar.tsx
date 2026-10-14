'use client';
import { useEffect, useState } from 'react';
import { pad2 } from '@/lib/format';

const clock = () => {
  const d = new Date();
  return `${d.getHours() % 12 || 12}:${pad2(d.getMinutes())}`;
};

/** iOS status bar: live clock left of the island, signal / Wi-Fi / battery right. */
export default function StatusBar() {
  const [t, setT] = useState(clock);
  useEffect(() => {
    const id = setInterval(() => setT(clock()), 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="statusbar" aria-hidden="true">
      <div className="sb-time">{t}</div>
      <div />
      <div className="sb-icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff">
          <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="#fff">
          <path d="M8 2.4c2.2 0 4.2.9 5.7 2.3l1.2-1.2A9.7 9.7 0 0 0 8 .7 9.7 9.7 0 0 0 1.1 3.5l1.2 1.2A8 8 0 0 1 8 2.4z" />
          <path d="M8 5.6c1.3 0 2.5.5 3.4 1.3l1.2-1.2A6.5 6.5 0 0 0 8 3.9a6.5 6.5 0 0 0-4.6 1.8l1.2 1.2c.9-.8 2.1-1.3 3.4-1.3z" />
          <path d="M8 8.7c.5 0 1 .2 1.2.5L8 11.4 6.8 9.2c.3-.3.7-.5 1.2-.5z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x=".5" y=".5" width="23" height="12" rx="3.6" stroke="#fff" strokeOpacity=".4" />
          <rect x="2" y="2" width="17" height="9" rx="2.2" fill="#fff" />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="#fff" fillOpacity=".45" />
        </svg>
      </div>
    </div>
  );
}
