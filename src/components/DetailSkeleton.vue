<template>
  <div class="detail-skeleton" aria-hidden="true">
    <div class="detail-skeleton__header">
      <div class="ds-title sk-shimmer" />
      <div class="detail-skeleton__meta">
        <div class="ds-chip sk-shimmer" />
        <div class="ds-chip sk-shimmer" />
        <div class="ds-chip sk-shimmer" />
      </div>
    </div>

    <div class="detail-skeleton__divider" />

    <div class="detail-skeleton__body">
      <div
        v-for="line in lineCount"
        :key="line"
        class="ds-line sk-shimmer"
        :class="{ 'ds-line--gap': isParagraphBreak(line) }"
        :style="{ width: lineWidth(line) }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
type DetailSkeletonProps = {
  lineCount?: number
}

const props = withDefaults(defineProps<DetailSkeletonProps>(), {
  lineCount: 10,
})

const LINE_WIDTHS = ['94%', '80%', '88%', '66%', '91%', '74%', '83%', '59%', '86%', '70%']
const PARAGRAPH_BREAKS = new Set([3, 7])

function lineWidth(index: number): string {
  return LINE_WIDTHS[(index - 1) % LINE_WIDTHS.length]
}

function isParagraphBreak(index: number): boolean {
  return index < props.lineCount && PARAGRAPH_BREAKS.has(index)
}
</script>

<style scoped>
.detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  padding: 0.15rem;
}

.detail-skeleton__header {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.ds-title {
  width: 52%;
  height: 1.1rem;
  border-radius: 5px;
}

.detail-skeleton__meta {
  display: flex;
  gap: 0.5rem;
}

.ds-chip {
  width: 4.5rem;
  height: 0.7rem;
  border-radius: 999px;
}

.detail-skeleton__meta .ds-chip:nth-child(2) {
  width: 6rem;
}

.detail-skeleton__meta .ds-chip:nth-child(3) {
  width: 3.5rem;
}

.detail-skeleton__divider {
  height: 1px;
  background: var(--border);
}

.detail-skeleton__body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ds-line {
  height: 0.65rem;
  border-radius: 4px;
}

.ds-line--gap {
  margin-bottom: 0.7rem;
}

.sk-shimmer {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    color-mix(in srgb, var(--border) 55%, var(--text-muted)) 37%,
    var(--border) 63%
  );
  background-size: 200% 100%;
  animation: detail-skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes detail-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk-shimmer {
    animation: none;
  }
}
</style>
