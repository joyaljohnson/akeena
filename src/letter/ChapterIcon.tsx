import type { ReactElement } from 'react';
import type { ChapterTheme } from '../lib/letterTypes';
import styles from './ChapterIcon.module.css';

export const CHAPTER_ICONS = ['home', 'ring', 'sunset', 'bible'] as const;
export type ChapterIconName = (typeof CHAPTER_ICONS)[number];

/** Default icon per theme, used when a chapter doesn't pick one itself. */
export const DEFAULT_ICON_FOR_THEME: Record<ChapterTheme, ChapterIconName> = {
  pearl: 'home',
  jewel: 'ring',
  gold: 'sunset',
  'pastel-metallic': 'bible',
};

const GOLD = '#4f8f7a';
const GLOW = '#cfe8dd';

type Pair = { closed: ReactElement; open: ReactElement };

const ICONS: Record<ChapterIconName, Pair> = {
  // Sweet home: door shut, then door open with the light spilling out.
  home: {
    closed: (
      <>
        <path d="M7 24 24 9l17 15" />
        <path d="M12 21v19h24V21" />
        <rect x="20" y="28" width="8" height="12" rx="1" fill={GLOW} />
        <circle cx="26" cy="34.5" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
    open: (
      <>
        <path d="M7 24 24 9l17 15" />
        <path d="M12 21v19h24V21" />
        <rect x="20" y="28" width="8" height="12" fill={GLOW} stroke="none" />
        <path d="M20 28 13.5 30.5v11L20 40Z" fill={GLOW} />
        <path
          d="M24 17.5c-1.6-2-4.6-.4-3 1.8l3 2.7 3-2.7c1.6-2.2-1.4-3.8-3-1.8Z"
          fill={GOLD}
          stroke="none"
        />
      </>
    ),
  },
  // Betrothal: ring box closed, then open with the ring.
  ring: {
    closed: (
      <>
        <rect x="9" y="20" width="30" height="8" rx="3" />
        <rect x="9" y="28" width="30" height="13" rx="3" />
        <rect x="21.5" y="25" width="5" height="6" rx="1.2" fill={GLOW} />
      </>
    ),
    open: (
      <>
        <path d="M11 28 14 10h20l3 18" />
        <circle cx="24" cy="23" r="6" />
        <path d="m20.5 14 3.5-4.5L27.5 14 24 18Z" fill={GLOW} />
        <rect x="9" y="28" width="30" height="13" rx="3" fill="var(--paper)" />
      </>
    ),
  },
  // English ceremony & evening: sun low on the horizon, then shining.
  sunset: {
    closed: (
      <>
        <path d="M13 32a11 11 0 0 1 22 0" fill={GLOW} />
        <path d="M6 32h36" />
        <path d="M13 37.5h22M18 42h12" opacity="0.7" />
      </>
    ),
    open: (
      <>
        <circle cx="24" cy="24" r="8" fill={GLOW} />
        <path d="M24 6.5v5M24 36.5v5M6.5 24h5M36.5 24h5M11.6 11.6l3.5 3.5M32.9 32.9l3.5 3.5M11.6 36.4l3.5-3.5M32.9 15.1l3.5-3.5" />
      </>
    ),
  },
  // Church wedding: closed Bible, then open Bible with the cross above.
  bible: {
    closed: (
      <>
        <rect x="12" y="6" width="24" height="36" rx="2.5" fill="var(--paper)" />
        <path d="M17 6v36" />
        <path d="M26.5 14v14M21 19.5h11" stroke={GOLD} strokeWidth="2" />
      </>
    ),
    open: (
      <>
        <path
          d="M6 24c8-2 14 0 18 4 4-4 10-6 18-4v16c-8-2-14 0-18 4-4-4-10-6-18-4Z"
          fill="var(--paper)"
        />
        <path d="M24 28v16" />
        <path d="M24 4v14M18.5 9.5h11" stroke={GOLD} strokeWidth="2" />
      </>
    ),
  },
};

type ChapterIconProps = { name: ChapterIconName; open: boolean; className?: string };

/** Decorative icon with a closed and an open variant that crossfade. */
export function ChapterIcon({ name, open, className }: ChapterIconProps) {
  const pair = ICONS[name];
  const common = {
    viewBox: '0 0 48 48',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };
  return (
    <span className={`${styles.wrap} ${className ?? ''}`} data-open={open}>
      <svg {...common} className={`${styles.glyph} ${styles.closed}`}>
        {pair.closed}
      </svg>
      <svg {...common} className={`${styles.glyph} ${styles.open}`}>
        {pair.open}
      </svg>
    </span>
  );
}
