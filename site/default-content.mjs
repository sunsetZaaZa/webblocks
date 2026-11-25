// Original Webblocks demonstration content, separate from the page templates.
export const defaultContent = {
  schemaVersion: 1,
  enabledPages: ['home', 'apps', 'application', 'about', 'privacy', 'libraries', 'softwarePackage'],
  navigation: [
    { page: 'home', label: 'homepage' },
    { page: 'apps', label: 'apps' },
    { page: 'libraries', label: 'software libraries' },
    { page: 'privacy', label: 'user privacy' },
  ],
  pages: {
    home: { heading: 'SOME HEADER', hero: 'a fresh box of cheesy popplers & its hidden action figure with a cherry vanilla soda at an adoni bordain dish smoke off', tagline: 'TACOS' },
    apps: { name: 'app name', description: 'description', icon: 'duck.png', iconAlt: 'app icon', linkLabel: 'app', details: ['detail 1', 'detail 2', 'detail 3'] },
    application: { image: 'duck.png', imageAlt: '', version: '0.0.0', versionLabel: 'Current Version:', privacyLabel: 'User Privacy', statsLabel: 'Stats', stats: '', highlightsLabel: 'Highlights', highlights: '', changelogLabel: 'Changelog', changelog: '' },
    about: { key: 'Template Key', value: 'Template Value', address: 'Template Space' },
    privacy: { heading: 'UserPrivacy', body: '' },
    libraries: { packageLabel: 'package', detailLabel: 'Uses Router Link' },
    softwarePackage: { heading: 'Enquiries', section1: 'SECTION 1', section2: 'SECTION 2', section3: 'SECTION 3', partition: 'A PARTITION' },
  },
}
