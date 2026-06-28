/* Agentdex download helper — shared by the landing page and the download page.
 *
 * Detects the visitor's OS (and architecture, best-effort), resolves the
 * matching GitHub Release asset for the latest version, and wires it into the
 * page declaratively:
 *
 *   [data-agentdex-cta="landing|download-page"]  primary download button
 *     [data-agentdex-cta-sub]                     small "for <OS>" line inside it
 *   [data-agentdex-asset="<key>"]                 a per-platform download link
 *   [data-agentdex-detected]                      element whose text becomes the detected platform
 *
 * Asset URLs embed the version, so they are resolved from the GitHub API rather
 * than hardcoded. Every download target resolves to the real installer file:
 * links are upgraded on load, and any click that lands before resolution
 * finishes is intercepted, resolved, then sent straight to the installer — the
 * GitHub Releases page is only ever used as a last resort when no matching
 * asset exists. No data is collected here — only a public, unauthenticated
 * GitHub API read.
 */
;(function setupAgentdexDownload() {
  'use strict'

  const REPO = 'CaptainYouz/agentdex'
  const RELEASES_LATEST_URL = 'https://github.com/' + REPO + '/releases/latest'
  const API_LATEST_URL = 'https://api.github.com/repos/' + REPO + '/releases/latest'
  const DOWNLOAD_PAGE_URL = 'download.html'
  const PLATFORMS_ANCHOR = '#platforms'

  const OS_LABELS = { mac: 'macOS', windows: 'Windows', linux: 'Linux' }

  // Match a release asset by file name. Tauri names embed the version, so we
  // match on extension (+ arch keyword for macOS) rather than a fixed name.
  const ASSET_MATCHERS = {
    'mac-arm64': /(aarch64|arm64)\S*\.dmg$/,
    'mac-x64': /(x64|x86_64|intel)\S*\.dmg$/,
    'mac-universal': /\.dmg$/,
    'windows-exe': /\.exe$/,
    'windows-msi': /\.msi$/,
    'linux-appimage': /\.appimage$/,
    'linux-deb': /\.deb$/,
    'linux-rpm': /\.rpm$/,
  }

  function detectOs() {
    const nav = window.navigator || {}
    const uaData = nav.userAgentData

    if (uaData && uaData.platform) {
      const platform = String(uaData.platform).toLowerCase()
      if (platform.indexOf('mac') !== -1) return 'mac'
      if (platform.indexOf('win') !== -1) return 'windows'
      if (platform.indexOf('linux') !== -1 || platform.indexOf('chrome') !== -1) return 'linux'
    }

    const userAgent = String(nav.userAgent || '').toLowerCase()
    const legacyPlatform = String(nav.platform || '').toLowerCase()

    // Mobile platforms have no desktop build — leave undetected.
    if (/iphone|ipad|ipod|android/.test(userAgent)) return null
    if (/mac/.test(legacyPlatform) || /mac os x/.test(userAgent)) return 'mac'
    if (/win/.test(legacyPlatform) || /windows/.test(userAgent)) return 'windows'
    if (/linux|x11/.test(legacyPlatform) || /linux/.test(userAgent)) return 'linux'
    return null
  }

  // We only ship x64 builds for Windows/Linux, so x64 is a safe default there.
  // macOS architecture is unknowable from a plain user agent → leave null so the
  // visitor picks Apple Silicon vs Intel.
  function defaultArch(os) {
    if (os === 'windows' || os === 'linux') return 'x64'
    return null
  }

  function detectArch(os) {
    const nav = window.navigator || {}
    const userAgent = String(nav.userAgent || '').toLowerCase()

    let archFromUserAgent = null
    if (/aarch64|arm64/.test(userAgent)) archFromUserAgent = 'arm64'
    else if (/x86_64|win64|wow64|amd64|x64/.test(userAgent)) archFromUserAgent = 'x64'

    const uaData = nav.userAgentData
    if (uaData && typeof uaData.getHighEntropyValues === 'function') {
      return uaData
        .getHighEntropyValues(['architecture'])
        .then(function resolveArch(highEntropy) {
          const architecture = String((highEntropy && highEntropy.architecture) || '').toLowerCase()
          if (architecture.indexOf('arm') !== -1) return 'arm64'
          if (architecture.indexOf('x86') !== -1 || architecture.indexOf('x64') !== -1) return 'x64'
          return archFromUserAgent || defaultArch(os)
        })
        .catch(function fallbackArch() {
          return archFromUserAgent || defaultArch(os)
        })
    }

    return Promise.resolve(archFromUserAgent || defaultArch(os))
  }

  let latestReleasePromise = null
  function fetchLatestRelease() {
    if (!latestReleasePromise) {
      latestReleasePromise = window.fetch
        ? fetch(API_LATEST_URL, { headers: { Accept: 'application/vnd.github+json' } })
            .then(function parseRelease(response) {
              return response.ok ? response.json() : null
            })
            .catch(function ignoreFetchError() {
              return null
            })
        : Promise.resolve(null)
    }
    return latestReleasePromise
  }

  function findAsset(release, assetKey) {
    if (!release || !Array.isArray(release.assets)) return null
    const matcher = ASSET_MATCHERS[assetKey]
    if (!matcher) return null
    return (
      release.assets.find(function matchByName(asset) {
        return matcher.test(String(asset.name).toLowerCase())
      }) || null
    )
  }

  function firstMatchingAsset(release, assetKeys) {
    let asset = null
    for (let index = 0; index < assetKeys.length && !asset; index += 1) {
      asset = findAsset(release, assetKeys[index])
    }
    return asset
  }

  // Preferred asset key(s) for a one-click download per OS, most-preferred first.
  // macOS with unknown architecture returns no keys → the visitor chooses.
  // The macOS build is a single universal .dmg (Apple Silicon + Intel), so any
  // Mac resolves to it — arch-specific keys are tried first in case a future
  // build ships per-arch .dmgs.
  function ctaAssetKeys(os, arch) {
    if (os === 'mac') {
      if (arch === 'x64') return ['mac-x64', 'mac-universal']
      if (arch === 'arm64') return ['mac-arm64', 'mac-universal']
      return ['mac-universal']
    }
    if (os === 'windows') return ['windows-exe', 'windows-msi']
    if (os === 'linux') return ['linux-appimage', 'linux-deb', 'linux-rpm']
    return []
  }

  function ctaSubLabel(os, arch) {
    if (os === 'mac') {
      if (arch === 'arm64') return 'for macOS · Apple Silicon'
      if (arch === 'x64') return 'for macOS · Intel'
      return 'for macOS · Apple Silicon & Intel'
    }
    if (os === 'windows') return 'for Windows'
    if (os === 'linux') return 'for Linux'
    return null
  }

  function setText(element, text) {
    if (element) element.textContent = text
  }

  function markDirect(element, asset) {
    element.setAttribute('href', asset.browser_download_url)
    element.setAttribute('download', '')
    element.setAttribute('data-ph-asset', asset.name)
    element.setAttribute('data-ph-resolved', 'direct')
    element.classList.remove('is-unavailable')
  }

  // Ensure a click always ends on the real installer: if the asset has not been
  // resolved yet, intercept, resolve, then navigate straight to the download.
  function bindDirectDownloadOnClick(element, assetKeys, fallbackUrl) {
    element.addEventListener('click', function handleClick(event) {
      if (element.getAttribute('data-ph-resolved') === 'direct') return
      event.preventDefault()
      fetchLatestRelease().then(function navigate(release) {
        const asset = firstMatchingAsset(release, assetKeys)
        window.location.href = asset ? asset.browser_download_url : fallbackUrl
      })
    })
  }

  function initCtaButtons(os, archPromise) {
    const ctaButtons = document.querySelectorAll('[data-agentdex-cta]')
    if (!ctaButtons.length) return

    const osLabel = os ? OS_LABELS[os] : null

    ctaButtons.forEach(function configureCta(cta) {
      const subLine = cta.querySelector('[data-agentdex-cta-sub]')
      const onDownloadPage = cta.getAttribute('data-agentdex-cta') === 'download-page'

      if (os) cta.setAttribute('data-ph-os', os)

      if (!osLabel) {
        if (subLine) subLine.setAttribute('hidden', '')
        cta.setAttribute('href', onDownloadPage ? RELEASES_LATEST_URL : DOWNLOAD_PAGE_URL)
        cta.setAttribute('data-ph-resolved', onDownloadPage ? 'releases' : 'download-page')
        return
      }

      archPromise.then(function resolveCta(arch) {
        if (arch) cta.setAttribute('data-ph-arch', arch)

        const label = ctaSubLabel(os, arch)
        if (subLine && label) {
          setText(subLine, label)
          subLine.removeAttribute('hidden')
        }

        const assetKeys = ctaAssetKeys(os, arch)

        // No direct asset (e.g. macOS, arch unknown) → let the visitor pick.
        if (!assetKeys.length) {
          cta.setAttribute('href', onDownloadPage ? PLATFORMS_ANCHOR : DOWNLOAD_PAGE_URL)
          cta.setAttribute('data-ph-resolved', onDownloadPage ? 'platforms' : 'download-page')
          return
        }

        const fallbackUrl = onDownloadPage ? RELEASES_LATEST_URL : DOWNLOAD_PAGE_URL
        cta.setAttribute('href', fallbackUrl)
        cta.setAttribute('data-ph-resolved', 'pending')

        fetchLatestRelease().then(function applyCtaAsset(release) {
          const asset = firstMatchingAsset(release, assetKeys)
          if (asset) markDirect(cta, asset)
          else cta.setAttribute('data-ph-resolved', onDownloadPage ? 'releases' : 'download-page')
        })

        bindDirectDownloadOnClick(cta, assetKeys, fallbackUrl)
      })
    })
  }

  function initAssetLinks() {
    const assetLinks = document.querySelectorAll('[data-agentdex-asset]')
    if (!assetLinks.length) return

    assetLinks.forEach(function configureAssetLink(link) {
      const assetKey = link.getAttribute('data-agentdex-asset')

      fetchLatestRelease().then(function applyAsset(release) {
        const asset = findAsset(release, assetKey)
        if (asset) {
          markDirect(link, asset)
        } else if (release) {
          // The release exists but has no asset for this target — disable it.
          link.classList.add('is-unavailable')
          link.setAttribute('aria-disabled', 'true')
        }
      })

      link.addEventListener('click', function handleAssetClick(event) {
        if (link.classList.contains('is-unavailable')) {
          event.preventDefault()
          return
        }
        if (link.getAttribute('data-ph-resolved') === 'direct') return
        event.preventDefault()
        fetchLatestRelease().then(function navigate(release) {
          const asset = findAsset(release, assetKey)
          window.location.href = asset ? asset.browser_download_url : RELEASES_LATEST_URL
        })
      })
    })
  }

  function initDetectedLabels(os, archPromise) {
    const labels = document.querySelectorAll('[data-agentdex-detected]')
    if (!labels.length) return

    if (!os) {
      labels.forEach(function setUnknown(label) {
        setText(label, 'your platform')
      })
      return
    }

    archPromise.then(function applyDetected(arch) {
      const text = (ctaSubLabel(os, arch) || ('for ' + OS_LABELS[os])).replace(/^for /, '')
      labels.forEach(function setDetected(label) {
        setText(label, text)
      })
    })
  }

  function init() {
    const os = detectOs()
    const archPromise = os ? detectArch(os) : Promise.resolve(null)
    initCtaButtons(os, archPromise)
    initAssetLinks()
    initDetectedLabels(os, archPromise)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
