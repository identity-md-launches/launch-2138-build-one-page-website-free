import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { startPreview } from './preview-server.mjs'

const out = new URL('../artifacts/', import.meta.url)
await mkdir(new URL('screenshots/', out), { recursive: true })
const preview = await startPreview('dist')
const report = { preview: '/preview/', offline: true, engines: [], checks: [], limitations: [] }
let failures = 0

async function check(name, fn) {
  try { const details = await fn(); report.checks.push({ name, passed: true, ...(details ? { details } : {}) }); console.log(`PASS ${name}`) }
  catch (error) { failures++; report.checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`) }
}

try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    let browser
    try { browser = await engine.launch({ headless: true }) }
    catch (error) {
      report.engines.push({ name, status: 'unavailable', reason: error.message })
      report.limitations.push(`${name} could not launch: ${error.message}`)
      console.log(`UNAVAILABLE ${name}: ${error.message.split('\n').filter(Boolean).slice(0, 3).join(' ')}`)
      continue
    }
    report.engines.push({ name, status: 'tested', version: browser.version() })
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, timezoneId: 'Europe/Berlin' })
      const external = [], errors = [], resources = []
      await context.route('**/*', route => {
        if (route.request().url().startsWith(new URL(preview.url).origin)) return route.continue()
        external.push(route.request().url()); return route.abort()
      })
      const page = await context.newPage()
      page.setDefaultTimeout(6000)
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      page.on('response', response => { if (response.status() >= 400) resources.push(`${response.status()} ${response.url()}`) })
      await page.addInitScript(() => {
        window.__audioContexts = []
        window.__audioSources = []
        const NativeAudioContext = window.AudioContext
        if (NativeAudioContext) window.AudioContext = class extends NativeAudioContext {
          constructor(...args) { super(...args); window.__audioContexts.push(this) }
          createBufferSource() { const source = super.createBufferSource(); window.__audioSources.push(source); return source }
        }
      })
      await page.clock.install({ time: new Date('2026-10-18T10:00:00+02:00') })
      await page.goto(preview.url)
      await page.evaluate(() => document.fonts.ready)
      const button = label => page.getByRole('button', { name: label, exact: true })
      const timer = page.getByRole('timer')
      const shot = async (filename, fullPage = true) => page.screenshot({ path: new URL(`screenshots/${name.toLowerCase()}-${filename}.png`, out).pathname, fullPage })
      const noOverflow = async () => page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
      const audit = async () => {
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
        assert.deepEqual(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [])
        return { violations: results.violations.length, passes: results.passes.length }
      }

      await check(`${name}: first screen at 390`, async () => {
        assert.equal(await timer.textContent(), '25:00')
        const fonts = await page.evaluate(() => [...document.fonts].map(font => ({ family: font.family, style: font.style, status: font.status })))
        assert.equal(fonts.length, 3)
        assert.ok(fonts.every(font => font.status === 'loaded'), `Local font load failed: ${JSON.stringify(fonts)}`)
        const rect = await button('Start focus').boundingBox()
        assert.ok(rect && rect.y + rect.height <= 844, 'The primary action must be fully visible')
        await shot('390')
        return { primaryActionBottom: rect.y + rect.height, viewportHeight: 844, fonts }
      })
      await check(`${name}: default accessibility scan`, audit)
      await check(`${name}: keyboard modes, start, pause and resume`, async () => {
        await page.keyboard.press('Tab')
        assert.equal(await page.locator(':focus').textContent(), 'Skip to timer')
        await page.keyboard.press('Enter')
        await page.keyboard.press('Tab') // Focus
        await page.keyboard.press('Tab') // Short break
        await page.keyboard.press('Enter')
        assert.equal(await timer.textContent(), '05:00')
        await page.keyboard.press('Tab')
        await page.keyboard.press('Enter')
        assert.equal(await timer.textContent(), '15:00')
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Enter')
        assert.equal(await timer.textContent(), '25:00')
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        assert.equal(await page.locator(':focus').innerText(), 'Start focus')
        await page.keyboard.press('Space')
        await page.clock.fastForward(1500)
        assert.equal(await timer.textContent(), '24:59')
        assert.ok((await page.title()).startsWith('24:59'))
        await page.keyboard.press('Space')
        assert.ok(await button('Resume timer').isVisible())
        const paused = await timer.textContent()
        await page.clock.fastForward(10_000)
        assert.equal(await timer.textContent(), paused)
        await page.screenshot({ path: new URL(`screenshots/${name.toLowerCase()}-keyboard-focus.png`, out).pathname })
        await page.keyboard.press('Space')
        assert.ok(await button('Pause timer').isVisible())
      })

      await check(`${name}: intention, completion toggle, and reload persistence`, async () => {
        await page.getByLabel('One thing to focus on').fill('Write the first paragraph')
        await button('Mark intention complete').click()
        assert.equal(await button('Mark intention incomplete').getAttribute('aria-pressed'), 'true')
        await page.reload()
        assert.equal(await page.getByLabel('One thing to focus on').inputValue(), 'Write the first paragraph')
        assert.ok(await button('Pause timer').isVisible())
        assert.ok(await button('Mark intention incomplete').isVisible())
        await page.getByLabel('One thing to focus on').fill('Finish a small draft')
        assert.ok(await button('Mark intention complete').isVisible())
        await button('Pause timer').click()
      })

      await check(`${name}: settings validation, Escape and focus return`, async () => {
        await button('Timer settings').click()
        assert.ok(await page.getByRole('dialog').isVisible())
        await page.keyboard.press('Escape')
        assert.equal(await page.getByRole('dialog').count(), 0)
        assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Timer settings')
        await button('Timer settings').click()
        await page.getByRole('spinbutton', { name: 'Focus min', exact: true }).fill('0')
        await button('Save rhythm').click()
        assert.ok(await page.getByRole('dialog').isVisible())
        assert.equal(await page.locator('#duration-focus').evaluate(el => el.validity.rangeUnderflow), true)
        await page.getByRole('spinbutton', { name: 'Focus min', exact: true }).fill('1')
        await page.getByRole('spinbutton', { name: 'Short break min', exact: true }).fill('1')
        await page.getByRole('spinbutton', { name: 'Long break min', exact: true }).fill('2')
        await audit()
        await shot('settings', false)
        await button('Save rhythm').click()
        assert.equal(await timer.textContent(), '01:00')
        assert.ok(await button('Start focus').isVisible())
        await page.reload()
        assert.equal(await timer.textContent(), '01:00')
      })

      await check(`${name}: completion, next break, and no double counting`, async () => {
        await button('Start focus').click()
        await page.clock.fastForward(60_100)
        assert.equal(await timer.textContent(), '00:00')
        assert.ok(await button('Start short break').isVisible())
        assert.equal(await page.locator('.stat-number').first().textContent(), '1')
        assert.equal(await page.locator('.stat-number').nth(1).textContent(), '1min')
        await shot('complete')
        await page.reload()
        assert.equal(await page.locator('.stat-number').first().textContent(), '1')
        await button('Start short break').click()
        assert.equal(await timer.textContent(), '01:00')
        assert.equal(await button('Short break').getAttribute('aria-pressed'), 'true')
        await page.clock.fastForward(60_100)
        assert.ok(await button('Start focus').isVisible())
        assert.equal(await page.locator('.stat-number').first().textContent(), '1')
        await button('Start focus').click()
        await button('Reset timer').click()
        assert.equal(await timer.textContent(), '01:00')
        assert.equal(await button('Reset timer').isDisabled(), true)
      })

      await check(`${name}: real ambient audio, selection, volume and stop`, async () => {
        for (const sound of ['Rain', 'Ocean', 'Brown noise']) {
          await button(sound).click()
          await page.waitForFunction(label => [...document.querySelectorAll('.sound-button')].some(el => el.textContent === label && el.getAttribute('aria-pressed') === 'true'), sound)
          const audioState = await page.evaluate(() => ({
            running: window.__audioContexts.some(context => context.state === 'running'),
            buffers: window.__audioSources.filter(source => source.buffer?.numberOfChannels === 2 && source.buffer.getChannelData(0).some(n => n !== 0)).length,
          }))
          assert.equal(audioState.running, true)
          assert.ok(audioState.buffers > 0)
        }
        await page.getByRole('slider', { name: 'Ambient volume' }).focus()
        await page.keyboard.press('End')
        assert.equal(await page.getByRole('slider').inputValue(), '100')
        await page.keyboard.press('Home')
        assert.equal(await page.getByRole('slider').inputValue(), '0')
        await page.keyboard.press('ArrowRight')
        assert.equal(await page.getByRole('slider').inputValue(), '1')
        await audit()
        await page.emulateMedia({ reducedMotion: 'reduce' })
        assert.equal(await page.locator('.sound-playing i').first().evaluate(el => getComputedStyle(el).animationName), 'none')
        await button('Quiet').click()
        assert.equal(await button('Quiet').getAttribute('aria-pressed'), 'true')
        assert.equal(await page.locator('.sound-playing').count(), 0)
        await page.emulateMedia({ reducedMotion: 'no-preference' })
      })

      await check(`${name}: guide dialog, keyboard containment and accessibility`, async () => {
        await page.evaluate(() => scrollTo(0, 0))
        await button('How it works').click()
        assert.ok(await page.getByRole('heading', { name: 'One thing at a time' }).isVisible())
        await page.keyboard.press('Tab')
        assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Close dialog')
        await audit()
        await shot('guide', false)
        await page.keyboard.press('Escape')
        assert.equal(await page.locator(':focus').innerText(), 'How it works')
      })

      await check(`${name}: responsive widths, largest duration, RTL and text enlargement`, async () => {
        await button('Timer settings').click()
        await page.getByRole('spinbutton', { name: 'Focus min', exact: true }).fill('180')
        await button('Save rhythm').click()
        const widths = [320, 390, 624, 744, 834, 1120, 1440]
        for (const width of widths) {
          await page.setViewportSize({ width, height: 900 })
          const dimensions = await noOverflow()
          assert.ok(dimensions.scroll <= dimensions.width, `Overflow at ${width}: ${JSON.stringify(dimensions)}`)
        }
        await shot('1440')
        await page.setViewportSize({ width: 320, height: 740 })
        await shot('320-max-duration')
        await page.evaluate(() => { document.documentElement.dir = 'rtl' })
        let dimensions = await noOverflow()
        assert.ok(dimensions.scroll <= dimensions.width, 'RTL reflow')
        await page.evaluate(() => { document.documentElement.dir = 'ltr'; document.documentElement.style.fontSize = '200%' })
        dimensions = await noOverflow()
        await shot('text-200')
        assert.ok(dimensions.scroll <= dimensions.width, `200% text enlargement overflow: ${JSON.stringify(dimensions)}`)
        await page.evaluate(() => { document.documentElement.style.fontSize = '' })
      })

      await check(`${name}: unavailable audio reports a recoverable error`, async () => {
        const failureContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
        try {
          const failurePage = await failureContext.newPage()
          await failurePage.addInitScript(() => { window.__nativeAudio = window.AudioContext; window.AudioContext = class { constructor() { throw new Error('Simulated audio-device failure') } } })
          await failurePage.goto(preview.url)
          await failurePage.getByRole('button', { name: 'Rain', exact: true }).click()
          await failurePage.getByText('Sound could not start. Select a sound to try again.').waitFor()
          assert.equal(await failurePage.getByRole('button', { name: 'Quiet', exact: true }).getAttribute('aria-pressed'), 'true')
          await failurePage.evaluate(() => { window.AudioContext = window.__nativeAudio })
          await failurePage.getByRole('button', { name: 'Rain', exact: true }).click()
          await failurePage.waitForFunction(() => document.querySelector('.sound-button[aria-pressed="true"]')?.textContent === 'Rain')
          assert.equal(await failurePage.locator('.sound-feedback').textContent(), '')
          await failurePage.getByRole('button', { name: 'Quiet', exact: true }).click()
        } finally { await failureContext.close() }
      })

      await check(`${name}: storage failure keeps the timer usable and explains persistence`, async () => {
        const storageContext = await browser.newContext({ viewport: { width: 320, height: 740 } })
        try {
          const storagePage = await storageContext.newPage()
          await storagePage.clock.install({ time: new Date('2026-10-18T10:00:00+02:00') })
          await storagePage.addInitScript(() => {
            Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('Simulated blocked storage', 'SecurityError') } })
          })
          await storagePage.goto(preview.url)
          await storagePage.getByText('Storage unavailable. Progress lasts until this page closes.').waitFor()
          await storagePage.getByRole('button', { name: 'Start focus', exact: true }).click()
          assert.ok(await storagePage.getByRole('button', { name: 'Pause timer', exact: true }).isVisible())
          await storagePage.clock.fastForward(25 * 60_000 + 100)
          assert.ok(await storagePage.getByRole('button', { name: 'Start short break', exact: true }).isVisible())
          assert.ok((await storagePage.locator('.sr-only[role="status"]').textContent()).includes('Progress lasts until this page closes.'))
          const dimensions = await storagePage.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          assert.ok(dimensions.scroll <= dimensions.width)
        } finally { await storageContext.close() }
      })

      await check(`${name}: forced-colors focus remains visible`, async () => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.emulateMedia({ forcedColors: 'active' })
        await button('Start focus').focus()
        await page.keyboard.press('Tab')
        await page.keyboard.press('Shift+Tab')
        const focus = await button('Start focus').evaluate(el => ({ outlineStyle: getComputedStyle(el).outlineStyle, outlineWidth: getComputedStyle(el).outlineWidth }))
        assert.equal(focus.outlineStyle, 'solid')
        assert.equal(focus.outlineWidth, '2px')
        await shot('forced-colors', false)
        await page.emulateMedia({ forcedColors: 'none' })
      })

      await check(`${name}: metadata assets, offline resources and console`, async () => {
        const paths = await page.evaluate(() => [document.querySelector('link[rel=icon]')?.getAttribute('href'), document.querySelector('meta[property="og:image"]')?.getAttribute('content')])
        for (const path of paths) {
          assert.ok(path)
          const response = await context.request.get(new URL(path, preview.url).href)
          assert.equal(response.status(), 200)
          assert.ok((await response.body()).byteLength > 0)
        }
        assert.deepEqual(external, [])
        assert.deepEqual(resources, [])
        assert.deepEqual(errors, [])
        return { externalRequests: external.length, failedResources: resources.length, consoleErrors: errors.length }
      })
      await context.close()
    } finally { await browser.close() }
  }
  if (!report.engines.some(engine => engine.status === 'tested')) failures++
} finally {
  await new Promise(done => preview.server.close(done))
  report.result = failures === 0 ? 'All executable checks passed; see engine limitations.' : `${failures} checks failed.`
  await writeFile(new URL('interaction-results.json', out), JSON.stringify(report, null, 2) + '\n')
  console.log(report.result)
}
process.exitCode = failures ? 1 : 0
