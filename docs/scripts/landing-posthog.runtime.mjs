(function initLandingPostHogTracking() {
  const pageConfig = window.__AGENTDEX_POSTHOG_PAGE__

  if (!pageConfig || typeof posthog === 'undefined') {
    return
  }

  const capturedSections = new Set()
  const capturedScrollDepths = new Set()

  function captureEvent(eventName, properties) {
    posthog.capture(eventName, properties)
  }

  function readDataPhProperties(element) {
    const properties = {}

    for (const attribute of element.attributes) {
      if (!attribute.name.startsWith('data-ph-') || attribute.name === 'data-ph-event') {
        continue
      }

      const propertyName = attribute.name.slice('data-ph-'.length)
      properties[propertyName] = attribute.value
    }

    return properties
  }

  function registerUtmParameters() {
    const searchParameters = new URLSearchParams(window.location.search)
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    const utmProperties = {}

    for (const utmKey of utmKeys) {
      const utmValue = searchParameters.get(utmKey)

      if (utmValue) {
        utmProperties[utmKey] = utmValue
      }
    }

    if (Object.keys(utmProperties).length === 0) {
      return
    }

    posthog.register_once(utmProperties)
  }

  function captureLandingPageView() {
    captureEvent('$pageview', {
      path: pageConfig.path,
      locale: pageConfig.locale,
      page_type: pageConfig.pageType,
    })
  }

  function bindClickTracking() {
    document.addEventListener(
      'click',
      function handleLandingAnalyticsClick(event) {
        const trackedElement = event.target.closest('[data-ph-event]')

        if (!trackedElement) {
          return
        }

        const eventName = trackedElement.getAttribute('data-ph-event')

        if (!eventName) {
          return
        }

        captureEvent(eventName, {
          locale: pageConfig.locale,
          page_type: pageConfig.pageType,
          path: pageConfig.path,
          ...readDataPhProperties(trackedElement),
        })
      },
      true,
    )
  }

  function bindSectionViewTracking() {
    if (!('IntersectionObserver' in window)) {
      return
    }

    const sectionObserver = new IntersectionObserver(
      function handleSectionIntersection(entries) {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
            continue
          }

          const sectionId = entry.target.id

          if (!sectionId || capturedSections.has(sectionId)) {
            continue
          }

          capturedSections.add(sectionId)
          captureEvent(pageConfig.pageType + '_section_viewed', {
            locale: pageConfig.locale,
            section: sectionId,
            path: pageConfig.path,
          })
        }
      },
      { threshold: [0.4] },
    )

    for (const sectionId of pageConfig.sectionIds ?? []) {
      const sectionElement = document.getElementById(sectionId)

      if (sectionElement) {
        sectionObserver.observe(sectionElement)
      }
    }
  }

  function bindScrollDepthTracking() {
    const scrollThresholds = pageConfig.scrollDepthThresholds ?? [25, 50, 75, 100]

    function captureScrollDepth() {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight

      if (scrollableHeight <= 0) {
        return
      }

      const scrollPercent = Math.round((window.scrollY / scrollableHeight) * 100)

      for (const threshold of scrollThresholds) {
        if (scrollPercent < threshold || capturedScrollDepths.has(threshold)) {
          continue
        }

        capturedScrollDepths.add(threshold)
        captureEvent(pageConfig.pageType + '_scroll_depth', {
          locale: pageConfig.locale,
          depth_percent: threshold,
          path: pageConfig.path,
        })
      }
    }

    window.addEventListener('scroll', captureScrollDepth, { passive: true })
  }

  posthog.register({
    locale: pageConfig.locale,
    page_type: pageConfig.pageType,
    product: 'agentdex',
  })

  registerUtmParameters()
  captureLandingPageView()
  bindClickTracking()
  bindSectionViewTracking()
  bindScrollDepthTracking()
})()
