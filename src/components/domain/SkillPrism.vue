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

interface PrismAxis {
  label: string
  code: string
  accent: string
  value: number
  normalized: number
  x: number
  y: number
  labelX: number
  labelY: number
}

const axes = computed<PrismAxis[]>(() => {
  const validCategories = props.categoryStats
    .map((stat) => {
      const code = categoryStore.getCategoryCode(stat.categoryId)
      if (!code || code === 'xp' || code === 'overall') return null
      const info = categoryStore.getCategoryInfo(code)
      if (!info) return null
      return { stat, code, info }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const count = validCategories.length
  if (count === 0) return []

  const angleOffset = -Math.PI / 2

  return validCategories.map((cat, i) => {
    const angle = angleOffset + (2 * Math.PI * i) / count
    const normalized = Math.min(cat.stat.ap / MAX_AP.value, 1)

    return {
      label: cat.info.name,
      code: cat.code,
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

const gridRings = computed(() => {
  return Array.from({ length: RINGS }, (_, i) => {
    const fraction = (i + 1) / RINGS
    return polygonPoints(fraction)
  })
})

const gridLines = computed(() => {
  if (axes.value.length === 0) return []
  const count = axes.value.length
  const angleOffset = -Math.PI / 2
  return Array.from({ length: count }, (_, i) => {
    const angle = angleOffset + (2 * Math.PI * i) / count
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    }
  })
})

const dataPolygon = computed(() => {
  if (axes.value.length === 0) return ''
  return axes.value.map((a) => `${a.x},${a.y}`).join(' ')
})

function polygonPoints(fraction: number): string {
  const count = axes.value.length
  if (count === 0) return ''
  const angleOffset = -Math.PI / 2
  return Array.from({ length: count }, (_, i) => {
    const angle = angleOffset + (2 * Math.PI * i) / count
    const x = CENTER + RADIUS * fraction * Math.cos(angle)
    const y = CENTER + RADIUS * fraction * Math.sin(angle)
    return `${x},${y}`
  }).join(' ')
}

const prismId = `prism-${Math.random().toString(36).slice(2, 8)}`

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
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toFixed(0)
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
          :cx="grad.cx"
          :cy="grad.cy"
          :r="grad.r"
        >
          <stop offset="0%" :stop-color="grad.color" stop-opacity="0.45" />
          <stop offset="100%" :stop-color="grad.color" stop-opacity="0" />
        </radialGradient>
      </defs>

      <polygon
        v-for="(ring, i) in gridRings"
        :key="'ring-' + i"
        :points="ring"
        class="skill-prism__ring"
      />

      <line
        v-for="(pt, i) in gridLines"
        :key="'line-' + i"
        :x1="CENTER"
        :y1="CENTER"
        :x2="pt.x"
        :y2="pt.y"
        class="skill-prism__spoke"
      />

      <g :clip-path="`url(#${prismId}-clip)`">
        <rect
          v-for="grad in gradients"
          :key="grad.id + '-fill'"
          x="0" y="0"
          :width="SIZE" :height="SIZE"
          :fill="`url(#${grad.id})`"
        />
      </g>

      <polygon
        :points="dataPolygon"
        class="skill-prism__data-stroke"
      />

      <circle
        v-for="(axis, i) in axes"
        :key="'dot-' + i"
        :cx="axis.x"
        :cy="axis.y"
        r="3"
        :fill="axis.accent"
        class="skill-prism__dot"
      />

      <g v-for="(axis, i) in axes" :key="'label-' + i">
        <text
          :x="axis.labelX"
          :y="axis.labelY - 6"
          class="skill-prism__label"
          :text-anchor="axis.labelX < CENTER - 2 ? 'end' : axis.labelX > CENTER + 2 ? 'start' : 'middle'"
          dominant-baseline="auto"
        >
          {{ axis.label }}
        </text>
        <text
          :x="axis.labelX"
          :y="axis.labelY + 8"
          class="skill-prism__value"
          :fill="axis.accent"
          :text-anchor="axis.labelX < CENTER - 2 ? 'end' : axis.labelX > CENTER + 2 ? 'start' : 'middle'"
          dominant-baseline="auto"
        >
          {{ formatAp(axis.value) }} AP
        </text>
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
