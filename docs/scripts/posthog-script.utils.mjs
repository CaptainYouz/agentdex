import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com'

export const LANDING_SECTION_ELEMENT_IDS = ['demo', 'privacy']

export const LANDING_SCROLL_DEPTH_THRESHOLDS = [25, 50, 75, 100]

export const LANDING_PAGE_CONFIG = {
  locale: 'en',
  pageType: 'landing',
  path: '/',
  sectionIds: LANDING_SECTION_ELEMENT_IDS,
  scrollDepthThresholds: LANDING_SCROLL_DEPTH_THRESHOLDS,
}

export const DOWNLOAD_PAGE_CONFIG = {
  locale: 'en',
  pageType: 'download',
  path: '/download.html',
  sectionIds: ['platforms'],
  scrollDepthThresholds: LANDING_SCROLL_DEPTH_THRESHOLDS,
}

const POSTHOG_LOADER_SNIPPET = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);`

function readPostHogRuntimeScript() {
  const runtimeScriptPath = join(docsRoot, 'scripts', 'landing-posthog.runtime.mjs')
  return readFileSync(runtimeScriptPath, 'utf8')
}

export function buildPostHogScript(
  posthogKey,
  posthogHost = POSTHOG_DEFAULT_HOST,
  pageConfig = LANDING_PAGE_CONFIG,
) {
  if (!posthogKey) {
    return ''
  }

  const pageConfigJson = JSON.stringify(pageConfig)

  const runtimeScript = readPostHogRuntimeScript()

  return `
    <script>
      ${POSTHOG_LOADER_SNIPPET}
      window.__AGENTDEX_POSTHOG_PAGE__ = ${pageConfigJson};
      posthog.init('${posthogKey}', {
        api_host: '${posthogHost}',
        person_profiles: 'identified_only',
        capture_pageview: false
      });
    </script>
    <script>${runtimeScript}</script>`.trim()
}
