import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, mkdir, writeFile, readFile, rm, link } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { resolvePagesMetadata } from '../../scripts/pages-metadata.mjs'
import { assertQualifiedArtifact } from '../../scripts/assert-pages-artifact.mjs'
import { inspectArtifact } from '../deployment/support/artifact.mjs'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const caller = read('.github/workflows/deploy-pages.yml')
const workflow = read('.github/workflows/reusable-pages.yml')
const build = read('.github/workflows/reusable-build.yml')
const [orchestrator, deploy] = workflow.split('\n  deploy:\n')
const metadata = (url, path) => ({ PAGES_BASE_URL: url, PAGES_BASE_PATH: path, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2' })

test('Pages metadata normalizes project, root and custom domain paths', () => {
  for (const [url, path, base] of [
    ['https://owner.github.io/project', '/project', '/project/'],
    ['https://owner.github.io/', '', '/'],
    ['https://custom.example', '', '/'],
    ['https://custom.example/project/', '/project/', '/project/'],
    ['https://custom.example/docs/site', '/docs/site', '/docs/site/'],
  ]) {
    const result = resolvePagesMetadata(metadata(url, path))
    assert.equal(result.basePath, base)
    assert.equal(result.baseUrl, new URL(url).origin + base)
    assert.equal(result.artifactName, 'github-pages-123-2')
  }
})

test('metadata fails closed on absent, conflicting or unsafe inputs', () => {
  for (const [url, path] of [
    ['', ''], ['https://owner.github.io/project', ''], ['https://owner.github.io', undefined],
    ['https://owner.github.io/project', '/wrong'], ['https://owner.github.io/a/../project', '/project'],
    ['https://owner.github.io/%2e%2e/project', '/project'], ['https://owner.github.io/#x', ''],
    ['https://owner.github.io/?x=1', ''], ['https://user:pass@owner.github.io', ''],
    ['https:owner.github.io', ''], ['file:///tmp', '/tmp'], ['https://owner.github.io', '/\nmalicious=1'],
  ]) assert.throws(() => resolvePagesMetadata(metadata(url, path)), undefined, `${url} ${path}`)
  assert.throws(() => resolvePagesMetadata({ ...metadata('https://owner.github.io', ''), GITHUB_RUN_ATTEMPT: '1\nother=bad' }), /run identity/)
})

test('metadata CLI writes normalized outputs and diagnostics for the workflow', async t => {
  const cwd = await mkdtemp(join(tmpdir(), 'webblocks-pages-meta-'))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  const output = join(cwd, 'outputs')
  const script = fileURLToPath(new URL('../../scripts/pages-metadata.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [script], { cwd, env: { ...process.env, ...metadata('https://custom.example', ''), GITHUB_OUTPUT: output }, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(await readFile(output, 'utf8'), 'base_path=/\nartifact_name=github-pages-123-2\n')
  assert.equal(JSON.parse(await readFile(join(cwd, 'test-results/pages-metadata.json'), 'utf8')).basePath, '/')
})

test('production workflow isolates publication permissions and rejects PRs and non-default branches', () => {
  assert.match(caller, /^on:\n  push:\n    branches: \['\*\*'\]\n  workflow_dispatch:\n/m)
  assert.match(caller, /^permissions: \{\}$/m)
  assert.match(workflow, /^permissions: \{\}$/m)
  assert.match(workflow, /group: webblocks-pages-\$\{\{ github.ref \}\}\n  cancel-in-progress: false/)
  const branchGuard = "github.ref == format('refs/heads/{0}', github.event.repository.default_branch)"
  for (const source of [caller, orchestrator, build, deploy]) {
    assert.ok(source.includes(branchGuard))
    assert.ok(source.includes("github.event_name == 'push' || github.event_name == 'workflow_dispatch'"))
  }
  assert.match(orchestrator, /permissions:\n      contents: read\n      pages: read/)
  assert.match(orchestrator, /needs: metadata[\s\S]*?permissions:\n      contents: read\n    uses: \.\/\.github\/workflows\/reusable-build.yml/)
  assert.doesNotMatch(build + orchestrator, /pages: write|id-token: write/)
  assert.match(deploy, /needs: build\n    if: \$\{\{ success\(\)/)
  assert.match(deploy, /permissions:\n      contents: read\n      pages: write\n      id-token: write/)
  assert.match(deploy, /environment:\n      name: github-pages\n      url: \$\{\{ steps.deployment.outputs.page_url \}\}/)
  assert.doesNotMatch(deploy, /uses: actions\/checkout|npm |bun scripts/)
  assert.doesNotMatch(caller + workflow, /pull_request|workflow_run:|continue-on-error|secrets\./)
  assert.match(build, /persist-credentials: false/)
  assert.match(orchestrator, /enablement: false/)
  for (const match of workflow.matchAll(/^\s+uses: (\S+)/gm)) assert.match(match[1], /^(?:actions\/[a-z-]+@[a-f0-9]{40}|\.\/\.github\/workflows\/reusable-build.yml)$/)
})

test('production and CI share every validation command, with one base for build and checks', () => {
  assert.match(read('.github/workflows/ci.yml'), /uses: \.\/\.github\/workflows\/reusable-build.yml/)
  assert.match(orchestrator, /publish_pages: true\n      pages_base_url: \$\{\{ needs.metadata.outputs.base_url \}\}\n      pages_base_path: \$\{\{ needs.metadata.outputs.base_path \}\}/)
  const gates = ['bun run test:baseline', 'bun install --frozen-lockfile', 'bun run typecheck', 'bun run lint', 'bun run test:unit', 'bun run pw:install', 'bun run test:storybook ', 'bun run test:storybook-static', 'bun run test:deployment', 'bun run test:static', 'bun run test:routing', 'bun run test:persistence-browser', 'bun run build 2>&1', 'bun run build:docker', 'bun run build:pages --manifest', 'bun run assemble:pages', 'bun run verify:pages', 'bun scripts/assert-pages-artifact.mjs', 'name: Upload qualified Pages artifact']
  let previous = -1
  for (const gate of gates) {
    const next = build.indexOf(gate)
    assert.ok(next > previous, `Missing or out-of-order gate ${gate}`)
    previous = next
  }
  for (const name of ['Repository Pages build', 'Assemble repository Storybook', 'Qualify exact Pages artifact', 'Check qualified artifact has not changed']) {
    const step = build.split(`name: ${name}\n`)[1].split('\n      - name:')[0]
    assert.match(step, /QUALIFIED_BASE_PATH: \$\{\{ steps.metadata.outputs.base_path \}\}/)
    assert.match(step, /export WEBBLOCKS_BASE_PATH="\$QUALIFIED_BASE_PATH"/)
  }
  assert.match(build, /name: Upload qualified Pages artifact\n        if: \$\{\{ success\(\) && inputs.publish_pages \}\}[\s\S]*?uses: actions\/upload-pages-artifact@[a-f0-9]{40}[\s\S]*?name: \$\{\{ steps.metadata.outputs.artifact_name \}\}\n          path: \$\{\{ steps.workspace.outputs.directory \}\}\/dist\/\n          include-hidden-files: true/)
  assert.match(build, /value: \$\{\{ jobs.validate.outputs.artifact_name \}\}/)
  assert.match(build, /artifact_name: \$\{\{ steps.metadata.outputs.artifact_name \}\}/)
  assert.match(deploy, /uses: actions\/deploy-pages@[a-f0-9]{40}[\s\S]*?artifact_name: \$\{\{ needs.build.outputs.artifact_name \}\}/)
  assert.match(build, /name: Upload validation diagnostics\n        if: \$\{\{ always\(\) && steps.workspace.outcome == 'success' \}\}/)
})

test('deployment rejects stale revisions before calling deploy-pages', { skip: process.platform === 'win32' && spawnSync('bash', ['--version']).status !== 0 ? 'Bash unavailable on Windows' : false }, () => {
  const code = deploy.split('        run: |\n')[1].split('\n\n      - name: Deploy')[0].split('\n').map(line => line.slice(10)).join('\n')
  const mock = 'gh() { if [[ "$*" == *"--jq .default_branch" ]]; then echo main; else echo "$MOCK_HEAD"; fi; }\n'
  for (const [ref, sha, head, status] of [['refs/heads/main','abc','abc',0], ['refs/heads/main','abc','def',1], ['refs/heads/feature','abc','abc',1]]) {
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', mock + code], { env: { ...process.env, GITHUB_REF: ref, GITHUB_SHA: sha, MOCK_HEAD: head, GITHUB_REPOSITORY: 'owner/project' }, encoding: 'utf8' })
    assert.equal(result.status, status, result.stderr)
  }
})

async function artifactFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'webblocks-pages-artifact-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, '.vite'))
  await writeFile(join(directory, 'index.html'), '<script type="module" src="/project/main.js"></script>')
  await writeFile(join(directory, 'main.js'), 'console.log(1)')
  await writeFile(join(directory, '.vite/manifest.json'), JSON.stringify({ main: { file: 'main.js', isEntry: true } }))
  const base = '/project/'
  // Synthetic browser report: this tests the gate, not an actual browser.
  const report = { schemaVersion: 1, scope: 'artifact-and-browser', passed: true, base, browser: { status: 'passed' }, storybook: { status: 'disabled' }, errors: [], artifact: await inspectArtifact({ directory, base, requireManifest: true }) }
  return { directory, base, report }
}

test('artifact gate requires full browser report, exact base and unchanged file inventory', async t => {
  const f = await artifactFixture(t)
  assert.equal(await assertQualifiedArtifact(f), 3)
  await assert.rejects(assertQualifiedArtifact({ ...f, report: { ...f.report, scope: 'artifact-only' } }), /browser qualification/)
  await assert.rejects(assertQualifiedArtifact({ ...f, report: { ...f.report, browser: { status: 'not-run' } } }), /browser qualification/)
  await assert.rejects(assertQualifiedArtifact({ ...f, base: '/' }), /base differs/)
  await writeFile(join(f.directory, 'main.js'), 'console.log(2)')
  await assert.rejects(assertQualifiedArtifact(f), /inventory changed/)
  await writeFile(join(f.directory, 'main.js'), 'console.log(1)')
  await writeFile(join(f.directory, 'extra.txt'), 'new')
  await assert.rejects(assertQualifiedArtifact(f), /inventory changed/)
})

test('artifact gate rejects files the Pages packager would exclude and hard links', async t => {
  const f = await artifactFixture(t)
  await mkdir(join(f.directory, '.github'))
  await writeFile(join(f.directory, '.github', 'extra'), 'excluded')
  f.report.artifact = await inspectArtifact({ directory: f.directory, base: f.base, requireManifest: true })
  await assert.rejects(assertQualifiedArtifact(f), /Excluded Git metadata/)
  await rm(join(f.directory, '.github'), { recursive: true })
  await link(join(f.directory, 'main.js'), join(f.directory, 'hard.js'))
  f.report.artifact = await inspectArtifact({ directory: f.directory, base: f.base, requireManifest: true })
  await assert.rejects(assertQualifiedArtifact(f), /Hard-linked file/)
})
