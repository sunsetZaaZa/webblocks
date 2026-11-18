import type { Meta, StoryObj } from '@storybook/react-vite'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'

import { SemanticButton } from '../../components/Common/SemanticButton/SemanticButton'
import { setCurrentRosterUISection } from '../../state-management/slices/AnimationSlice'
import { UIBranch, UIBranchText } from '../../state-management/models/UIBranch'
import type { StorybookRootState } from './decorators/withReduxStore'
import { animationStatePatches } from './fixtures/animationStateFixtures'

function StorybookProvidersHarness() {
  const dispatch = useDispatch()
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
      <p>
        Router probe: <Link to="/mobileapps">Mobile apps route</Link>
      </p>
      <SemanticButton
        onClick={() => dispatch(setCurrentRosterUISection(UIBranch.mobileapps))}
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

export const Default: Story = {}
