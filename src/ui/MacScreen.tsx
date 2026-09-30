import { useEffect, useState, type ReactNode } from 'react'
import { localClock, localDate } from '../lib/clock'
import { DESK_DOCUMENTS, type DeskDocument } from '../lib/documents'
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

export type MacScreenProps = DeviceScreenSharedProps

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7 12.4c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.6-.9.9-1.7 1.1-1.9-2.4-1-2.8-3.3-2.4-4.2zM14.3 4.6c.6-.7 1-1.7.9-2.6-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.5.9.1 1.9-.5 2.5-1.2z"
      />
    </svg>
  )
}

function ControlCentreIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <rect x="1" y="2" width="14" height="4.4" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="11" cy="4.2" r="1.35" fill="currentColor" />
      <rect x="1" y="9.6" width="14" height="4.4" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="5" cy="11.8" r="1.35" fill="currentColor" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <line x1="10.1" y1="10.1" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// Mac-only, same reasoning as TerminalGlyph below: nothing on the iOS side
// opens a PDF either, so this stays out of glyphs.tsx.
function PdfGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <path d="M8 2h12l6 6v22H8z" fill="#f6f7f9" stroke="#c7ccd1" strokeWidth="1" />
      <path d="M20 2v6h6z" fill="#d7dbe0" />
      <rect x="6" y="20" width="18" height="6.5" rx="1.1" fill="#e0362b" />
    </svg>
  )
}

function DesktopIcon({ label, onOpen, children }: { label: string; onOpen: () => void; children: ReactNode }) {
  return (
    <button type="button" className="mac-icon" onClick={onOpen}>
      <div className="mac-icon-glyph">{children}</div>
      <span className="mac-icon-label">{label}</span>
    </button>
  )
}

// Mac-only: no phone in this diorama runs a terminal, so this stays out of
// glyphs.tsx rather than sitting there unused by the one overlay that could
// use it.
function TerminalGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true">
      <rect x="3" y="5" width="26" height="22" rx="3" fill="#1c1e24" />
      <path d="M8 12 14 17 8 22" fill="none" stroke="#63e06a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="17" y1="22" x2="24" y2="22" stroke="#63e06a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function TrashGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="25" height="25" aria-hidden="true">
      <path d="M9 11h14l-1.4 15.5a2 2 0 0 1-2 1.8H12.4a2 2 0 0 1-2-1.8z" fill="#d7dbe0" stroke="#8b93a0" strokeWidth="1" />
      <path d="M12 8h8l1.2 3H10.8z" fill="#c7ccd1" />
      <line x1="13" y1="14" x2="13.5" y2="24" stroke="#8b93a0" strokeWidth="1.2" />
      <line x1="16" y1="14" x2="16" y2="24" stroke="#8b93a0" strokeWidth="1.2" />
      <line x1="19" y1="14" x2="18.5" y2="24" stroke="#8b93a0" strokeWidth="1.2" />
    </svg>
  )
}

function PdfWindow({ doc, onClose }: { doc: DeskDocument; onClose: () => void }) {
  return (
    <div className="mac-window" role="dialog" aria-label={doc.name}>
      <div className="mac-window-bar">
        <div className="mac-window-dots">
          <button type="button" className="mac-window-dot mac-window-dot-close" aria-label="Close" onClick={onClose} />
          <span className="mac-window-dot mac-window-dot-min" />
          <span className="mac-window-dot mac-window-dot-max" />
        </div>
        <span className="mac-window-title">{doc.name}</span>
      </div>
      <div className="mac-window-body">
        <iframe src={`${doc.url}#toolbar=0&navpanes=0&view=FitH`} title={doc.name} />
      </div>
    </div>
  )
}

interface DockApp {
  id: string
  title: string
  gradient: string
  running?: boolean
  Icon: () => ReactNode
}

const DOCK_APPS: DockApp[] = [
  { id: 'finder', title: 'Finder', gradient: 'linear-gradient(160deg, #eef2f5, #ccd3d9)', running: true, Icon: FinderGlyph },
  { id: 'safari', title: 'Safari', gradient: 'linear-gradient(160deg, #eaf3ff, #cfe3ff)', Icon: SafariGlyph },
  { id: 'mail', title: 'Mail', gradient: 'linear-gradient(160deg, #6fb2ff, #2f6fe0)', running: true, Icon: MailGlyph },
  { id: 'messages', title: 'Messages', gradient: 'linear-gradient(160deg, #6be572, #2fae3c)', running: true, Icon: MessagesGlyph },
  { id: 'photos', title: 'Photos', gradient: 'linear-gradient(160deg, #fdfdfd, #e3e5e8)', Icon: PhotosGlyph },
  { id: 'notes', title: 'Notes', gradient: 'linear-gradient(160deg, #ffe9a8, #f0c94a)', Icon: NotesGlyph },
  { id: 'terminal', title: 'Terminal', gradient: 'linear-gradient(160deg, #3a3d46, #17181c)', Icon: TerminalGlyph },
  { id: 'music', title: 'Music', gradient: 'linear-gradient(160deg, #ff7fb0, #d6316f)', Icon: MusicGlyph },
  { id: 'settings', title: 'System Settings', gradient: 'linear-gradient(160deg, #e3e6ea, #9099a6)', Icon: SettingsGlyph },
]

export function MacScreen({ open, live, mood, weather, when, onExit }: MacScreenProps) {
  const [openDoc, setOpenDoc] = useState<DeskDocument | null>(null)

  // Leaving the laptop should not leave a window open behind the camera -- the
  // next visit starts back at the bare desktop. Dropped during render rather
  // than in an effect, the same way App.tsx drops a focus pointed at a device
  // that has gone: there is then no committed frame showing a window over a
  // desktop the camera has already left.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setOpenDoc(null)
  }

  useEffect(() => {
    if (!openDoc) return
    // Capture phase runs before App's own bubble-phase Escape listener gets a
    // turn on the same `window`, so stopping propagation here keeps Escape
    // scoped to closing the document instead of also popping focus off the
    // laptop.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpenDoc(null)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [openDoc])

  return (
    <DeviceScreen kind="mac" open={open} live={live} mood={mood} onExit={onExit}>
      <div className="mac-menubar">
        <div className="mac-menu-left">
          <span className="mac-apple">
            <AppleMark />
          </span>
          <span className="mac-menu-app">Finder</span>
          <span className="mac-menu-item">File</span>
          <span className="mac-menu-item">Edit</span>
          <span className="mac-menu-item">View</span>
          <span className="mac-menu-item">Go</span>
          <span className="mac-menu-item">Window</span>
          <span className="mac-menu-item">Help</span>
        </div>
        <div className="mac-menu-right">
          <ControlCentreIcon />
          <WifiIcon />
          <BatteryIcon />
          <SearchIcon />
          <span className="mac-menu-date">{localDate(weather, when)}</span>
          <span className="mac-menu-time">{localClock(weather, when)}</span>
        </div>
      </div>

      <div className="mac-icons">
        {DESK_DOCUMENTS.map((doc) => (
          <DesktopIcon key={doc.id} label={doc.name} onOpen={() => setOpenDoc(doc)}>
            <PdfGlyph />
          </DesktopIcon>
        ))}
      </div>

      <div className="mac-dock">
        {DOCK_APPS.map(({ id, title, gradient, running, Icon }) => (
          <div key={id} className="mac-dock-tile" style={{ background: gradient }} title={title}>
            <Icon />
            {running && <span className="mac-dock-dot" />}
          </div>
        ))}
        <span className="mac-dock-divider" />
        <div className="mac-dock-tile" style={{ background: 'linear-gradient(160deg, #eef2f5, #c7ccd1)' }} title="Trash">
          <TrashGlyph />
        </div>
      </div>

      {openDoc && <PdfWindow doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </DeviceScreen>
  )
}
