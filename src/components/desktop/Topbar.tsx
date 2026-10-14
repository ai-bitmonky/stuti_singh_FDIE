'use client';
import { forwardRef, useRef } from 'react';
import type { Range } from '@/lib/engine';
import { useDesk } from './ctx';
import { Icon } from './ui/Icon';
import { Seg } from './ui/Seg';
import { AlertsPop } from './Popovers';

const RANGES = [['7', '7D'], ['30', '30D'], ['all', 'All']] as const;

export interface TopbarProps {
  title: string;
  sub: string;
  warn: boolean;
  onSearchInput: (q: string) => void;
}

/** Sticky top bar: title, search (⌘K), range chips, alerts bell, add button. */
export const Topbar = forwardRef<HTMLInputElement, TopbarProps>(function Topbar({ title, sub, warn, onSearchInput }, searchRef) {
  const { range, setRange, search, setSearch, openPop, closePop, popFor, openDrawer } = useDesk();
  const bell = useRef<HTMLButtonElement>(null);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="tb-title">
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        <div className="tb-tools">
          <label className="search" htmlFor="dk-search">
            <span className="sr">Search transactions</span>
            <Icon name="search" />
            <input
              ref={searchRef}
              className="input"
              id="dk-search"
              type="search"
              placeholder="Search transactions"
              autoComplete="off"
              spellCheck={false}
              value={search}
              onChange={(e) => onSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearch('');
                  e.currentTarget.blur();
                }
              }}
            />
            <span className="kbd">⌘K</span>
          </label>
          <Seg<Range> options={RANGES} value={range} onChange={setRange} label="Date range" />
          <button
            ref={bell}
            type="button"
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => {
              if (popFor(bell.current)) return closePop();
              if (bell.current) openPop(bell.current, <AlertsPop />, { width: 320 });
            }}
          >
            <Icon name="bell" size={18} />
            {warn && <span className="dot" />}
          </button>
          <button type="button" className="btn btn-primary" title="Add expense (N)" onClick={() => openDrawer()}>
            <Icon name="plus" size={16} />
            <span className="lbl">Add expense</span>
          </button>
        </div>
      </div>
    </header>
  );
});
