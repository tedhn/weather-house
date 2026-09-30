// Glyphs both device overlays draw. macOS-only chrome (the Apple mark, the
// desktop icons, Terminal) stays in MacScreen.tsx -- these are the ones an iOS
// home screen and a macOS desktop both need, so they live in neither device's
// own file.

export function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" width="15" height="12" aria-hidden="true">
      <circle cx="8" cy="10.2" r="1.15" fill="currentColor" />
      <path d="M4.6 7.4a5 5 0 0 1 6.8 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 4.8a8.6 8.6 0 0 1 12 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function BatteryIcon() {
  return (
    <svg viewBox="0 0 26 13" width="23" height="12" aria-hidden="true">
      <rect x="1" y="1" width="21" height="11" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
      <rect x="3" y="3" width="15" height="7" rx="1.3" fill="currentColor" />
      <rect x="23.4" y="4.2" width="1.8" height="4.6" rx="0.8" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

export function FinderGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="29" height="29" aria-hidden="true">
      <path d="M16 3a13 13 0 1 0 0 26z" fill="#3a8ef0" />
      <path d="M16 3a13 13 0 1 1 0 26z" fill="#f3f5f7" />
      <circle cx="11.6" cy="15" r="1.6" fill="#1c2b3a" />
      <circle cx="20.4" cy="15" r="1.6" fill="#1c2b3a" />
    </svg>
  )
}

export function SafariGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="29" height="29" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#eef2f5" stroke="#c7ccd1" strokeWidth="1" />
      <path d="M21 11 14 14 11 21 18 18z" fill="#ff5a4e" />
      <path d="M21 11 18 18 14 14z" fill="#d6dde3" />
    </svg>
  )
}

export function MailGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <rect x="3" y="7" width="26" height="18" rx="3" fill="#eef2f5" />
      <path d="M4 8 16 17 28 8" fill="none" stroke="#3a8ef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MessagesGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <path
        d="M4 6h24a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H12l-6 5v-5H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        fill="#42d54c"
      />
      <circle cx="10" cy="15" r="1.6" fill="#fff" />
      <circle cx="16" cy="15" r="1.6" fill="#fff" />
      <circle cx="22" cy="15" r="1.6" fill="#fff" />
    </svg>
  )
}

const PETALS = [
  { rotate: 0, fill: '#ff5f5f' },
  { rotate: 60, fill: '#ffb648' },
  { rotate: 120, fill: '#ffe049' },
  { rotate: 180, fill: '#38c76a' },
  { rotate: 240, fill: '#3a8ef0' },
  { rotate: 300, fill: '#b463e6' },
]

export function PhotosGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      {PETALS.map((petal) => (
        <ellipse
          key={petal.rotate}
          cx="16"
          cy="9"
          rx="4.4"
          ry="7.4"
          fill={petal.fill}
          transform={`rotate(${petal.rotate} 16 16)`}
        />
      ))}
    </svg>
  )
}

export function NotesGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <path d="M6 4h20v24H6z" fill="#f4e7b8" />
      <path d="M6 12h20M6 17h20M6 22h14" stroke="#c7b16a" strokeWidth="1.4" />
    </svg>
  )
}

export function MusicGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <circle cx="10" cy="24" r="3.4" fill="#fff" />
      <circle cx="22" cy="21" r="3.4" fill="#fff" />
      <path d="M13 24V9l12-2v12" stroke="#fff" strokeWidth="1.8" fill="none" />
    </svg>
  )
}

const TEETH = Array.from({ length: 8 }, (_, index) => index * 45)

export function SettingsGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      {TEETH.map((deg) => (
        <rect key={deg} x="14.5" y="1" width="3" height="7" rx="1.2" fill="#9099a6" transform={`rotate(${deg} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="9" fill="#c3c9d1" />
      <circle cx="16" cy="16" r="4" fill="#7d8592" />
    </svg>
  )
}
