import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { sourceArchive, packRelease, verifyRelease } from '../../scripts/pack-release.mjs'
import { createStarter, templateFiles } from '../../scripts/init-site.mjs'
import { validateSiteConfig } from '../../config/site-config.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
function temp(t) { const dir = mkdtempSync(join(tmpdir(), 'wgp-release-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir }
function unpack(bytes) {
  const tar = gunzipSync(bytes), files = new Map()
  for (let offset = 0; offset < tar.length;) {
    const header = tar.subarray(offset, offset + 512); if (header.every(n => n === 0)) break
    const text = (a,b) => header.subarray(a,b).toString('ascii').split('\0')[0]
    const size = parseInt(text(124,136),8), prefix = text(345,500), name = (prefix ? prefix+'/' : '')+text(0,100)
    assert.equal(text(257,263),'ustar'); assert.equal(text(156,157),'0')
    assert.equal(parseInt(text(148,156),8), [...header].reduce((sum,n,i) => sum+(i>=148&&i<156?32:n),0))
    files.set(name.replace(/^webblocks\//,''),tar.subarray(offset+512,offset+512+size))
    offset += 512 + Math.ceil(size/512)*512
  }
  return files
}
test('source release archive is deterministic and preserves the complete framework allowlist', () => {
  const first = sourceArchive(root); assert.deepEqual(first,sourceArchive(root))
  const files = unpack(first)
  assert.deepEqual([...files.keys()], [...templateFiles(root), 'webblocks.config.json','site/content.json'].sort())
  for (const path of templateFiles(root)) assert.deepEqual(files.get(path),readFileSync(join(root,path)),path)
  assert.deepEqual(JSON.parse(files.get('webblocks.config.json')),validateSiteConfig())
})
test('source release excludes customized site files and private unlisted files', t => {
  const dir = temp(t), source = join(dir,'site'); createStarter(source,{owner:'owner',repo:'private-site'},root)
  writeFileSync(join(source,'.env.local'),'private secret'); writeFileSync(join(source,'public/project/private.txt'),'private artwork')
  const files = unpack(sourceArchive(source)); for (const path of ['.env.local','public/project/private.txt','webblocks.defaults.json']) assert.ok(!files.has(path))
  assert.deepEqual(JSON.parse(files.get('webblocks.config.json')),validateSiteConfig())
  assert.deepEqual(files.get('site/content.json'),unpack(sourceArchive(root)).get('site/content.json'))
})
test('release pack creates actual npm and source archives, verifies integrity, refuses overwrite and rejects tampering', t => {
  const dir = temp(t), out = join(dir,'candidate'), report = packRelease(out,root)
  assert.equal(report.status,'candidate-not-production-approved'); assert.deepEqual(verifyRelease(out),report)
  assert.throws(()=>packRelease(out,root),/EEXIST/)
  const file = join(out,report.files[0].name), original = readFileSync(file), altered = Buffer.from(original); altered[10]^=1
  writeFileSync(file,altered); assert.throws(()=>verifyRelease(out),/SHA-256 mismatch/); writeFileSync(file,original)
  writeFileSync(join(out,'unexpected'),'x'); assert.throws(()=>verifyRelease(out),/inventory/)
  assert.ok(existsSync(file))
})
test('release verifier cannot certify a production-approved candidate or follow arbitrary manifest paths', t => {
  const dir = temp(t), out = join(dir,'candidate'); const report = packRelease(out,root), path = join(out,'release.json')
  writeFileSync(path,JSON.stringify({...report,status:'approved'})); assert.throws(()=>verifyRelease(out))
  report.files[0].name='../outside'; writeFileSync(path,JSON.stringify(report)); assert.throws(()=>verifyRelease(out),/inventory/)
})

test('release source and package metadata use the Webblocks identity exclusively', () => {
  const files = unpack(sourceArchive(root))
  const retired = ['wicker', 'blocks'].join('')
  for (const [path, bytes] of files) {
    assert.ok(!path.toLowerCase().includes(retired), path)
    assert.ok(!bytes.toString('latin1').toLowerCase().includes(retired), path)
  }
  assert.equal(JSON.parse(files.get('packaging/package.json')).name, '@webblocks/webblocks')
})
