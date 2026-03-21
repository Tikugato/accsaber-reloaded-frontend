<script setup lang="ts">
defineProps<{
  from: { x: number; y: number }
  to: { x: number; y: number }
  opacity: number
}>()
</script>

<template>
  <line class="set-highway" :x1="from.x" :y1="from.y" :x2="to.x" :y2="to.y" :style="{ opacity }" />
</template>

<style scoped>
.set-highway {
  stroke: var(--text-tertiary);
  stroke-width: 1;
  stroke-dasharray: 4 6;
}

@media (prefers-reduced-motion: reduce) {
  .set-highway {
    stroke-dasharray: none;
  }
}
</style>
