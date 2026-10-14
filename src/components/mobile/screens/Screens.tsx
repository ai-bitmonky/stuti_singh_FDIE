'use client';
/** Screen chrome: tab screens (collapsing nav title) and pushed screens (back button + edge-swipe). */
import { forwardRef, useRef, type ReactNode, type RefObject } from 'react';
import { useCollapse } from '../hooks/useCollapse';
import { useEdgeSwipe } from '../hooks/useEdgeSwipe';
import { Icon } from '../icons';

interface TabProps {
  title: string;
  active: boolean;
  scrollClass?: string;
  /** Rendered inside the section but outside the scroller (e.g. the sim summary). */
  overlay?: ReactNode;
  /** Rendered before the scroller (e.g. the pull-to-refresh spinner). */
  before?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement>;
  contentRef?: RefObject<HTMLDivElement>;
  children: ReactNode;
}

export function TabScreen({ title, active, scrollClass, overlay, before, scrollRef, contentRef, children }: TabProps) {
  const ownScroll = useRef<HTMLDivElement>(null);
  const sc = scrollRef ?? ownScroll;
  const nav = useRef<HTMLElement>(null);
  useCollapse(sc, nav);
  return (
    <section className={'tab-screen' + (active ? ' active' : '')} aria-hidden={!active}>
      <header className="navbar" ref={nav}><div className="nav-title">{title}</div></header>
      {before}
      <div className={'scroller' + (scrollClass ? ' ' + scrollClass : '')} ref={sc}>
        <div className="content" ref={contentRef}>{children}</div>
      </div>
      {overlay}
    </section>
  );
}

interface PushProps {
  title: string;
  back: string;
  cls: string;
  isTop: boolean;
  getBelow: () => HTMLElement | null;
  onPop: () => void;
  children: ReactNode;
}

export const PushScreen = forwardRef<HTMLElement, PushProps>(function PushScreen(
  { title, back, cls, isTop, getBelow, onPop, children }, fwd,
) {
  const self = useRef<HTMLElement | null>(null);
  const sc = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  useCollapse(sc, nav);
  useEdgeSwipe(self, { isTop, getBelow, onPop });
  return (
    <section
      className={cls}
      ref={(el) => {
        self.current = el;
        if (typeof fwd === 'function') fwd(el);
        else if (fwd) fwd.current = el;
      }}
    >
      <header className="navbar" ref={nav}>
        <button type="button" className="nav-btn left pressable" aria-label="Back" onClick={onPop}>
          <Icon name="chevL" size={26} sw={2.2} />
          <span className="bk">{back}</span>
        </button>
        <div className="nav-title">{title}</div>
      </header>
      <div className="scroller" ref={sc}>
        <div className="content">{children}</div>
      </div>
      <div className="dim" />
    </section>
  );
});
