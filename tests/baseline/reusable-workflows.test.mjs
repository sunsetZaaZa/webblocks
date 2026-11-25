import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const read = name => readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8')
const build = read('reusable-build'), pages = read('reusable-pages'), ci = read('ci'), caller = read('deploy-pages')
const noBash = spawnSync('bash', ['--version']).status !== 0
const step = name => build.split(`      - name: ${name}\n`)[1].split('\n      - name:')[0]
const script = name => step(name).split('        run: |\n')[1].split('\n').filter(line => line.startsWith('          ') || line === '').map(line => line.slice(10)).join('\n').trimEnd()
const run = (code, cwd, env) => spawnSync('bash', ['-e', '-o', 'pipefail', '-c', code], { cwd, env: { ...process.env, ...env }, encoding: 'utf8' })
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'webblocks-workflows-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
function site(dir) {
  mkdirSync(dir, { recursive: true })
  for (const name of ['.bun-version', 'bunfig.toml', 'package.json', 'bun.lock', 'webblocks.config.json']) writeFileSync(join(dir, name), 'fixture')
}

test('local callers use same-commit reusable workflows with typed directory inputs', () => {
  for (const source of [build, pages]) {
    assert.match(source, /^on:\n  workflow_call:\n    inputs:\n      working_directory:\n[^\n]+\n        type: string\n        default: '\.'/m)
    assert.doesNotMatch(source, /workflow_dispatch:\n|pull_request_target|secrets: inherit|continue-on-error/)
  }
  assert.match(ci, /uses: \.\/\.github\/workflows\/reusable-build.yml/)
  assert.match(caller, /uses: \.\/\.github\/workflows\/reusable-pages.yml/)
  assert.match(pages, /uses: \.\/\.github\/workflows\/reusable-build.yml/)
  for (const source of [ci, caller]) assert.match(source, /working_directory: \$\{\{ vars.WEBBLOCKS_WORKING_DIRECTORY \|\| '\.' \}\}/)
  assert.doesNotMatch(caller, /concurrency:/) // Avoid self-cancellation/deadlock with called workflow.
  assert.match(pages, /group: webblocks-pages-\$\{\{ github.ref \}\}\n  cancel-in-progress: false/)
})

test('all executable steps and artifact paths use the validated site directory', () => {
  const steps = build.split('\n      - name: ').slice(1)
  for (const item of steps.filter(s => /^        run:/m.test(s))) {
    assert.ok(item.includes(item.startsWith('Validate Webblocks working directory') ? 'working-directory: .' : 'working-directory: ${{ steps.workspace.outputs.directory }}'), item)
  }
  assert.match(build, /bun-version-file: \$\{\{ steps.workspace.outputs.directory \}\}\/\.bun-version/)
  assert.equal([...build.matchAll(/path: \$\{\{ steps.workspace.outputs.directory \}\}\/dist\//g)].length, 2)
  assert.match(build, /path: \$\{\{ steps.workspace.outputs.directory \}\}\/test-results\//)
  assert.match(step('Upload validation diagnostics'), /always\(\) && steps.workspace.outcome == 'success'/)
  assert.doesNotMatch(build, /run:.*\$\{\{ inputs\./)
})

test('working directory guard accepts root and nested installations without changing the public URL', { skip: noBash }, t => {
  const root = fixture(t); site(root); site(join(root, 'docs', 'webblocks'))
  const output = join(root, 'output')
  for (const directory of ['.', 'docs/webblocks']) {
    writeFileSync(output, '')
    const result = run(script('Validate Webblocks working directory'), root, { SITE_DIRECTORY: directory, GITHUB_OUTPUT: output })
    assert.equal(result.status, 0, result.stderr + result.stdout)
    assert.equal(readFileSync(output, 'utf8'), `directory=${directory}\n`)
  }
  assert.doesNotMatch(build, /WEBBLOCKS_BASE_PATH=.*(?:SITE_DIRECTORY|working_directory)/)
})

test('working directory guard refuses unsafe paths, missing projects and shell metacharacters', { skip: noBash }, t => {
  const root = fixture(t); site(root); mkdirSync(join(root, 'empty'))
  const output = join(root, 'output')
  for (const directory of ['', '/', '/tmp', '..', './docs', 'docs/../site', 'docs//webblocks', 'docs/', '.git', 'empty', 'nonexistent', 'a\\b', 'docs with space', '$(touch injected)', 'x\nother=value']) {
    writeFileSync(output, '')
    const result = run(script('Validate Webblocks working directory'), root, { SITE_DIRECTORY: directory, GITHUB_OUTPUT: output })
    assert.notEqual(result.status, 0, directory)
    assert.equal(readFileSync(output, 'utf8'), '')
  }
  assert.equal(existsSync(join(root, 'injected')), false)
})

test('working directory guard rejects linked directories and linked required files', { skip: noBash || process.platform === 'win32' }, t => {
  const root = fixture(t); site(join(root, 'real')); symlinkSync(join(root, 'real'), join(root, 'linked'))
  const output = join(root, 'output')
  for (const directory of ['linked', 'linked/child']) {
    assert.notEqual(run(script('Validate Webblocks working directory'), root, { SITE_DIRECTORY: directory, GITHUB_OUTPUT: output }).status, 0)
  }
  rmSync(join(root, 'real', '.bun-version')); symlinkSync(join(root, 'real', 'package.json'), join(root, 'real', '.bun-version'))
  assert.notEqual(run(script('Validate Webblocks working directory'), root, { SITE_DIRECTORY: 'real', GITHUB_OUTPUT: output }).status, 0)
  assert.equal(existsSync(output), false)
})

test('Pages build commands use identical production metadata and preserve normal CI base resolution', { skip: noBash }, t => {
  const root = fixture(t); const nested = join(root, 'website'); mkdirSync(join(nested, 'test-results'), { recursive: true })
  const mock = 'bun() { printf "%s|%s|%s\\n" "$PWD" "${WEBBLOCKS_BASE_PATH-unset}" "$*"; }\n'
  for (const name of ['Repository Pages build', 'Assemble repository Storybook', 'Qualify exact Pages artifact', 'Check qualified artifact has not changed']) {
    for (const [publish, base, expected] of [['true', '/', '/'], ['true', '/project/', '/project/'], ['false', '', 'auto']]) {
      const result = run(mock + script(name), nested, { PUBLISH_PAGES: publish, QUALIFIED_BASE_PATH: base, WEBBLOCKS_BASE_PATH: 'auto' })
      assert.equal(result.status, 0, result.stderr)
      const [actualDirectory, actualBase] = result.stdout.trimEnd().split('|')
      // Bun on macOS may return /var/... for tmpdir() while bash reports
      // the same directory as /private/var/... . Compare physical paths.
      assert.equal(realpathSync(actualDirectory), realpathSync(nested), result.stdout)
      assert.equal(actualBase, expected, result.stdout)
    }
  }
  const failure = run('bun() { return 9; }\n' + script('Repository Pages build'), nested, { PUBLISH_PAGES: 'true', QUALIFIED_BASE_PATH: '/project/' })
  assert.equal(failure.status, 9) // tee must not hide the failure.
})

test('production grants write permissions only to publication, with named outputs and no duplicate validation', () => {
  assert.match(pages, /metadata:[\s\S]+?pages: read/)
  assert.match(pages, /build:\n[\s\S]+?needs: metadata[\s\S]+?permissions:\n      contents: read\n    uses: /)
  assert.match(pages, /deploy:\n[\s\S]+?needs: build[\s\S]+?pages: write\n      id-token: write/)
  assert.match(pages, /value: \$\{\{ jobs.deploy.outputs.page_url \}\}/)
  assert.match(pages, /artifact_name: \$\{\{ needs.build.outputs.artifact_name \}\}/)
  assert.doesNotMatch(pages + ci + caller, /bun (?:run|install)/)
  assert.doesNotMatch(build, /pages: write|id-token: write/)
  assert.match(build, /if: \$\{\{ success\(\) && !inputs.publish_pages \}\}/)
  assert.match(build, /if: \$\{\{ success\(\) && inputs.publish_pages \}\}/)
})
