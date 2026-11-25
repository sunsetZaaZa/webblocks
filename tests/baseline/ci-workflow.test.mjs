import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const caller = read('.github/workflows/ci.yml')
const workflow = read('.github/workflows/reusable-build.yml')
const scripts = JSON.parse(read('package.json')).scripts

test('CI validates push, PR and manual runs without deployment or write permissions', () => {
  assert.match(caller, /^on:\n  push:\n  pull_request:\n  workflow_dispatch:\n/m)
  assert.match(caller, /^permissions:\n  contents: read\n\n/m)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /oven-sh\/setup-bun@[a-f0-9]{40}/)
  assert.match(caller, /uses: \.\/\.github\/workflows\/reusable-build\.yml/)
  assert.doesNotMatch(caller, /publish_pages:|pages: write|id-token: write|reusable-pages/)
  assert.doesNotMatch(workflow, /pull_request_target|workflow_run:|pages: write|id-token: write|actions\/deploy-pages|continue-on-error|secrets\./)
  assert.match(workflow, /publish_pages:\n[^]*?default: false/)
  assert.match(workflow, /name: Upload qualified Pages artifact\n        if: \$\{\{ success\(\) && inputs.publish_pages \}\}/)
})

test('CI pins the runtime and actions and uses a locked dependency install', () => {
  assert.equal(read('.bun-version').trim(), '1.4.5')
  assert.match(workflow, /bun-version-file: \$\{\{ steps.workspace.outputs.directory \}\}\/\.bun-version/)
  assert.match(workflow, /runs-on: ubuntu-24\.04/)
  const actions = [...workflow.matchAll(/^\s+uses: (\S+)/gm)].map(m => m[1])
  assert.equal(actions.length, 5)
  for (const action of actions) assert.match(action, /^(?:actions\/(checkout|upload-artifact|upload-pages-artifact)|oven-sh\/setup-bun)@[0-9a-f]{40}$/)
  assert.match(workflow, /bun install --frozen-lockfile/)
  assert.doesNotMatch(workflow, /npm (?:install|ci|run)\b|setup-node|continue-on-error/)
})

test('all required checks precede the success-only artifact upload', () => {
  const commands = ['test:baseline', 'typecheck', 'lint', 'test:unit', 'pw:install', 'test:deployment', 'test:static', 'test:routing', 'test:persistence-browser', 'build', 'build:docker', 'build:pages --manifest', 'verify:pages']
  let position = -1
  for (const command of commands) {
    assert.ok(scripts[command.split(' ')[0]], `Missing script ${command}`)
    const next = workflow.indexOf(`bun run ${command} `)
    assert.ok(next > position, `Missing or misplaced gate ${command}`)
    position = next
  }
  assert.match(workflow, /shell: bash/) // GitHub's explicit bash uses -e -o pipefail.
  const buildUpload = workflow.indexOf('name: Upload qualified Pages build')
  assert.ok(buildUpload > position)
  assert.match(workflow.slice(buildUpload), /if: \$\{\{ success\(\) && !inputs.publish_pages \}\}[\s\S]*?path: \$\{\{ steps.workspace.outputs.directory \}\}\/dist\/\n          include-hidden-files: true\n          if-no-files-found: error/)
  assert.match(workflow, /name: Upload validation diagnostics\n        if: \$\{\{ always\(\) && steps.workspace.outcome == 'success' \}\}[\s\S]*?path: \$\{\{ steps.workspace.outputs.directory \}\}\/test-results\//)
})

test('Pages qualification command requires the exact manifest and cannot bypass browser checks', () => {
  assert.equal(scripts['verify:pages'], 'bun scripts/verify-static.mjs --pages --require-manifest')
  for (const args of [['--pages', '--base', '/'], ['--pages', '--artifact-only']]) {
    const run = spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/verify-static.mjs', import.meta.url)), ...args], { encoding: 'utf8' })
    assert.notEqual(run.status, 0)
    assert.match(run.stderr, /Use either --pages or --base|--pages requires browser qualification/)
  }
})

test('local production qualification selects the Webblocks profile without Vite reserved mode', () => {
  const step = workflow.split('name: Local production build\n')[1].split('\n      - name:')[0]
  assert.match(step, /WEBBLOCKS_DEPLOYMENT: local\n          WEBBLOCKS_BASE_PATH: '\/'/)
  assert.match(step, /run: bun run build 2>&1 \| tee test-results\/build-local\.log/)
  assert.doesNotMatch(workflow, /--mode(?:=|\s+)['"]?local\b/)
  assert.doesNotMatch(scripts.build, /--mode(?:=|\s+)['"]?local\b/)
})
