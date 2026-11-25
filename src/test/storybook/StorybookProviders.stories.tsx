import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router'

import { SemanticButton } from '../../components/Common/SemanticButton/SemanticButton'
import { setCurrentRosterUISection } from '../../state-management/slices/AnimationSlice'
import { UIBranch, UIBranchText } from '../../state-management/models/UIBranch'
import type { StorybookRootState } from './decorators/withReduxStore'
import { animationStatePatches } from './fixtures/animationStateFixtures'

function StorybookProvidersHarness() {
  const dispatch = useDispatch()
  const location = useLocation()
  const rosterPage = useSelector(
    (state: StorybookRootState) => state.animation.rosterPage,
  )
  const selectedCharacter = useSelector(
    (state: StorybookRootState) =>
      state.animation.charSheetFields.character.identifier,
  )
  const rosterCount = useSelector(
    (state: StorybookRootState) =>
      state.animation.characterTracker.find((entry) => entry.page === rosterPage)
        ?.chars.length ?? 0,
  )

  return (
    <section aria-label="Storybook provider harness">
      <h1>Storybook providers ready</h1>
      <p>
        Roster page: <strong>{UIBranchText.get(rosterPage)}</strong>
      </p>
      <p>
        Selected character: <strong>{selectedCharacter || 'none'}</strong>
      </p>
      <p>
        Characters on active page: <strong>{rosterCount}</strong>
      </p>
      <p>Current route: <strong>{location.pathname}</strong></p>
      <p>
        Router probe: <Link to="/apps">Mobile apps route</Link>
      </p>
      <SemanticButton
        onClick={() => dispatch(setCurrentRosterUISection(UIBranch.apps))}
        variant="action"
      >
        Switch roster page
      </SemanticButton>
    </section>
  )
}

const meta = {
  title: 'Project/Test Providers',
  component: StorybookProvidersHarness,
  parameters: {
    layout: 'padded',
    redux: {
      animationState: animationStatePatches.rosterEditor,
    },
    router: {
      initialEntries: ['/storybook/provider-harness'],
    },
  },
  tags: ['test'],
} satisfies Meta<typeof StorybookProvidersHarness>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent, canvasElement }) => {
    canvasElement.removeAttribute('data-webblocks-play-complete')
    await expect(canvas.getByRole('heading', { name: 'Storybook providers ready' })).toBeVisible()
    await expect(canvas.getByText('Homepage', { exact: true })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Mobile apps route' })).toHaveAttribute('href', '/apps')
    await expect(canvas.getByText('/storybook/provider-harness', { exact: true })).toBeVisible()
    await userEvent.click(canvas.getByRole('link', { name: 'Mobile apps route' }))
    // MemoryRouter can commit its navigation in a React transition after click resolves.
    // Await the actual route change; never retry the click or substitute a navigation.
    await expect(await canvas.findByText('/apps', { exact: true }, { timeout: 5000 })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Switch roster page' }))
    await expect(await canvas.findByText('Mobile App', { exact: true }, { timeout: 5000 })).toBeVisible()
    canvasElement.setAttribute('data-webblocks-play-complete', 'passed')
  },
}
