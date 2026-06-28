import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv, type Plugin } from 'vite'

import {
  buildPostHogScript,
  DOWNLOAD_PAGE_CONFIG,
  LANDING_PAGE_CONFIG,
  POSTHOG_DEFAULT_HOST,
} from './scripts/posthog-script.utils.mjs'

const docsRoot = dirname(fileURLToPath(import.meta.url))
const posthogPlaceholder = '<!-- AGENTDEX_POSTHOG -->'

function resolvePageConfig(htmlPath: string) {
  return htmlPath.includes('download') ? DOWNLOAD_PAGE_CONFIG : LANDING_PAGE_CONFIG
}

function createPostHogPlugin(mode: string): Plugin {
  return {
    name: 'agentdex-landing-posthog',
    transformIndexHtml(html, context) {
      const environmentVariables = loadEnv(mode, docsRoot, '')
      const posthogKey = environmentVariables.VITE_POSTHOG_KEY ?? ''
      const posthogHost = environmentVariables.VITE_POSTHOG_HOST ?? POSTHOG_DEFAULT_HOST
      const pageConfig = resolvePageConfig(context.path ?? context.filename ?? '')
      const posthogScript = buildPostHogScript(posthogKey, posthogHost, pageConfig)

      return html.replace(posthogPlaceholder, posthogScript)
    },
  }
}

export default defineConfig(({ mode }) => ({
  root: docsRoot,
  plugins: [createPostHogPlugin(mode)],
  server: {
    port: 1422,
    strictPort: true,
    open: '/',
  },
}))
