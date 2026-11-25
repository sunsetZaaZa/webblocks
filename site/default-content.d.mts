export type PageKey = 'home' | 'apps' | 'application' | 'about' | 'privacy' | 'libraries' | 'softwarePackage'
export interface SiteContent {
  schemaVersion: 1
  enabledPages: PageKey[]
  navigation: { page: PageKey; label: string }[]
  pages: {
    home: { heading: string; hero: string; tagline: string }
    apps: { name: string; description: string; icon: string; iconAlt: string; linkLabel: string; details: string[] }
    application: { image: string; imageAlt: string; version: string; versionLabel: string; privacyLabel: string; statsLabel: string; stats: string; highlightsLabel: string; highlights: string; changelogLabel: string; changelog: string }
    about: { key: string; value: string; address: string }
    privacy: { heading: string; body: string }
    libraries: { packageLabel: string; detailLabel: string }
    softwarePackage: { heading: string; section1: string; section2: string; section3: string; partition: string }
  }
}
export const defaultContent: SiteContent
