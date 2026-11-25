import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { useSelector } from 'react-redux'
import { ControlPanelToggle } from '../../components/ControlPanel/ControlPanelToggle/ControlPanelToggle'
import { ControllerControlPanel } from '../../components/ControlPanel/ControllerControlPanel/ControllerControlPanel'
import type { StorybookRootState } from './decorators/withReduxStore'

function EditorToggleHarness() {
  const open = useSelector((state: StorybookRootState) => state.animation.openControlPanel)
  return <section aria-label="Editor toggle story"><ControlPanelToggle showOpen={open} /><p>{open ? 'Editor open' : 'Editor closed'}</p></section>
}

const meta = { title: 'Editor/Animation Controls', tags: ['test'] } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const EditorToggle: Story = {
  render: () => <EditorToggleHarness />,
  play: async ({ canvas, userEvent, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    const button = () => canvas.getByRole('button', { name: 'Editor Panel' })
    await expect(canvas.getByText('Editor closed')).toBeVisible()
    await userEvent.click(button())
    await expect(await canvas.findByText('Editor open', { exact: true }, { timeout: 5000 })).toBeVisible()
    await userEvent.click(button())
    await expect(await canvas.findByText('Editor closed', { exact: true }, { timeout: 5000 })).toBeVisible()
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}

// The playback reducers are stubs in this source. Test accessible controls
// and decoded artwork, not playback semantics that do not exist yet.
export const PlaybackArtwork: Story = {
  render: () => <section aria-label="Playback controls" style={{ paddingTop: 50 }}><ControllerControlPanel /></section>,
  play: async ({ canvas, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    for (const label of ['Play animation', 'Pause animation', 'Reset animation', 'Stop animation']) {
      const button = canvas.getByRole('button', { name: label })
      await expect(button).toBeVisible()
      const image = button.querySelector('img')!
      await image.decode()
      await expect(image.naturalWidth).toBeGreaterThan(0)
    }
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}
