import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import WebFall from '../../components/Effects/webfall/webfall'
import FallingSquares from '../../components/Effects/squares/fallingsquares'
import { assetUrl } from '../../utilities/assetUrl'

const meta = { title: 'Effects/Backgrounds', tags: ['test'], parameters: { layout: 'fullscreen' } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const ImageParticles: Story = {
  render: () => (
    <section aria-label="Image particles" className="webblocks-effect-story">
      <WebFall count={5} variants={[{ kind: 'image', srcs: ['duck.png'], minSize: 24, maxSize: 24 }]} />
    </section>
  ),
  play: async ({ canvas, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    const particles = canvas.getByRole('region', { name: 'Image particles' }).querySelectorAll<HTMLElement>('.webfall__item--image')
    await expect(particles).toHaveLength(5)
    for (const particle of particles) await expect(particle.style.backgroundImage).toContain(assetUrl('duck.png'))
    const image = new Image()
    image.src = assetUrl('duck.png')
    await image.decode()
    await expect(image.naturalWidth).toBeGreaterThan(0)
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}

export const Squares: Story = {
  render: () => <section aria-label="Falling squares" className="webblocks-effect-story"><FallingSquares seed={42} mobileCount={6} desktopCount={6} enableParallax={false} /></section>,
  play: async ({ canvas, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    const region = canvas.getByRole('region', { name: 'Falling squares' })
    await expect(region.querySelectorAll('.falling-squares__item')).toHaveLength(6)
    await expect(region.querySelector('.falling-squares')).toHaveAttribute('aria-hidden', 'true')
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}
