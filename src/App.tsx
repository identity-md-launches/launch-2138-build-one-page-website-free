import { useEffect, useReducer, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Icon from './components/Icon'
import QuietRoom from './components/QuietRoom'
import { AmbientAudio } from './lib/audio'
import type { Sound } from './lib/audio'
import { focusReducer, formatTime, MODE_LABELS, restoreState, STORAGE_KEY, timeLeft, todaySessions } from './lib/focus'
import type { Durations, FocusState, Mode } from './lib/focus'

const SOUNDS: { id: Sound; label: string }[] = [
  { id: 'rain', label: 'Rain' }, { id: 'ocean', label: 'Ocean' }, { id: 'brown', label: 'Brown noise' },
]

function Modal({ title, children, onClose, kind }: { title: string; children: ReactNode; onClose: () => void; kind: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef(document.activeElement as HTMLElement | null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => { if (dialog.open) dialog.close(); triggerRef.current?.focus() }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby={`${kind}-title`} onClose={event => { if (!event.currentTarget.open) onClose() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length > 0)
      const first = targets[0], last = targets[targets.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ref.current?.close()
    }}>
    <div className="modal-heading"><h2 id={`${kind}-title`}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={() => ref.current?.close()}><Icon name="close" /></button></div>
    {children}
  </dialog>
}

function Settings({ state, onSave, onClose }: { state: FocusState; onSave: (durations: Durations, chime: boolean) => void; onClose: () => void }) {
  const [durations, setDurations] = useState({ ...state.durations })
  const [chime, setChime] = useState(state.chime)
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (Object.values(durations).some(value => !Number.isInteger(value) || value < 1 || value > 180)) {
      setError('Choose a whole number from 1 to 180 minutes for each timer.')
      return
    }
    onSave(durations, chime)
    onClose()
  }
  return <Modal title="Find your rhythm" kind="settings" onClose={onClose}>
    <p className="modal-intro">Make a little time that works for you.</p>
    <form onSubmit={submit}>
      <div className="duration-fields">
        {(['focus', 'short', 'long'] as const).map(mode => <label key={mode} className="duration-field" htmlFor={`duration-${mode}`}>
          <span>{MODE_LABELS[mode]}</span>
          <span className="number-field"><input id={`duration-${mode}`} name={`duration-${mode}`} type="number" min="1" max="180" step="1" required inputMode="numeric" value={Number.isNaN(durations[mode]) ? '' : durations[mode]} onChange={event => { setError(''); setDurations({ ...durations, [mode]: event.target.valueAsNumber }) }} aria-describedby="duration-hint" /><span>min</span></span>
        </label>)}
      </div>
      <p id="duration-hint" className="small muted">Choose 1–180 minutes. Saving resets the current timer.</p>
      <label className="checkbox-label"><input type="checkbox" checked={chime} onChange={event => setChime(event.target.checked)} /><span>Play a gentle chime when a timer ends</span></label>
      <p className="form-error small" role="alert">{error}</p>
      <button className="primary-button modal-save" type="submit">Save rhythm <Icon name="check" /></button>
    </form>
  </Modal>
}

function Guide({ onClose }: { onClose: () => void }) {
  return <Modal title="One thing at a time" kind="guide" onClose={onClose}>
    <p className="modal-intro">FREE is a small space to give something your attention.</p>
    <ol className="guide-steps">
      <li><span className="step-number">1</span><div><h3>Pick one thing</h3><p>Write an intention, however small. It’s optional; simply starting is enough.</p></div></li>
      <li><span className="step-number">2</span><div><h3>Give it a little time</h3><p>Start a focus session. Pause when you need to, or adjust the minutes in Timer settings.</p></div></li>
      <li><span className="step-number">3</span><div><h3>Leave room for a break</h3><p>When your timer ends, choose a short or long break. The next timer starts when you do.</p></div></li>
    </ol>
    <div className="guide-note"><Icon name="lock" /><p>Your intention, timer, and completed focus sessions are saved in this browser. There’s no account or cloud sync. Ambient sounds are generated on your device.</p></div>
    <p className="small muted">Keep this page open. A suspended browser or sleeping device may delay or silence the chime; the countdown catches up when you return.</p>
  </Modal>
}

export default function App() {
  const [state, dispatch] = useReducer(focusReducer, undefined, () => {
    try { return restoreState(localStorage.getItem(STORAGE_KEY), Date.now()) }
    catch { return restoreState(null, Date.now()) }
  })
  const [now, setNow] = useState(Date.now)
  const [saved, setSaved] = useState(true)
  const [modal, setModal] = useState<'settings' | 'guide' | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [sound, setSound] = useState<Sound | null>(null)
  const [soundBusy, setSoundBusy] = useState(false)
  const [soundMessage, setSoundMessage] = useState('')
  const [volume, setVolume] = useState(35)
  const audio = useRef<AmbientAudio | null>(null)
  const soundRequest = useRef(0)
  const previousStatus = useRef(state.timer.status)

  const getAudio = () => { audio.current ??= new AmbientAudio(); return audio.current }

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setSaved(true) }
    catch { setSaved(false) }
  }, [state])

  useEffect(() => {
    const update = () => {
      const current = Date.now()
      setNow(current)
      if (state.timer.status === 'running' && timeLeft(state.timer, current) === 0) dispatch({ type: 'finish', now: current })
    }
    update()
    const interval = window.setInterval(update, state.timer.status === 'running' ? 250 : 30_000)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('pageshow', update)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update); window.removeEventListener('pageshow', update) }
  }, [state.timer])

  useEffect(() => {
    if (state.timer.status === 'complete' && previousStatus.current === 'running') {
      if (state.chime) audio.current?.chime()
      const focusMessage = saved ? 'Focus session complete. A little progress counts. Your time has been saved.' : 'Focus session complete. A little progress counts. Progress lasts until this page closes.'
      setAnnouncement(state.timer.mode === 'focus' ? focusMessage : 'Break complete. Ready when you are.')
    }
    previousStatus.current = state.timer.status
  }, [state.timer.status, state.timer.mode, state.chime, saved])

  useEffect(() => () => { audio.current?.dispose(); audio.current = null }, [])

  const remaining = timeLeft(state.timer, now)
  const timerText = formatTime(remaining)
  const running = state.timer.status === 'running'
  const complete = state.timer.status === 'complete'
  const today = todaySessions(state.sessions, now)
  const focusMinutes = today.reduce((sum, session) => sum + session.minutes, 0)
  const progress = Math.min(1, Math.max(0, 1 - remaining / state.timer.durationMs))
  const pristine = state.timer.status === 'idle'

  useEffect(() => {
    document.title = running ? `${timerText} · ${MODE_LABELS[state.timer.mode]} · FREE` : 'FREE · Make room for focus'
  }, [running, timerText, state.timer.mode])

  const start = () => {
    if (state.chime) void getAudio().prepare().catch(() => { /* The visual timer is always available. */ })
    const current = Date.now()
    setNow(current)
    dispatch({ type: 'start', now: current, id: crypto.randomUUID() })
    setAnnouncement(`${MODE_LABELS[state.timer.mode]} timer ${state.timer.status === 'paused' ? 'resumed' : 'started'}.`)
  }

  const changeMode = (mode: Mode) => {
    if (mode === state.timer.mode) return
    dispatch({ type: 'mode', mode })
    setAnnouncement(`${MODE_LABELS[mode]} selected. Timer reset to ${state.durations[mode]} minutes.`)
  }

  const playSound = async (next: Sound | null) => {
    const request = ++soundRequest.current
    getAudio().stop()
    setSound(null)
    setSoundMessage('')
    if (!next || next === sound) { setSoundBusy(false); return }
    setSoundBusy(true)
    try {
      await getAudio().play(next)
      if (request !== soundRequest.current) return
      setSound(next)
    } catch {
      if (request === soundRequest.current) setSoundMessage(!window.AudioContext ? 'Ambient sound is unavailable in this browser. You can still use the timer.' : 'Sound could not start. Select a sound to try again.')
    } finally { if (request === soundRequest.current) setSoundBusy(false) }
  }

  const primaryAction = () => {
    if (running) { dispatch({ type: 'pause', now: Date.now() }); setAnnouncement('Timer paused. Resume whenever you’re ready.') }
    else if (complete) {
      const mode = state.timer.mode === 'focus' ? 'short' : 'focus'
      dispatch({ type: 'mode', mode })
      if (state.chime) void getAudio().prepare().catch(() => {})
      dispatch({ type: 'start', now: Date.now(), id: crypto.randomUUID() })
      setNow(Date.now())
      setAnnouncement(`${MODE_LABELS[mode]} timer started.`)
    } else start()
  }

  const primaryLabel = running ? 'Pause timer' : complete ? state.timer.mode === 'focus' ? 'Start short break' : 'Start focus' : state.timer.status === 'paused' ? 'Resume timer' : state.timer.mode === 'focus' ? 'Start focus' : 'Start break'
  const statusText = complete ? state.timer.mode === 'focus' ? 'A little progress counts. Take a breath.' : 'Rested a little? Ready when you are.' : running ? state.timer.mode === 'focus' ? 'Just this moment. Just this one thing.' : 'Step away. There’s room to rest.' : state.timer.status === 'paused' ? 'No rush. Pick up where you left off.' : state.timer.mode === 'focus' ? 'A little time for what matters.' : 'Doing nothing is doing something, too.'

  return <>
    <a className="skip-link" href="#workspace">Skip to timer</a>
    <header className="site-header page-width">
      <a className="wordmark" href="#" aria-label="FREE home">free<span className="brand-flower" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M16 3v26M3 16h26M7 7l18 18M7 25 25 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></span></a>
      <nav className="header-actions" aria-label="Workspace tools">
        <button className="text-button guide-button" type="button" onClick={() => setModal('guide')}><Icon name="help" /><span>How it works</span></button>
        <button className="icon-button settings-button" type="button" aria-label="Timer settings" title="Timer settings" onClick={() => setModal('settings')}><Icon name="settings" /></button>
      </nav>
    </header>

    <main className="page-width">
      <div className="intro"><h1>Make room for <em>focus.</em></h1><p>A quiet timer for one thing at a time.</p></div>

      <section className="workspace" id="workspace" aria-label="Focus workspace" tabIndex={-1}>
        <div className="timer-pane">
          <div className="mode-controls" role="group" aria-label="Timer mode">
            {(['focus', 'short', 'long'] as const).map(mode => <button type="button" key={mode} className={`mode-button ${state.timer.mode === mode ? 'selected' : ''}`} aria-pressed={state.timer.mode === mode} onClick={() => changeMode(mode)}>{MODE_LABELS[mode]}</button>)}
          </div>

          <div className="clock-area">
            <div className="timer-display" role="timer" aria-live="off" aria-label={`${MODE_LABELS[state.timer.mode]} time remaining: ${Number(timerText.split(':')[0])} minutes, ${Number(timerText.split(':')[1])} seconds`} aria-atomic="true"><span className="timer-number">{timerText.split(':')[0]}</span><span className="timer-colon">:</span><span className="timer-number seconds">{timerText.split(':')[1]}</span></div>
            <div className="timer-progress" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress * 100)} aria-valuetext={`${Math.floor(progress * 100)} percent complete`}><span style={{ width: `${progress * 100}%` }} /></div>
            <p className="timer-caption small">{statusText}</p>
            <div className="timer-actions">
              <button type="button" className="primary-button start-button" onClick={primaryAction}><Icon name={running ? 'pause' : 'play'} /><span>{primaryLabel}</span></button>
              <button type="button" className="icon-button reset-button" aria-label="Reset timer" title="Reset timer" disabled={pristine} onClick={() => { dispatch({ type: 'reset' }); setAnnouncement('Timer reset. Start again when you’re ready.') }}><Icon name="reset" /></button>
            </div>
          </div>

          <div className={`intention ${state.intentionDone ? 'is-done' : ''}`}>
            <label htmlFor="intention">One thing to focus on</label>
            <div className="intention-entry"><input id="intention" name="intention" type="text" maxLength={160} autoComplete="off" placeholder="e.g. Begin that first draft" value={state.intention} onChange={event => dispatch({ type: 'intention', value: event.target.value })} />
              <button className="intention-check icon-button" type="button" aria-label={state.intentionDone ? 'Mark intention incomplete' : 'Mark intention complete'} aria-pressed={state.intentionDone} disabled={!state.intention.trim()} onClick={() => { dispatch({ type: 'done' }); setAnnouncement(state.intentionDone ? 'Intention marked incomplete.' : 'Intention complete. A small win, well earned.') }}><Icon name="check" /></button></div>
          </div>
        </div>

        <div className="room-pane"><QuietRoom /><div className="room-caption"><span className="room-mark" aria-hidden="true"><Icon name="sun" /></span><p>A little space to just be.</p></div></div>
      </section>

      <section className="sound-section" aria-labelledby="sound-title">
        <div className="sound-heading"><h2 id="sound-title">Set the mood</h2><p className="small muted">A softer place for your attention.</p></div>
        <div className="sound-controls" role="group" aria-label="Ambient sound">
          <button type="button" className={`sound-button ${sound === null ? 'selected' : ''}`} aria-pressed={sound === null} onClick={() => void playSound(null)} disabled={soundBusy}><Icon name="quiet" /><span>Quiet</span></button>
          {SOUNDS.map(item => <button key={item.id} type="button" className={`sound-button ${sound === item.id ? 'selected' : ''}`} aria-pressed={sound === item.id} disabled={soundBusy} onClick={() => void playSound(item.id)}><Icon name={item.id} /><span>{item.label}</span>{sound === item.id && <span className="sound-playing" aria-hidden="true"><i/><i/><i/></span>}</button>)}
        </div>
        <div className="volume-control"><Icon name="volume" /><label htmlFor="volume" className="sr-only">Ambient volume</label><input id="volume" name="volume" type="range" min="0" max="100" value={volume} aria-valuetext={`${volume} percent`} onChange={event => { setVolume(Number(event.target.value)); getAudio().setVolume(Number(event.target.value) / 100) }} /></div>
        <div className="sound-feedback small" role="status">{soundBusy ? 'Preparing your sound…' : soundMessage}</div>
      </section>

      <section className="today-section" aria-labelledby="today-title">
        <div className="today-heading"><Icon name="leaf" /><div><h2 id="today-title">Small steps add up.</h2><p className="small muted">{today.length === 0 ? 'Your first focus session is a good place to start.' : 'A little more space for what matters to you.'}</p></div></div>
        <div className="today-stats"><div className="stat"><span className="stat-number">{today.length}</span><span className="small muted">{today.length === 1 ? 'session today' : 'sessions today'}</span></div><span className="stat-divider" aria-hidden="true"/><div className="stat"><span className="stat-number">{focusMinutes}<span className="stat-unit small">min</span></span><span className="small muted">of focus today</span></div></div>
      </section>
    </main>

    <footer className="site-footer page-width"><span className="footer-note">A little less noise. A little more you.</span><span className={`storage-note ${!saved ? 'storage-error' : ''}`}><Icon name="lock" /><span>{saved ? 'Just this browser. Just for you.' : 'Storage unavailable. Progress lasts until this page closes.'}</span></span></footer>
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

    {modal === 'settings' && <Settings state={state} onSave={(durations, chime) => { dispatch({ type: 'settings', durations, chime }); setAnnouncement('Timer settings saved. Your timer has been reset.') }} onClose={() => setModal(null)} />}
    {modal === 'guide' && <Guide onClose={() => setModal(null)} />}
  </>
}
