export const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com'

export const LANDING_POSTHOG_EVENTS = {
  ctaClicked: 'landing_cta_clicked',
  navClicked: 'landing_nav_clicked',
  footerLinkClicked: 'landing_footer_link_clicked',
  sectionViewed: 'landing_section_viewed',
  scrollDepth: 'landing_scroll_depth',
  demoPlayClicked: 'landing_demo_play_clicked',
} as const

export const DOWNLOAD_POSTHOG_EVENTS = {
  buttonClicked: 'download_button_clicked',
  navClicked: 'download_nav_clicked',
  footerLinkClicked: 'download_footer_link_clicked',
  sectionViewed: 'download_section_viewed',
  scrollDepth: 'download_scroll_depth',
} as const

export const LANDING_SECTION_ELEMENT_IDS = ['demo', 'privacy'] as const

export const DOWNLOAD_SECTION_ELEMENT_IDS = ['platforms'] as const

export const LANDING_SCROLL_DEPTH_THRESHOLDS = [25, 50, 75, 100] as const
