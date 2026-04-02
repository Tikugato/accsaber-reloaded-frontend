<script setup lang="ts">
import { useCategoryStore } from '@/stores/categories'
import type { UserCategoryStatisticsResponse } from '@/types/api/users'
import { computed } from 'vue'

const props = defineProps<{
  categoryStats: UserCategoryStatisticsResponse[]
  maxAp?: number
}>()

const categoryStore = useCategoryStore()
const MAX_AP = computed(() => props.maxAp ?? 12000)

const PADDING = 50
const RADIUS = 90
const SIZE = (RADIUS + PADDING) * 2
const CENTER = SIZE / 2
const RINGS = 4
const ANGLE_OFFSET = -Math.PI / 2

const prismId = `prism-${Math.random().toString(36).slice(2, 8)}`

const axes = computed(() => {
  const valid = props.categoryStats
    .map((stat) => {
      const code = categoryStore.getCategoryCode(stat.categoryId)
      if (!code || code === 'xp' || code === 'overall') return null
      const info = categoryStore.getCategoryInfo(code)
      if (!info) return null
      return { stat, info }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const count = valid.length
  if (count === 0) return []

  return valid.map((cat, i) => {
    const angle = ANGLE_OFFSET + (2 * Math.PI * i) / count
    const normalized = Math.min(cat.stat.ap / MAX_AP.value, 1)
    return {
      label: cat.info.name,
      accent: cat.info.accent,
      value: cat.stat.ap,
      normalized,
      x: CENTER + RADIUS * normalized * Math.cos(angle),
      y: CENTER + RADIUS * normalized * Math.sin(angle),
      labelX: CENTER + (RADIUS + 18) * Math.cos(angle),
      labelY: CENTER + (RADIUS + 18) * Math.sin(angle),
    }
  })
})

function polyAt(fraction: number): string {
  const count = axes.value.length
  if (count === 0) return ''
  return Array.from({ length: count }, (_, i) => {
    const angle = ANGLE_OFFSET + (2 * Math.PI * i) / count
    return `${CENTER + RADIUS * fraction * Math.cos(angle)},${CENTER + RADIUS * fraction * Math.sin(angle)}`
  }).join(' ')
}

const gridRings = computed(() =>
  Array.from({ length: RINGS }, (_, i) => polyAt((i + 1) / RINGS)),
)

const spokes = computed(() => {
  const count = axes.value.length
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = ANGLE_OFFSET + (2 * Math.PI * i) / count
    return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) }
  })
})

const dataPolygon = computed(() =>
  axes.value.map((a) => `${a.x},${a.y}`).join(' '),
)

const gradients = computed(() =>
  axes.value.map((axis, i) => ({
    id: `${prismId}-grad-${i}`,
    cx: axis.x,
    cy: axis.y,
    r: RADIUS * (0.4 + 0.6 * axis.normalized),
    color: axis.accent,
  })),
)

function formatAp(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
}

function textAnchor(labelX: number): string {
  if (labelX < CENTER - 2) return 'end'
  if (labelX > CENTER + 2) return 'start'
  return 'middle'
}
</script>

<template>
  <div class="skill-prism" v-if="axes.length >= 3">
    <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="skill-prism__svg">
      <defs>
        <clipPath :id="`${prismId}-clip`">
          <polygon :points="dataPolygon" />
        </clipPath>
        <radialGradient
          v-for="grad in gradients"
          :key="grad.id"
          :id="grad.id"
          gradientUnits="userSpaceOnUse"
          :cx="grad.cx" :cy="grad.cy" :r="grad.r"
        >
          <stop offset="0%" :stop-color="grad.color" stop-opacity="0.45" />
          <stop offset="100%" :stop-color="grad.color" stop-opacity="0" />
        </radialGradient>
      </defs>

      <polygon v-for="(ring, i) in gridRings" :key="i" :points="ring" class="skill-prism__ring" />

      <line
        v-for="(pt, i) in spokes" :key="'s' + i"
        :x1="CENTER" :y1="CENTER" :x2="pt.x" :y2="pt.y"
        class="skill-prism__spoke"
      />

      <g :clip-path="`url(#${prismId}-clip)`">
        <rect
          v-for="grad in gradients" :key="grad.id"
          x="0" y="0" :width="SIZE" :height="SIZE"
          :fill="`url(#${grad.id})`"
        />
      </g>

      <polygon :points="dataPolygon" class="skill-prism__data-stroke" />

      <circle
        v-for="(axis, i) in axes" :key="'d' + i"
        :cx="axis.x" :cy="axis.y" r="3" :fill="axis.accent"
        class="skill-prism__dot"
      />

      <g v-for="(axis, i) in axes" :key="'l' + i">
        <text
          :x="axis.labelX" :y="axis.labelY - 6"
          :text-anchor="textAnchor(axis.labelX)"
          dominant-baseline="auto" class="skill-prism__label"
        >{{ axis.label }}</text>
        <text
          :x="axis.labelX" :y="axis.labelY + 8"
          :text-anchor="textAnchor(axis.labelX)"
          :fill="axis.accent"
          dominant-baseline="auto" class="skill-prism__value"
        >{{ formatAp(axis.value) }} AP</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.skill-prism {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 360px;
}

.skill-prism__svg {
  width: 100%;
  height: auto;
}

.skill-prism__ring {
  fill: none;
  stroke: var(--bg-overlay);
  stroke-width: 0.5;
}

.skill-prism__spoke {
  stroke: var(--bg-overlay);
  stroke-width: 0.5;
}

.skill-prism__data-stroke {
  fill: none;
  stroke: color-mix(in srgb, var(--text-primary) 30%, transparent);
  stroke-width: 1;
  stroke-linejoin: round;
}

.skill-prism__dot {
  filter: drop-shadow(0 0 3px currentColor);
}

.skill-prism__label {
  fill: var(--text-secondary);
  font-size: 9px;
  font-family: var(--font-sans);
  font-weight: 500;
}

.skill-prism__value {
  font-size: 8px;
  font-family: var(--font-mono);
  font-weight: 500;
}
</style>
