import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' }

// A bounded caller owns this server and closes it in finally. Deliberately no SPA fallback.
export async function startPreview(directory = 'dist') {
  const root = resolve(directory)
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      if (!url.pathname.startsWith('/preview/')) { response.writeHead(404); response.end('Not found'); return }
      const relative = decodeURIComponent(url.pathname.slice('/preview/'.length)) || 'index.html'
      const file = resolve(root, relative)
      if (!file.startsWith(root + sep)) { response.writeHead(403); response.end('Forbidden'); return }
      const body = await readFile(file)
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
      response.end(body)
    } catch { response.writeHead(404); response.end('Not found') }
  })
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) })
  return { server, url: `http://127.0.0.1:${server.address().port}/preview/` }
}
