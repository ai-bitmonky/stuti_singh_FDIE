'use client';
import type { Tab } from './ctx';
import { Icon, type IconName } from './icons';

const TABS: { tab: Tab; label: string; icon: IconName }[] = [
  { tab: 'home', label: 'Home', icon: 'home' },
  { tab: 'analytics', label: 'Analytics', icon: 'pie' },
  { tab: 'simulate', label: 'Simulate', icon: 'sliders' },
  { tab: 'insights', label: 'Insights', icon: 'bulb' },
];

/** Blurred iOS tab bar with the centre "+" FAB (rotates to × while the Add sheet is open). */
export default function TabBar({ tab, onTab, onAdd }: { tab: Tab; onTab: (t: Tab) => void; onAdd: () => void }) {
  const btn = (t: (typeof TABS)[number]) => (
    <button
      key={t.tab}
      type="button"
      className={'tab' + (tab === t.tab ? ' active' : '')}
      aria-current={tab === t.tab ? 'page' : undefined}
      onClick={() => onTab(t.tab)}
    >
      <Icon name={t.icon} size={26} sw={tab === t.tab ? 2 : 1.75} />
      {t.label}
    </button>
  );
  return (
    <nav className="tabbar" aria-label="Tabs">
      {btn(TABS[0])}
      {btn(TABS[1])}
      <div className="fab-slot">
        <button type="button" className="fab pressable" aria-label="Add expense" onClick={onAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {btn(TABS[2])}
      {btn(TABS[3])}
    </nav>
  );
}
