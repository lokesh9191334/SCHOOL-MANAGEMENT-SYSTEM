const STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const ICONS = {
  gauge: (
    <>
      <path d="M4.5 19a9 9 0 1 1 15 0" />
      <path d="M12 14.5l3.2-3.2" />
      <circle cx="12" cy="14.5" r="0.9" />
    </>
  ),
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  school: (
    <>
      <path d="M4 20V9.5l8-5 8 5V20" />
      <path d="M3 20h18" />
      <path d="M9.5 20v-6h5v6" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18" />
      <path d="M7 15.5h4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4.5V19.5H20" />
      <path d="M8.5 16v-5M12.5 16V8M16.5 16v-3.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.4 2.9 7.5 7 9.5 4.1-2 7-5.1 7-9.5V6z" />
      <path d="M9.2 11.6l2 2 3.6-3.8" />
    </>
  ),
  headset: (
    <>
      <path d="M4.5 13.5a7.5 7.5 0 0 1 15 0" />
      <rect x="3" y="13.5" width="4.2" height="6" rx="1.8" />
      <rect x="16.8" y="13.5" width="4.2" height="6" rx="1.8" />
      <path d="M19.5 19.5a3.5 3.5 0 0 1-3.5 2.5h-3" />
    </>
  ),
  rupee: (
    <>
      <path d="M8 4.5h8.5M8 8.3h8.5" />
      <path d="M9.8 4.5c3.9 0 5.7 1.3 5.7 3.8s-1.8 3.8-5.7 3.8" />
      <path d="M11 12.1l6 7.4" />
    </>
  ),
  sparkle: (
    <path d="M12 3.5c.7 3.7 2.3 5.3 6 6-3.7.7-5.3 2.3-6 6-.7-3.7-2.3-5.3-6-6 3.7-.7 5.3-2.3 6-6z" />
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.4 7.7l1.9 1.1M17.7 15.2l1.9 1.1M4.4 16.3l1.9-1.1M17.7 8.8l1.9-1.1" />
    </>
  ),
  graduation: (
    <>
      <path d="M3 9.3 12 5l9 4.3-9 4.3z" />
      <path d="M7 11.6V16c0 1.3 2.2 2.6 5 2.6s5-1.3 5-2.6v-4.4" />
      <path d="M21 9.3v5.2" />
    </>
  ),
  teacher: (
    <>
      <rect x="3" y="4" width="18" height="12.5" rx="2" />
      <path d="M7.5 12.5 10 9.5l2.4 2.4 3-3.4" />
      <path d="M12 16.5V20" />
      <path d="M8.5 20h7" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 6A2.5 2.5 0 0 1 7 3.5h12.5V18H7a2.5 2.5 0 0 0-2.5 2.5z" />
      <path d="M4.5 20.5A2.5 2.5 0 0 1 7 18h12.5" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M12 6.2C10.4 4.7 8.2 4 5 4v13.6c3.2 0 5.4.7 7 2.2 1.6-1.5 3.8-2.2 7-2.2V4c-3.2 0-5.4.7-7 2.2z" />
      <path d="M12 6.2v13.6" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="3.5" width="16" height="14" rx="2.5" />
      <path d="M4 10h16M8 17.5v2M16 17.5v2M7.2 13.7h1.6M15.2 13.7h1.6" />
    </>
  ),
  clipboardCheck: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <rect x="9" y="2.8" width="6" height="3.4" rx="1.2" />
      <path d="M9.2 13.2l2 2 3.6-3.9" />
    </>
  ),
  megaphone: (
    <>
      <path d="M19 4.5v15L4.5 13.5v-3z" />
      <path d="M8.5 15.2l.9 4.3a1.5 1.5 0 0 0 1.5 1.2h.3" />
    </>
  ),
  folder: (
    <path d="M3.5 7A2 2 0 0 1 5.5 5h4.2l2 2.4h6.8A2 2 0 0 1 20.5 9.4V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8.4" r="3.3" />
      <path d="M5.3 19.5c.8-3.1 3.5-4.9 6.7-4.9s5.9 1.8 6.7 4.9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  list: (
    <>
      <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12" />
      <path d="M4.2 6.5h.01M4.2 12h.01M4.2 17.5h.01" />
    </>
  ),
  phone: (
    <path d="M5.4 4h3.3l1.4 4-1.9 1.5a12.5 12.5 0 0 0 5.3 5.3l1.5-1.9 4 1.4v3.3a1.9 1.9 0 0 1-2.1 1.9A16.4 16.4 0 0 1 3.5 6.1 1.9 1.9 0 0 1 5.4 4z" />
  ),
  upload: (
    <>
      <path d="M12 15V4.5M8 8.2 12 4.5l4 3.7" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  idcard: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <circle cx="8.8" cy="10.6" r="1.9" />
      <path d="M6.2 15.6c.5-1.4 1.4-2.1 2.6-2.1s2.1.7 2.6 2.1" />
      <path d="M14 10h4.2M14 13.4h3.2" />
    </>
  ),
  star: (
    <path d="M12 3.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.2l-4.8 2.5.9-5.4L4.2 9.5l5.4-.8z" />
  ),
  checkSquare: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.2" />
      <path d="M8.6 12.2l2.3 2.3 4.6-4.8" />
    </>
  ),
  check: <path d="M5 12.6l4.4 4.4L19 7.6" />,
  swap: (
    <>
      <path d="M7 5.5 3.5 9 7 12.5M3.5 9h13" />
      <path d="M17 11.5 20.5 15 17 18.5M20.5 15h-13" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  fileText: (
    <>
      <path d="M6.6 3.5H14L18.4 8v12a.9.9 0 0 1-.9.9H6.6a.9.9 0 0 1-.9-.9V4.4a.9.9 0 0 1 .9-.9z" />
      <path d="M14 3.5V8h4.4" />
      <path d="M9 13h6M9 16.4h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.6V12l2.9 1.9" />
    </>
  ),
  bolt: <path d="M13 3.5 5.6 13.4H11l-1 7.1 7.4-9.9H12z" />,
  percent: (
    <>
      <path d="M17.6 6.4 6.4 17.6" />
      <circle cx="8" cy="8" r="2.1" />
      <circle cx="16" cy="16" r="2.1" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12c.6 0 1 .4 1 1V21l-2.6-1.6L14 21l-2-1.5L10 21l-2.4-1.6L5 21V4.5c0-.6.4-1 1-1z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  rows: <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" />,
  pin: (
    <>
      <path d="M12 20.5c3.5-3.8 5.5-6.9 5.5-9.5a5.5 5.5 0 1 0-11 0c0 2.6 2 5.7 5.5 9.5z" />
      <circle cx="12" cy="10.7" r="1.9" />
    </>
  ),
  map: (
    <>
      <path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13l-5.5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  route: (
    <>
      <circle cx="6.5" cy="18" r="2" />
      <circle cx="17.5" cy="6" r="2" />
      <path d="M8.5 18h5a4 4 0 0 0 4-4V8" />
    </>
  ),
  table: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
      <path d="M3.5 10h17M9.8 10v9" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  bell: (
    <>
      <path d="M6.2 16.2v-5.4a5.8 5.8 0 0 1 11.6 0v5.4l1.4 2.3H4.8z" />
      <path d="M10 21a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
      <path d="M10 12h10" />
      <path d="M17 8.5 20.5 12 17 15.5" />
    </>
  ),
  pencil: (
    <>
      <path d="M4.5 19.5l1-3.8L16 5.2a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.3 18.5z" />
      <path d="M14.5 6.7l2.8 2.8" />
    </>
  ),
  message: (
    <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H9l-4.5 3.5z" />
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="4.8" />
      <path d="M9.3 13.3 7.7 20.8l4.3-2.3 4.3 2.3-1.6-7.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10.5h17" />
    </>
  ),
  diamond: <path d="M12 4l6.8 8-6.8 8-6.8-8z" />,
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.5 17.5 17.5 6.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4.5 12.5 7 5h10l2.5 7.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18z" />
      <path d="M4.5 12.5H9l1 2h4l1-2h4.5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5 20.5 8 12 12.5 3.5 8z" />
      <path d="M4.8 11.8 12 15.6l7.2-3.8" />
      <path d="M4.8 15.6 12 19.4l7.2-3.8" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2 20.8 19.5H3.2z" />
      <path d="M12 9.5v4.2" />
      <path d="M12 16.9h.01" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.3-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8c0 4.9-7 9.2-7 9.2z" />
  ),
  faceScan: (
    <>
      <path d="M4 8V6.4A2.4 2.4 0 0 1 6.4 4H8M16 4h1.6A2.4 2.4 0 0 1 20 6.4V8M20 16v1.6a2.4 2.4 0 0 1-2.4 2.4H16M8 20H6.4A2.4 2.4 0 0 1 4 17.6V16" />
      <circle cx="12" cy="10.6" r="2.6" />
      <path d="M7.6 17.8c.8-2.1 2.5-3.2 4.4-3.2s3.6 1.1 4.4 3.2" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.2c0-1 .8-1.9 1.9-1.9h1.7l1.2-1.8c.3-.4.8-.7 1.3-.7h3.8c.5 0 1 .3 1.3.7l1.2 1.8h1.7c1 0 1.9.8 1.9 1.9v8.4c0 1-.8 1.9-1.9 1.9H5.9c-1 0-1.9-.8-1.9-1.9z" />
      <circle cx="12" cy="12.3" r="3.3" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 9.5A8 8 0 0 0 5.6 7.2L4 9" />
      <path d="M4 4.5V9h4.5" />
      <path d="M4.5 14.5A8 8 0 0 0 18.4 16.8L20 15" />
      <path d="M20 19.5V15h-4.5" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.7" />
      <path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="3.2" />,
}

export default function NavGlyph({ name, size = 18 }) {
  const paths = ICONS[name] || ICONS.circle
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false" {...STROKE_PROPS}>
      {paths}
    </svg>
  )
}
