import type { CSSProperties, ReactNode } from 'react'

export type IconName = 'play' | 'pause' | 'reset' | 'settings' | 'help' | 'close' | 'arrow' | 'check' | 'leaf' | 'rain' | 'ocean' | 'brown' | 'quiet' | 'volume' | 'lock' | 'sun'
const paths: Record<IconName, ReactNode> = {
  play: <path d="m9 5 10 7-10 7Z" fill="currentColor" stroke="none" />,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
  reset: <><path d="M4 10a8 8 0 1 1 1.5 7M4 4v6h6" /></>,
  settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="var(--icon-surface, var(--color-bg))" /><circle cx="16" cy="17" r="3" fill="var(--icon-surface, var(--color-bg))" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.2-1.5 2M12 16h.01" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
  leaf: <><path d="M19 4C7 2 2 9 6 15c6 7 14-1 13-11ZM5 20 16 8" /></>,
  rain: <><path d="M5 14a4 4 0 1 1 1-7 5 5 0 0 1 9-1 4 4 0 1 1 3 8M8 17l-1 3m6-3-1 3m6-3-1 3" /></>,
  ocean: <path d="M2 7c3-4 5 4 9 0s5 4 11 0M2 12c3-4 5 4 9 0s5 4 11 0M2 17c3-4 5 4 9 0s5 4 11 0" />,
  brown: <path d="M4 10v4m4-7v10m4-14v18m4-14v10m4-7v4" />,
  quiet: <><path d="m11 5-5 4H3v6h3l5 4ZM16 9l5 6m0-6-5 6" /></>,
  volume: <><path d="m10 5-5 4H2v6h3l5 4ZM14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
}
export default function Icon({ name, className = '', style }: { name: IconName; className?: string; style?: CSSProperties }) {
  return <svg className={`icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>
}
