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
