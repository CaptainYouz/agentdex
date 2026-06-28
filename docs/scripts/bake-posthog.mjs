import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildPostHogScript,
  DOWNLOAD_PAGE_CONFIG,
  LANDING_PAGE_CONFIG,
  POSTHOG_DEFAULT_HOST,
} from './posthog-script.utils.mjs'

const docsRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const posthogPlaceholder = '<!-- AGENTDEX_POSTHOG -->'

const pagesToBake = [
  { label: 'index.html', fileName: 'index.html', pageConfig: LANDING_PAGE_CONFIG },
  { label: 'download.html', fileName: 'download.html', pageConfig: DOWNLOAD_PAGE_CONFIG },
]

function loadEnvironmentVariables() {
  const environmentFilePath = join(docsRoot, '.env.production')
  const environmentVariables = {}

  try {
    const environmentFileContent = readFileSync(environmentFilePath, 'utf8')

    for (const line of environmentFileContent.split('\n')) {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmedLine.indexOf('=')

      if (separatorIndex === -1) {
        continue
      }

      const variableName = trimmedLine.slice(0, separatorIndex).trim()
      const variableValue = trimmedLine.slice(separatorIndex + 1).trim()
      environmentVariables[variableName] = variableValue
    }
  } catch {
    console.warn('[landing] docs/.env.production not found — PostHog will not be baked into index.html')
  }

  return environmentVariables
}

function bakePostHogIntoPages() {
  const environmentVariables = loadEnvironmentVariables()
  const posthogKey = environmentVariables.VITE_POSTHOG_KEY ?? process.env.VITE_POSTHOG_KEY ?? ''
  const posthogHost =
    environmentVariables.VITE_POSTHOG_HOST ?? process.env.VITE_POSTHOG_HOST ?? POSTHOG_DEFAULT_HOST

  for (const page of pagesToBake) {
    const pageHtmlPath = join(docsRoot, page.fileName)
    const pageHtml = readFileSync(pageHtmlPath, 'utf8')

    if (!pageHtml.includes(posthogPlaceholder)) {
      console.warn(`[landing] PostHog placeholder missing from docs/${page.label}`)
      continue
    }

    const posthogScript = buildPostHogScript(posthogKey, posthogHost, page.pageConfig)
    const bakedHtml = pageHtml.replace(posthogPlaceholder, posthogScript)

    writeFileSync(pageHtmlPath, bakedHtml, 'utf8')
    console.log(
      posthogKey
        ? `[landing] PostHog baked into docs/${page.label}`
        : `[landing] PostHog key missing — placeholder cleared in docs/${page.label}`,
    )
  }
}

bakePostHogIntoPages()
