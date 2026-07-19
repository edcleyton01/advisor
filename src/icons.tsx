// ============================================================
//  Ícones do sistema — SVG de traço fino, monocromáticos.
//  Substituem emojis (que renderizam coloridos e diferentes em
//  cada aparelho) mantendo a estética keynote. Herdam a cor do
//  texto via currentColor.
// ============================================================

const PATHS: Record<string, React.ReactNode> = {
  calendar: <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.5h17M8.5 3v4M15.5 3v4" />
  </>,
  chat: <path d="M4.5 6.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H10l-5.5 4.5v-4.5a3 3 0 0 1-3-3z" transform="translate(2 0) scale(0.92)" />,
  clip: <path d="M20.5 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 17.5a2 2 0 0 1-3-3L15 7" />,
  key: <>
    <circle cx="7.5" cy="15.5" r="3.8" />
    <path d="M10.5 12.5L20 3M16 4.5l3 3M13 7.5l2.5 2.5" />
  </>,
  lock: <>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>,
  clock: <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 2" />
  </>,
  zap: <path d="M13 2.5L4.5 13.5H11l-1.5 8L18.5 10H12z" strokeLinejoin="round" />,
  refresh: <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1M20.5 3.5v5h-5" />,
  upload: <path d="M12 16V4.5M12 4.5L7 9.5M12 4.5l5 5M4.5 20h15" />,
  file: <>
    <path d="M6 3h8l5 5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 21V4.5A1.5 1.5 0 0 1 6.5 3z" transform="translate(0.5 -0.5)" />
    <path d="M14 3v5h5" transform="translate(0.5 -0.5)" />
  </>,
  download: <path d="M12 4v11M12 15l-4.5-4.5M12 15l4.5-4.5M4.5 20h15" />,
  spark: <path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z" strokeLinejoin="round" />,
  // — navegação —
  grid: <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </>,
  bell: <>
    <path d="M6 16.5h12l-1.5-2.6V9.5a4.5 4.5 0 0 0-9 0v4.4z" strokeLinejoin="round" />
    <path d="M10 19.5a2 2 0 0 0 4 0" />
  </>,
  trend: <path d="M4 17l5-5 3.5 3.5L20 8M15 8h5v5" strokeLinejoin="round" />,
  users: <>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c0-3.1 2.5-5.2 5.5-5.2s5.5 2.1 5.5 5.2" />
    <path d="M15.5 5.9a3 3 0 0 1 0 5.4M16.6 14.6c2.3.5 3.9 2.3 3.9 4.9" />
  </>,
  bars: <path d="M5.5 20v-7M12 20V6M18.5 20v-10" />,
  megaphone: <>
    <path d="M18.5 5v14L7.5 14.5h-3v-5h3z" strokeLinejoin="round" />
    <path d="M8.5 15v4.5" />
  </>,
  funnel: <path d="M4 4.5h16L14 12v6.8l-4-2.1V12z" strokeLinejoin="round" />,
  book: <>
    <path d="M5 19.5V5a2.5 2.5 0 0 1 2.5-2.5H19V17H7.5A2.5 2.5 0 0 0 5 19.5z" strokeLinejoin="round" />
    <path d="M5 19.5A2.5 2.5 0 0 0 7.5 22H19v-5" />
  </>,
  gift: <>
    <rect x="3.5" y="7.5" width="17" height="4.2" rx="1.4" /><path d="M5.5 11.7V19a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-7.3M12 7.5V21" />
    <path d="M12 7.5c-1.4-3.2-6-3.2-5.6-.4M12 7.5c1.4-3.2 6-3.2 5.6-.4" />
  </>,
  shield: <path d="M12 3l7 2.8v5.4c0 4.4-2.9 7.7-7 9.6-4.1-1.9-7-5.2-7-9.6V5.8z" strokeLinejoin="round" />,
  gear: <>
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9" />
  </>,
  tasks: <>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <path d="M8.5 12.3l2.4 2.4 4.8-5" strokeLinejoin="round" />
  </>,
  compass: <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M15 9l-2 5.4L9 16l2-5.4z" strokeLinejoin="round" />
  </>,
  pulse: <path d="M3.5 12.5h3.6l2.3-5.5 4.2 10.5 2.3-5h4.6" strokeLinejoin="round" />,
}

export function Ic({ n, size = 14, style }: { n: keyof typeof PATHS & string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" aria-hidden
      style={{ display: 'inline-block', verticalAlign: '-0.14em', flexShrink: 0, ...style }}>
      {PATHS[n]}
    </svg>
  )
}
