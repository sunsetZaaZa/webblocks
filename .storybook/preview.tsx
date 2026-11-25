import type { Decorator, Preview } from '@storybook/react-vite'
import { STORY_FINISHED, type StoryFinishedPayload } from 'storybook/internal/core-events'
import { addons } from 'storybook/preview-api'
import { withReduxStore } from '../src/test/storybook/decorators/withReduxStore'
import { withRouter } from '../src/test/storybook/decorators/withRouter'
import '../src/index.css'
import './preview.css'

const withPressedRootSurface: Decorator = (Story) => (
  <div className="webblocks-story-surface"><Story /></div>
)

const preview: Preview = {
  decorators: [withReduxStore, withRouter, withPressedRootSurface],
  // Storybook 10.6.8 emits STORY_FINISHED only after its afterEach hooks,
  // including the asynchronous accessibility scan. Observe, do not replace it.
  beforeEach: ({ id, viewMode }) => {
    if (viewMode !== 'story') return
    const root = document.documentElement
    root.removeAttribute('data-webblocks-story-finished')
    root.removeAttribute('data-webblocks-story-result')
    const channel = addons.getChannel()
    const finished = (payload: StoryFinishedPayload) => {
      if (payload.storyId !== id) return
      const reporters = payload.reporters.map(report => {
        const result = report.result as { violations?: { id: string }[]; error?: { message?: string } } | undefined
        return { type: report.type, status: report.status,
          violations: result?.violations?.map(violation => violation.id), error: result?.error?.message }
      })
      root.setAttribute('data-webblocks-story-result', JSON.stringify({ storyId: id, status: payload.status, reporters }))
      root.setAttribute('data-webblocks-story-finished', id)
    }
    channel.on(STORY_FINISHED, finished)
    return () => { channel.off(STORY_FINISHED, finished) }
  },
  parameters: {
    layout: 'centered',
    backgrounds: {
      options: {
        dark: { name: 'Pressed Root Dark', value: '#242424' },
      },
    },
    controls: { expanded: true, sort: 'requiredFirst' },
    a11y: { test: 'error' },
    viewport: {
      options: {
        desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        pixel5: { name: 'Pixel 5', styles: { width: '393px', height: '851px' } },
        iphone13: { name: 'iPhone 13', styles: { width: '390px', height: '844px' } },
      },
    },
  },
  initialGlobals: { backgrounds: { value: 'dark' } },
}

export default preview
