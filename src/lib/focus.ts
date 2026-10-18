export type Mode = 'focus' | 'short' | 'long'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'complete'
export type Durations = Record<Mode, number>
export type Timer = {
  mode: Mode
  status: TimerStatus
  durationMs: number
  remainingMs: number
  deadline: number | null
  id: string
}
export type Session = { id: string; completedAt: number; minutes: number; intention: string }
export type FocusState = {
  timer: Timer
  durations: Durations
  intention: string
  intentionDone: boolean
  sessions: Session[]
  chime: boolean
}
export const STORAGE_KEY = 'free-focus-v1'
export const DEFAULT_DURATIONS: Durations = { focus: 25, short: 5, long: 15 }
export const MODE_LABELS: Record<Mode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' }

export function newTimer(mode: Mode, durations: Durations): Timer {
  return { mode, status: 'idle', durationMs: durations[mode] * 60_000, remainingMs: durations[mode] * 60_000, deadline: null, id: '' }
}
export function initialState(): FocusState {
  return { timer: newTimer('focus', DEFAULT_DURATIONS), durations: { ...DEFAULT_DURATIONS }, intention: '', intentionDone: false, sessions: [], chime: true }
}
export function timeLeft(timer: Timer, now: number): number {
  return timer.status === 'running' && timer.deadline !== null ? Math.max(0, timer.deadline - now) : timer.remainingMs
}
export function formatTime(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
export function finish(state: FocusState, now: number): FocusState {
  if (state.timer.status !== 'running' || timeLeft(state.timer, now) > 0) return state
  const session = { id: state.timer.id, completedAt: state.timer.deadline ?? now, minutes: state.timer.durationMs / 60_000, intention: state.intention }
  const sessions = state.timer.mode === 'focus' && !state.sessions.some(s => s.id === session.id)
    ? [...state.sessions, session].slice(-500) : state.sessions
  return { ...state, timer: { ...state.timer, status: 'complete', remainingMs: 0, deadline: null }, sessions }
}
export type Action =
  | { type: 'start'; now: number; id: string }
  | { type: 'pause'; now: number }
  | { type: 'finish'; now: number }
  | { type: 'reset' }
  | { type: 'mode'; mode: Mode }
  | { type: 'settings'; durations: Durations; chime: boolean }
  | { type: 'intention'; value: string }
  | { type: 'done' }

export function focusReducer(state: FocusState, action: Action): FocusState {
  switch (action.type) {
    case 'start': {
      if (state.timer.status === 'running') return state
      const timer = state.timer.status === 'complete' ? newTimer(state.timer.mode, state.durations) : state.timer
      return { ...state, timer: { ...timer, id: timer.id || action.id, status: 'running', deadline: action.now + timer.remainingMs } }
    }
    case 'pause': {
      if (state.timer.status !== 'running') return state
      if (timeLeft(state.timer, action.now) === 0) return finish(state, action.now)
      return { ...state, timer: { ...state.timer, status: 'paused', remainingMs: timeLeft(state.timer, action.now), deadline: null } }
    }
    case 'finish': return finish(state, action.now)
    case 'reset': return { ...state, timer: newTimer(state.timer.mode, state.durations) }
    case 'mode': return action.mode === state.timer.mode ? state : { ...state, timer: newTimer(action.mode, state.durations) }
    case 'settings': return { ...state, durations: action.durations, chime: action.chime, timer: newTimer(state.timer.mode, action.durations) }
    case 'intention': return { ...state, intention: action.value.slice(0, 160), intentionDone: false }
    case 'done': return state.intention.trim() ? { ...state, intentionDone: !state.intentionDone } : state
  }
}

function isNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }
function validDurations(value: unknown): value is Durations {
  if (!value || typeof value !== 'object') return false
  return (['focus', 'short', 'long'] as const).every(key => {
    const n = (value as Durations)[key]
    return isNumber(n) && Number.isInteger(n) && n >= 1 && n <= 180
  })
}

// Local storage is untrusted input; only the supported schema can restore a running timer.
export function restoreState(raw: string | null, now: number): FocusState {
  const fallback = initialState()
  if (!raw) return fallback
  try {
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return fallback
    const p = data as Partial<FocusState>
    const durations = validDurations(p.durations) ? p.durations : fallback.durations
    const t = p.timer
    const validTimer = t && ['focus', 'short', 'long'].includes(t.mode)
      && ['idle', 'running', 'paused', 'complete'].includes(t.status)
      && isNumber(t.durationMs) && t.durationMs >= 60_000 && t.durationMs <= 10_800_000
      && isNumber(t.remainingMs) && t.remainingMs >= 0 && t.remainingMs <= t.durationMs
      && typeof t.id === 'string' && t.id.length <= 100
      && (t.status !== 'running' || (t.id.length > 0 && isNumber(t.deadline) && t.deadline > 0 && t.deadline <= now + t.durationMs + 1000))
    const sessions = Array.isArray(p.sessions) ? p.sessions.filter((s): s is Session =>
      !!s && typeof s === 'object' && typeof s.id === 'string' && s.id.length <= 100
      && isNumber(s.completedAt) && s.completedAt > 0 && s.completedAt <= now
      && isNumber(s.minutes) && s.minutes >= 1 && s.minutes <= 180 && typeof s.intention === 'string'
    ).slice(-500).map(s => ({ ...s, intention: s.intention.slice(0, 160) })) : []
    const restored: FocusState = {
      timer: validTimer ? t : newTimer('focus', durations), durations,
      intention: typeof p.intention === 'string' ? p.intention.slice(0, 160) : '',
      intentionDone: typeof p.intentionDone === 'boolean' ? p.intentionDone : false,
      sessions: sessions.filter((s, i) => sessions.findIndex(v => v.id === s.id) === i),
      chime: typeof p.chime === 'boolean' ? p.chime : true,
    }
    return finish(restored, now)
  } catch { return fallback }
}

export function todaySessions(sessions: Session[], now: number): Session[] {
  const date = new Date(now).toDateString()
  return sessions.filter(s => new Date(s.completedAt).toDateString() === date)
}
