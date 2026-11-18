import type { HotkeyCarouselProp } from '../../../components/HotkeyCarousel/HotkeyCarousel'
import type { UIGenericHotkeyProp } from '../../../components/UISectionHotkeys/HotkeyUtil'
import { setCurrentRosterUISection } from '../../../state-management/slices/AnimationSlice'
import { UIBranch } from '../../../state-management/models/UIBranch'

export const hotkeyButtonFixtures = [
  {
    buttonText: 'Homepage',
    hoverText: 'Fixture route: Homepage',
    uiBranch: UIBranch.homepage,
    hoverElStyle: {},
    btnOnClick: () => setCurrentRosterUISection(UIBranch.homepage),
  },
  {
    buttonText: 'Mobile App',
    hoverText: 'Fixture route: Mobile App',
    uiBranch: UIBranch.mobileapps,
    hoverElStyle: {},
    btnOnClick: () => setCurrentRosterUISection(UIBranch.mobileapps),
  },
  {
    buttonText: 'Libraries',
    hoverText: 'Fixture route: Libraries',
    uiBranch: UIBranch.libraries,
    hoverElStyle: {},
    btnOnClick: () => setCurrentRosterUISection(UIBranch.libraries),
  },
  {
    buttonText: 'Contact',
    hoverText: 'Fixture route: Contact',
    uiBranch: UIBranch.contact,
    hoverElStyle: {},
    btnOnClick: () => setCurrentRosterUISection(UIBranch.contact),
  },
] satisfies UIGenericHotkeyProp[]

export const disabledHotkeyFixture = {
  buttonText: 'Disabled',
  hoverText: 'No action is attached to this fixture.',
  hoverElStyle: {},
} satisfies UIGenericHotkeyProp

export const hotkeyCarouselFixtures = {
  default: {
    btns: hotkeyButtonFixtures,
    viewSize: 2,
    mapping: new Map([
      [UIBranch.homepage, [{ uiSection: UIBranch.homepage, text: 'Homepage' }]],
      [
        UIBranch.mobileapps,
        [
          { uiSection: UIBranch.mobileapps, text: 'Mobile Apps' },
          { uiSection: UIBranch.contactEstafette, text: 'Contact Estafette' },
        ],
      ],
      [UIBranch.libraries, [{ uiSection: UIBranch.libraries, text: 'Libraries' }]],
      [UIBranch.contact, [{ uiSection: UIBranch.contact, text: 'Contact' }]],
    ]),
  },
} satisfies Record<string, HotkeyCarouselProp>
