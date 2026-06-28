import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function stripFrontmatter(content: string): string {
  const trimmedContent = content.trimStart()
  if (!trimmedContent.startsWith('---')) {
    return content
  }

  const afterOpening = trimmedContent.slice(3)
  const closingIndex = afterOpening.indexOf('\n---')
  if (closingIndex === -1) {
    return content
  }

  return afterOpening.slice(closingIndex + 4).trimStart()
}

export function renderMarkdown(content: string): string {
  const markdownBody = stripFrontmatter(content)
  return marked.parse(markdownBody, { async: false }) as string
}
