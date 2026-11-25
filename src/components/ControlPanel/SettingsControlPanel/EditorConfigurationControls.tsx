import { useRef, useState, type ChangeEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { siteConfig } from '../../../config/site'
import { decodeEditorConfig, encodeEditorConfig, MAX_EDITOR_CONFIG_BYTES } from '../../../state-management/editor-config.mjs'
import { importEditorConfiguration } from '../../../state-management/slices/AnimationSlice'
import type { RootState } from '../../../state-management/store'

export function EditorConfigurationControls() {
  const dispatch = useDispatch()
  const animation = useSelector((state: RootState) => state.animation)
  const fileInput = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [notice, setNotice] = useState('')

  function exportConfiguration() {
    setNotice('')
    try {
      const raw = encodeEditorConfig(animation, siteConfig.siteId)
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
      const link = document.createElement('a')
      try {
        link.href = url
        link.download = 'webblocks.defaults.json'
        document.body.appendChild(link)
        link.click()
      } finally {
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      setNotice('Configuration download requested. The published website has not changed.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not export editor configuration.')
    }
  }

  async function importConfiguration(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReading(true)
    setNotice('')
    try {
      if (file.size > MAX_EDITOR_CONFIG_BYTES) throw new Error('Editor configuration exceeds the 1 MiB file limit.')
      const raw = await file.text()
      const config = decodeEditorConfig(raw, siteConfig.siteId)
      const count = config.data.characterTracker.reduce((sum, entry) => sum + entry.chars.length, 0)
      if (!window.confirm(`Import ${count} characters and animation settings for ${config.siteId}? This replaces the current roster, settings and any unsaved character draft. Your browser saving preference will not change.`)) {
        setNotice('Import canceled. No changes applied.')
        return
      }
      // The store validates again before applying or saving any data.
      dispatch(importEditorConfiguration(raw))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not import editor configuration.')
    } finally { setReading(false) }
  }

  return <>
    <input type='button' value='Export Website Configuration' disabled={reading} onClick={exportConfiguration} />
    <input type='button' value='Import Website Configuration' disabled={reading} onClick={() => fileInput.current?.click()} />
    <input ref={fileInput} type='file' accept='.json,application/json' aria-label='Website configuration file' disabled={reading} hidden onChange={importConfiguration} />
    {notice && <span role='status' style={{padding: '0 8px'}}>{notice}</span>}
  </>
}
