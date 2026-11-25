import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { test } from 'node:test'
import { routes, routeAliases } from '../../src/routing/routes.mjs'

test('native NGINX serves route refreshes and real static-file 404s', { timeout: 15000 }, async t => {
  const nginx = process.env.NGINX_BIN || 'nginx'
  const dir = await mkdtemp(join(tmpdir(), 'webblocks-nginx-'))
  const root = join(dir, 'html')
  // A root-run NGINX master drops privileges for worker processes.
  await chmod(dir, 0o755)
  t.after(() => rm(dir, { recursive: true, force: true }))
  await mkdir(join(root, 'assets'), { recursive: true })
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Webblocks fixture</title>')
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("fixture")')
  const reservation = createServer()
  await new Promise((done, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', done) })
  const port = reservation.address().port
  await new Promise(done => reservation.close(done))
  // Only the listen address and document root differ from the shipped server block.
  const server = (await readFile(new URL('../../config/nginx/default.conf', import.meta.url), 'utf8'))
    .replace('listen 80 default_server;', `listen 127.0.0.1:${port} default_server;`)
    .replace('listen [::]:80 default_server;', '')
    .replace('root /var/www/html;', `root "${root}";`)
  const conf = join(dir, 'nginx.conf')
  await writeFile(conf, `pid "${dir}/nginx.pid";\nerror_log stderr;\nevents {}\nhttp { access_log off; ${server} }`)
  execFileSync(nginx, ['-t', '-p', dir, '-c', conf], { stdio: 'pipe' })
  const child = spawn(nginx, ['-p', dir, '-c', conf, '-g', 'daemon off;'], { stdio: ['ignore', 'ignore', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', data => { stderr += data })
  const exited = new Promise(done => child.once('close', done))
  t.after(async () => { child.kill('SIGTERM'); await exited })
  const origin = `http://127.0.0.1:${port}`
  let ready = false
  for (let i = 0; i < 50; i++) {
    try { ready = (await fetch(origin)).ok } catch { /* wait for bind */ }
    if (ready) break
    await delay(50)
  }
  assert.ok(ready, `NGINX failed to start: ${stderr}`)
  for (const route of [...Object.values(routes), ...Object.keys(routeAliases), '/unknown']) {
    const response = await fetch(origin + route + '?q=1')
    assert.equal(response.status, 200, route)
    assert.match(await response.text(), /Webblocks fixture/, route)
  }
  assert.equal(await (await fetch(origin + '/assets/app.js')).text(), 'console.log("fixture")')
  for (const route of ['/assets/missing', '/assets/missing.js', '/characters/missing.png', '/controller/missing', '/gen_util/missing', '/missing.png']) {
    const response = await fetch(origin + route)
    assert.equal(response.status, 404, route)
    assert.doesNotMatch(await response.text(), /Webblocks fixture/, route)
  }
  child.kill('SIGTERM')
  await exited
})
