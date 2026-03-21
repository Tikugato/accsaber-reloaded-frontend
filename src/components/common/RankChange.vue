<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  invert?: boolean
}>()

const delta = computed(() => props.invert ? -props.value : props.value)

const stateClass = computed(() => {
  if (delta.value > 0) return 'rank-change--up'
  if (delta.value < 0) return 'rank-change--down'
  return 'rank-change--neutral'
})

const display = computed(() => {
  if (delta.value === 0) return '\u2014'
  const arrow = delta.value > 0 ? '\u25B2' : '\u25BC'
  const sign = delta.value > 0 ? '+' : ''
  return `${arrow} ${sign}${delta.value}`
})
</script>

<template>
  <span class="rank-change" :class="stateClass">{{ display }}</span>
</template>

<style scoped>
.rank-change {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  white-space: nowrap;
}

.rank-change--up {
  color: var(--success);
}

.rank-change--down {
  color: var(--error);
}

.rank-change--neutral {
  color: var(--text-tertiary);
}
</style>
