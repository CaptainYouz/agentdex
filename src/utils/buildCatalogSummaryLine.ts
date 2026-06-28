import type { CatalogSummary } from '@/types/catalog.types'

function formatCount(count: number, singularLabel: string): string {
  const label = count === 1 ? singularLabel : `${singularLabel}s`

  return `${count} ${label}`
}

export function buildCatalogSummaryLine(summary: CatalogSummary): string {
  const skills = formatCount(summary.totalSkills, 'skill')
  const agents = formatCount(summary.totalAgents, 'agent')
  const rules = formatCount(summary.totalRules, 'rule')
  const context = formatCount(summary.totalContext, 'context file')
  const folders = formatCount(summary.projectCount, 'folder')

  return `You have ${skills}, ${agents}, ${rules}, ${context} across ${folders}`
}
