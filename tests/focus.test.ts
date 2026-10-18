import { test } from 'node:test'
import assert from 'node:assert/strict'
import { focusReducer, formatTime, initialState, restoreState, timeLeft, todaySessions } from '../src/lib/focus.ts'

test('pause preserves the exact remaining time; resume creates a fresh deadline', () => {
  let state = initialState()
  state = focusReducer(state, { type: 'start', now: 100_000, id: 'session-one' })
  assert.equal(state.timer.deadline, 1_600_000)
  state = focusReducer(state, { type: 'pause', now: 160_500 })
  assert.equal(state.timer.remainingMs, 1_439_500)
  assert.equal(state.timer.status, 'paused')
  state = focusReducer(state, { type: 'start', now: 300_000, id: 'not-a-new-session' })
  assert.equal(state.timer.deadline, 1_739_500)
  assert.equal(state.timer.id, 'session-one')
})

test('an elapsed deadline records exactly one completed focus session', () => {
  let state = focusReducer(initialState(), { type: 'intention', value: 'Write the opening paragraph' })
  state = focusReducer(state, { type: 'start', now: 1_000_000, id: 'completed' })
  state = focusReducer(state, { type: 'finish', now: 3_000_000 })
  assert.equal(state.timer.status, 'complete')
  assert.equal(state.sessions.length, 1)
  assert.equal(state.sessions[0].completedAt, 2_500_000)
  assert.equal(state.sessions[0].minutes, 25)
  assert.equal(state.sessions[0].intention, 'Write the opening paragraph')
  state = focusReducer(state, { type: 'finish', now: 4_000_000 })
  assert.equal(state.sessions.length, 1)
})

test('a reload catches up an elapsed timer and cannot count the same session twice', () => {
  const started = focusReducer(initialState(), { type: 'start', now: 1_000_000, id: 'reload-session' })
  const restored = restoreState(JSON.stringify(started), 3_000_000)
  assert.equal(restored.timer.status, 'complete')
  assert.equal(restored.sessions.length, 1)
  assert.equal(restoreState(JSON.stringify(restored), 4_000_000).sessions.length, 1)
})

test('breaks, resets and mode changes do not create focus progress', () => {
  let state = focusReducer(initialState(), { type: 'mode', mode: 'short' })
  state = focusReducer(state, { type: 'start', now: 1_000_000, id: 'break-session' })
  state = focusReducer(state, { type: 'finish', now: 2_000_000 })
  assert.equal(state.sessions.length, 0)
  state = focusReducer(state, { type: 'mode', mode: 'focus' })
  state = focusReducer(state, { type: 'start', now: 3_000_000, id: 'abandoned' })
  state = focusReducer(state, { type: 'reset' })
  assert.equal(state.timer.status, 'idle')
  assert.equal(state.sessions.length, 0)
})

test('pause at or after the deadline completes instead of leaving a zero-second paused timer', () => {
  const started = focusReducer(initialState(), { type: 'start', now: 1_000_000, id: 'last-second' })
  const pausedLate = focusReducer(started, { type: 'pause', now: 2_500_001 })
  assert.equal(pausedLate.timer.status, 'complete')
  assert.equal(pausedLate.sessions.length, 1)
})

test('restoration rejects invalid durations, deadlines, corrupt JSON and session records', () => {
  assert.deepEqual(restoreState('{broken', 1_000_000), initialState())
  assert.deepEqual(restoreState(JSON.stringify({ durations: { focus: -1, short: 0, long: 999 } }), 1_000_000).durations, initialState().durations)
  const forged = initialState()
  forged.timer = { ...forged.timer, status: 'running', deadline: 100_000_000_000, id: 'far-future' }
  assert.equal(restoreState(JSON.stringify(forged), 1_000_000).timer.status, 'idle')
  assert.equal(restoreState(JSON.stringify({ sessions: [null, {}, { id: 'future', completedAt: 9_000_000, minutes: 25, intention: '' }] }), 1_000_000).sessions.length, 0)
})

test('remaining time rounds up, never goes negative, and supports long custom sessions', () => {
  assert.equal(formatTime(1), '00:01')
  assert.equal(formatTime(-1), '00:00')
  assert.equal(formatTime(180 * 60_000), '180:00')
  const state = focusReducer(initialState(), { type: 'start', now: 1_000_000, id: 'time' })
  assert.equal(timeLeft(state.timer, 10_000_000), 0)
})

test('today uses the local calendar date and intentions can be checked and edited', () => {
  const noon = new Date(2026, 4, 8, 12).getTime()
  const yesterday = new Date(2026, 4, 7, 12).getTime()
  assert.equal(todaySessions([{ id: 'today', completedAt: noon, minutes: 25, intention: '' }, { id: 'yesterday', completedAt: yesterday, minutes: 25, intention: '' }], noon).length, 1)
  let state = focusReducer(initialState(), { type: 'done' })
  assert.equal(state.intentionDone, false)
  state = focusReducer(state, { type: 'intention', value: 'A small task' })
  state = focusReducer(state, { type: 'done' })
  assert.equal(state.intentionDone, true)
  state = focusReducer(state, { type: 'intention', value: 'Another small task' })
  assert.equal(state.intentionDone, false)
})
