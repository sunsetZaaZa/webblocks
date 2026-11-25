import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'

// Explicit file map only; never enumerate arbitrary directories into an archive.
export function makeArchive(files, prefixDir, executables = new Set()) {
  const chunks = []
  for (const path of [...files.keys()].sort()) {
    const name = `${prefixDir}/${path}`, data = files.get(path), header = Buffer.alloc(512)
    let prefix = '', tail = name
    if (name.length > 100) {
      const split = name.lastIndexOf('/')
      prefix = name.slice(0, split); tail = name.slice(split + 1)
    }
    assert.ok(tail.length <= 100 && prefix.length <= 155, `USTAR path too long: ${path}`)
    const put = (value, offset) => header.write(value, offset, 'ascii')
    const oct = (n, width, offset) => { const s = n.toString(8); assert.ok(s.length < width, 'USTAR field overflow'); put(s.padStart(width - 1, '0') + '\0', offset) }
    put(tail, 0); oct(executables.has(path) ? 0o755 : 0o644, 8, 100); oct(0, 8, 108); oct(0, 8, 116); oct(data.length, 12, 124); oct(0, 12, 136)
    header.fill(32, 148, 156); put('0', 156); put('ustar\0', 257); put('00', 263); put(prefix, 345)
    put([...header].reduce((a,b) => a+b, 0).toString(8).padStart(6, '0') + '\0 ', 148)
    chunks.push(header, data, Buffer.alloc((512 - data.length % 512) % 512))
  }
  chunks.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(chunks), { level: 9 })
}
