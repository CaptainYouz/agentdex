<template>
  <div class="catalog-skeleton" aria-hidden="true">
    <div
      v-for="group in groupCount"
      :key="group"
      class="skeleton-group"
    >
      <div class="skeleton-heading skeleton-shimmer" />
      <div
        v-for="row in rowsPerGroup"
        :key="row"
        class="skeleton-row"
      >
        <div class="skeleton-row__icon skeleton-shimmer" />
        <div class="skeleton-row__lines">
          <div class="skeleton-bar skeleton-bar--title skeleton-shimmer" />
          <div class="skeleton-bar skeleton-bar--sub skeleton-shimmer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type CatalogSkeletonProps = {
  groupCount?: number
  rowsPerGroup?: number
}

withDefaults(defineProps<CatalogSkeletonProps>(), {
  groupCount: 3,
  rowsPerGroup: 4,
})
</script>

<style scoped>
.catalog-skeleton {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-heading {
  width: 38%;
  height: 0.7rem;
  border-radius: 4px;
}

.skeleton-group:nth-child(2) .skeleton-heading {
  width: 28%;
}

.skeleton-group:nth-child(3) .skeleton-heading {
  width: 44%;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.15rem;
}

.skeleton-row__icon {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 5px;
  flex-shrink: 0;
}

.skeleton-row__lines {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.skeleton-bar {
  height: 0.65rem;
  border-radius: 4px;
}

.skeleton-bar--title {
  width: 65%;
}

.skeleton-row:nth-child(3n) .skeleton-bar--title {
  width: 52%;
}

.skeleton-row:nth-child(3n + 1) .skeleton-bar--title {
  width: 72%;
}

.skeleton-bar--sub {
  width: 40%;
  height: 0.55rem;
}

.skeleton-row:nth-child(2n) .skeleton-bar--sub {
  width: 30%;
}

/* Shimmering placeholder fill */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    color-mix(in srgb, var(--border) 55%, var(--text-muted)) 37%,
    var(--border) 63%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
  }
}
</style>
