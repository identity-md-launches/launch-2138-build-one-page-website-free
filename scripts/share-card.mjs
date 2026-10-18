import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'

const serif = (await readFile(new URL('../public/fonts/instrument-serif-latin.woff2', import.meta.url))).toString('base64')
const sans = (await readFile(new URL('../public/fonts/dm-sans-latin.woff2', import.meta.url))).toString('base64')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html><head><style>
    @font-face{font-family:Display;src:url(data:font/woff2;base64,${serif})}
    @font-face{font-family:Body;src:url(data:font/woff2;base64,${sans});font-weight:400 600}
    *{box-sizing:border-box}body{margin:0;background:#f6f5ee;color:#2f372a;width:1200px;height:630px;display:flex;align-items:center;padding:80px;gap:60px}
    .copy{width:580px}.logo{font:600 38px Body;letter-spacing:-2px;margin-bottom:48px}h1{font:400 84px/1 Display;margin:0;letter-spacing:-2px;max-width:500px}p{font:400 24px/1.5 Body;color:#58654d;margin:24px 0 0}.note{font-size:18px;margin-top:28px}
    .window{width:350px;height:410px;border:14px solid #adb89c;border-radius:180px 180px 0 0;overflow:hidden;background:#eee8cf;position:relative;flex-shrink:0}.window:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 48.5%,#f6f5ee 48.5%,#f6f5ee 51.5%,transparent 51.5%)}
  </style></head><body><div class="copy"><div class="logo">free ✳</div><h1>Make room<br>for focus.</h1><p>A quiet timer for one thing at a time.</p><p class="note">A little space. No account needed.</p></div><div class="window"><svg viewBox="0 0 322 382" width="322" height="382"><circle cx="230" cy="100" r="36" fill="#ddbb6d"/><path d="M0 260c60-90 105-100 150-40s125-100 180-60v240H0Z" fill="#a6b695"/><path d="M0 300c60-60 105-70 150-40s105-70 180-30v170H0Z" fill="#7e9778"/><path d="M0 350c90-70 120 20 220-50s100-30 120-20v120H0Z" fill="#bac4a3"/><path d="M100 390c30-80 110-60 120-100 10-25 15-30 35-40-20 30-15 50-40 65-50 30-45 50-50 75Z" fill="#d8dbc2"/><path d="M0 220h322" stroke="#f6f5ee" stroke-width="10"/></svg></div></body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await mkdir(new URL('../public/', import.meta.url), { recursive: true })
  await page.screenshot({ path: new URL('../public/share.png', import.meta.url).pathname, type: 'png' })
  console.log('Generated public/share.png (1200 × 630).')
} finally { await browser.close() }
