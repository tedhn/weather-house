import type { ReactNode } from 'react'
import { localClock } from '../lib/clock'
import { DeviceScreen, type DeviceScreenSharedProps } from './DeviceScreen'
import {
  BatteryIcon,
  FinderGlyph,
  MailGlyph,
  MessagesGlyph,
  MusicGlyph,
  NotesGlyph,
  PhotosGlyph,
  SafariGlyph,
  SettingsGlyph,
  WifiIcon,
} from './glyphs'
import type { ConditionKind, Weather } from '../types'

export type IosScreenProps = DeviceScreenSharedProps

function CellularIcon() {
  return (
    <div className="ios-cellular" aria-hidden="true">
      {[0.4, 0.6, 0.8, 1].map((height, index) => (
        <span key={index} className="ios-cellular-bar" style={{ height: `${height * 100}%` }} />
      ))}
    </div>
  )
}

// One glyph per ConditionKind, tinted for day or night the same way the sky
// itself is -- warm sun by day, pale moon-ish tones after dark. Falls back to
// a dashed ring when there is no weather yet, which is the one state this
// widget has to survive: the phone can be the very first screen a viewer
// opens, before the fetch resolves.
function ConditionGlyph({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return (
      <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
        <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.8" strokeDasharray="3 4" />
      </svg>
    )
  }

  const sun = weather.isDay ? '#ffcf5c' : '#dfe6f5'
  const cloud = '#e7ebf1'

  const byKind: Record<ConditionKind, ReactNode> = {
    clear: <circle cx="16" cy="16" r="9" fill={sun} />,
    cloudy: (
      <>
        <circle cx="12" cy="12" r="6" fill={sun} />
        <ellipse cx="18" cy="19" rx="10" ry="6.2" fill={cloud} />
      </>
    ),
    overcast: <ellipse cx="16" cy="17" rx="11" ry="7" fill={cloud} />,
    fog: (
      <>
        <line x1="6" y1="11" x2="26" y2="11" stroke={cloud} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="6" y1="17" x2="26" y2="17" stroke={cloud} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        <line x1="6" y1="23" x2="26" y2="23" stroke={cloud} strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
      </>
    ),
    rain: (
      <>
        <ellipse cx="16" cy="12" rx="10" ry="6" fill={cloud} />
        {[11, 16, 21].map((x) => (
          <line key={x} x1={x} y1="21" x2={x - 2} y2="27" stroke="#7fb2ff" strokeWidth="2" strokeLinecap="round" />
        ))}
      </>
    ),
    snow: (
      <>
        <ellipse cx="16" cy="12" rx="10" ry="6" fill={cloud} />
        {[11, 16, 21].map((x) => (
          <circle key={x} cx={x} cy="24" r="1.6" fill="#fff" />
        ))}
      </>
    ),
    storm: (
      <>
        <ellipse cx="16" cy="12" rx="10" ry="6" fill="#8b93a6" />
        <path d="M17 15 11 24 15.5 24 13.5 30 21 20 16.5 20z" fill="#ffd75c" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
      {byKind[weather.kind]}
    </svg>
  )
}

// iOS-only, the way Terminal and Trash are mac-only: a macOS dock has no use
// for them, so they stay out of glyphs.tsx rather than sitting there for one
// caller.
function ClockGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#0d0f14" />
      <line x1="16" y1="16" x2="16" y2="7.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16" y1="16" x2="21.5" y2="19" stroke="#ff9f43" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MapsGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <path d="M2 8 11 5v19l-9 3z" fill="#9fdca8" />
      <path d="M11 5l10 3v19l-10-3z" fill="#e8e2cf" />
      <path d="M21 8l9-3v19l-9 3z" fill="#9fdca8" />
      <path d="M11 5l10 3-4 19-6-3z" fill="#f0c98a" />
    </svg>
  )
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <text x="16" y="12" textAnchor="middle" fontSize="7" fill="#ff453a" fontWeight="600">
        WED
      </text>
      <text x="16" y="28" textAnchor="middle" fontSize="18" fill="#1c1e24" fontWeight="300">
        23
      </text>
    </svg>
  )
}

function CameraGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <rect x="3" y="8" width="26" height="17" rx="4" fill="#4a4e57" />
      <circle cx="16" cy="16.5" r="6" fill="#1c1e24" stroke="#9aa0ab" strokeWidth="1.4" />
      <circle cx="16" cy="16.5" r="2.6" fill="#5b6472" />
      <circle cx="25" cy="12" r="1.3" fill="#ffd75c" />
    </svg>
  )
}

interface IosApp {
  id: string
  title: string
  gradient: string
  Icon: () => ReactNode
}

// Two rows rather than one. A single row under the widget leaves the page
// three-fifths empty above the dock, which reads as a screen that failed to
// load rather than as an uncluttered one.
const GRID_APPS: IosApp[] = [
  { id: 'files', title: 'Files', gradient: 'linear-gradient(160deg, #eef2f5, #ccd3d9)', Icon: FinderGlyph },
  { id: 'mail', title: 'Mail', gradient: 'linear-gradient(160deg, #6fb2ff, #2f6fe0)', Icon: MailGlyph },
  { id: 'photos', title: 'Photos', gradient: 'linear-gradient(160deg, #fdfdfd, #e3e5e8)', Icon: PhotosGlyph },
  { id: 'notes', title: 'Notes', gradient: 'linear-gradient(160deg, #ffe9a8, #f0c94a)', Icon: NotesGlyph },
  { id: 'clock', title: 'Clock', gradient: 'linear-gradient(160deg, #2b2f38, #0d0f14)', Icon: ClockGlyph },
  { id: 'maps', title: 'Maps', gradient: 'linear-gradient(160deg, #f4f1e6, #dcd7c4)', Icon: MapsGlyph },
  { id: 'calendar', title: 'Calendar', gradient: 'linear-gradient(160deg, #ffffff, #e6e8ec)', Icon: CalendarGlyph },
  { id: 'camera', title: 'Camera', gradient: 'linear-gradient(160deg, #9aa0ab, #5b6472)', Icon: CameraGlyph },
]

// The dock spans every home screen page, so an app sitting in it can also sit
// in the grid above -- exactly as real iOS lets it.
const DOCK_APPS: IosApp[] = [
  { id: 'safari', title: 'Safari', gradient: 'linear-gradient(160deg, #eaf3ff, #cfe3ff)', Icon: SafariGlyph },
  { id: 'messages', title: 'Messages', gradient: 'linear-gradient(160deg, #6be572, #2fae3c)', Icon: MessagesGlyph },
  { id: 'music', title: 'Music', gradient: 'linear-gradient(160deg, #ff7fb0, #d6316f)', Icon: MusicGlyph },
  { id: 'settings', title: 'Settings', gradient: 'linear-gradient(160deg, #e3e6ea, #9099a6)', Icon: SettingsGlyph },
]

export function IosScreen({ open, live, mood, weather, when, onExit }: IosScreenProps) {
  return (
    <DeviceScreen kind="ios" open={open} live={live} mood={mood} onExit={onExit}>
      <div className="ios-home">
        <div className="ios-status">
          <span className="ios-status-time">{localClock(weather, when)}</span>
          <div className="ios-status-icons">
            <CellularIcon />
            <WifiIcon />
            <BatteryIcon />
          </div>
        </div>

        <div className="ios-grid">
          {/* The one place this overlay earns its keep: the app's own subject,
              read straight off the same weather prop the HUD renders from. */}
          <div className="ios-widget">
            <div className="ios-widget-glyph">
              <ConditionGlyph weather={weather} />
            </div>
            <div className="ios-widget-copy">
              <p className="ios-widget-temp">{weather ? `${Math.round(weather.temperature)}°` : '--°'}</p>
              <p className="ios-widget-label">{weather ? weather.label : 'No signal'}</p>
            </div>
          </div>

          {GRID_APPS.map(({ id, title, gradient, Icon }) => (
            <div key={id} className="ios-app">
              <div className="ios-app-glyph" style={{ background: gradient }}>
                <Icon />
              </div>
              <span className="ios-app-label">{title}</span>
            </div>
          ))}
        </div>

        <div className="ios-dots" aria-hidden="true">
          <span className="ios-dot is-active" />
          <span className="ios-dot" />
        </div>

        <div className="ios-dock">
          {DOCK_APPS.map(({ id, title, gradient, Icon }) => (
            <div key={id} className="ios-dock-tile" style={{ background: gradient }} title={title}>
              <Icon />
            </div>
          ))}
        </div>

        <div className="ios-home-indicator" />
      </div>
    </DeviceScreen>
  )
}
