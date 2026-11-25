import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { Blimp } from '../../components/Characters/Blimp/Blimp'
import { Crunch } from '../../components/Characters/Crunch/Crunch'
import { characterFixtures } from './fixtures/characterFixtures'
import { assetUrl } from '../../utilities/assetUrl'

const meta = {
  title: 'Characters/Artwork',
  tags: ['test'],
  parameters: { layout: 'padded' },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Orientations: Story = {
  render: () => (
    <section aria-label="Character orientations" style={{ display: 'flex', gap: 24 }}>
      <Crunch info={{ ...characterFixtures.templateCrunch, currentX: 0, currentY: 0 }} />
      <Blimp info={{ ...characterFixtures.rightFacingBlimp, currentX: 0, currentY: 0 }} />
      <Blimp info={{ ...characterFixtures.appsBlimp, currentX: 0, currentY: 0 }} />
    </section>
  ),
  play: async ({ canvas, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    const images = canvas.getAllByRole('img')
    const paths = ['characters/crunch_norm_right_web.png', 'characters/blimp_cover_norm_web.png', 'characters/blimp_reversed_cover_norm_web.png']
    await expect(images).toHaveLength(paths.length)
    for (const [index, path] of paths.entries()) {
      await expect(images[index]).toHaveAttribute('src', assetUrl(path))
      const image = images[index] as HTMLImageElement
      await image.decode()
      await expect(image.naturalWidth).toBeGreaterThan(0)
    }
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}

export const SpeakingCharacter: Story = {
  render: () => (
    <section aria-label="Speaking character" style={{ position: 'relative', width: 320, height: 160 }}>
      <Crunch info={characterFixtures.speakingCrunch} />
    </section>
  ),
  play: async ({ canvas, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    const region = canvas.getByRole('region', { name: 'Speaking character' })
    const image = canvas.getByRole('img', { name: 'Crunch character' }) as HTMLImageElement
    const bubble = canvas.getByText(characterFixtures.speakingCrunch.speaking!)
    region.removeAttribute('data-webblocks-speaking-play')
    await image.decode()
    // Explicit DOM transitions do not depend on the pointer position inherited
    // from a previous story or reload. React derives enter/leave from over/out.
    // The static browser qualifier additionally exercises real pointer movement.
    const mouse = (type: 'mouseover' | 'mouseout') => image.dispatchEvent(
      new MouseEvent(type, { bubbles: true, relatedTarget: type === 'mouseout' ? region : null }),
    )
    const touch = (type: 'touchstart' | 'touchend' | 'touchcancel') => image.dispatchEvent(
      new Event(type, { bubbles: true }),
    )
    mouse('mouseout')
    await expect(bubble).not.toBeVisible()
    mouse('mouseover')
    await expect(bubble).toBeVisible()
    mouse('mouseout')
    await expect(bubble).not.toBeVisible()
    touch('touchstart')
    await expect(bubble).toBeVisible()
    touch('touchend')
    await expect(bubble).not.toBeVisible()
    touch('touchstart')
    await expect(bubble).toBeVisible()
    touch('touchcancel')
    await expect(bubble).not.toBeVisible()
    region.setAttribute('data-webblocks-speaking-play', 'passed')
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}

const selectCharacter = fn()
export const InteractiveCharacter: Story = {
  render: () => <Crunch info={{ ...characterFixtures.templateCrunch, currentX: 0, currentY: 0 }} onClick={selectCharacter} />,
  play: async ({ canvas, userEvent, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    selectCharacter.mockClear()
    const button = canvas.getByRole('button', { name: 'Crunch character' })
    await userEvent.click(button)
    await expect(selectCharacter).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Enter}')
    await expect(selectCharacter).toHaveBeenCalledTimes(2)
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}
