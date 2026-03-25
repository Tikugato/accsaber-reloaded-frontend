<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useThemeStore } from '@/stores/theme'
import type { MetricType, TimeRange, TimeSeriesPoint } from '@/types/display'
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'

const props = defineProps<{
  data: TimeSeriesPoint[]
  metricLabel: string
  accentColor?: string
  availableMetrics?: { key: MetricType; label: string }[]
  selectedMetric?: MetricType
  selectedRange?: TimeRange
  invertY?: boolean
  formatValue?: (v: number) => string
  yMax?: number
  yMin?: number
}>()

const emit = defineEmits<{
  'update:selectedMetric': [value: MetricType]
  'update:selectedRange': [value: TimeRange]
}>()

const themeStore = useThemeStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isLoading = ref(true)
const chartInstance = shallowRef<unknown>(null)

const timeRanges: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '14d', label: '2w' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '1y', label: '1y' },
  { key: 'all', label: 'All' },
]

const activeRange = computed(() => props.selectedRange ?? '14d')

async function loadChart() {
  isLoading.value = true
  try {
    const { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } = await import('chart.js')
    Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

    await nextTick()
    if (!canvasRef.value) return

    destroyChart()

    const styles = getComputedStyle(document.documentElement)
    const gridColor = styles.getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.06)'
    const textColor = styles.getPropertyValue('--chart-text').trim() || '#8888a0'
    const resolvedAccent = props.accentColor ?? '#a855f7'

    let fillColor: string
    const rgbMatch = resolvedAccent.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      fillColor = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.1)`
    } else {
      fillColor = resolvedAccent + '1a'
    }

    const formatDate = (ts: number): string => {
      const d = new Date(ts)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
    }

    chartInstance.value = new Chart(canvasRef.value, {
      type: 'line',
      data: {
        labels: props.data.map((p) => formatDate(p.timestamp)),
        datasets: [
          {
            data: props.data.map((p) => p.value),
            borderColor: resolvedAccent,
            backgroundColor: fillColor,
            fill: props.invertY ? 'start' : true,
            tension: 0.3,
            pointRadius: props.data.length < 50 ? 3 : 0,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex
                if (idx != null && props.data[idx]) {
                  const d = new Date(props.data[idx].timestamp)
                  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                }
                return ''
              },
              label: (item) => {
                const point = props.data[item.dataIndex]
                if (point?.tooltipLines?.length) {
                  return point.tooltipLines
                }
                const y = item.parsed.y ?? 0
                return props.formatValue
                  ? props.formatValue(y)
                  : `${y}`
              },
              afterLabel: () => '',
            },
          },
        },
        scales: {
          x: {
            type: 'category',
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono, monospace', size: 10 },
              maxTicksLimit: 8,
              maxRotation: 0,
            },
          },
          y: {
            reverse: props.invertY ?? false,
            max: props.yMax,
            min: props.yMin,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono, monospace', size: 10 },
              callback: props.formatValue
                ? (value) => props.formatValue!(value as number)
                : undefined,
            },
          },
        },
      },
    })
  } catch {
  }
  isLoading.value = false
}

function destroyChart() {
  if (chartInstance.value && typeof (chartInstance.value as { destroy: () => void }).destroy === 'function') {
    (chartInstance.value as { destroy: () => void }).destroy()
    chartInstance.value = null
  }
}

watch([() => props.data, () => props.accentColor, () => themeStore.theme], () => {
  loadChart()
}, { immediate: true })

onUnmounted(() => {
  destroyChart()
})
</script>

<template>
  <div class="chart-container">
    <div v-if="availableMetrics?.length" class="chart-container__controls">
      <BaseTabs v-if="availableMetrics && selectedMetric"
        :tabs="availableMetrics.map((m) => ({ key: m.key, label: m.label }))" :model-value="selectedMetric"
        @update:model-value="emit('update:selectedMetric', $event as MetricType)" />
    </div>
    <div class="chart-container__range">
      <button v-for="range in timeRanges" :key="range.key" class="chart-container__range-btn"
        :class="{ 'chart-container__range-btn--active': activeRange === range.key }"
        @click="emit('update:selectedRange', range.key)">
        {{ range.label }}
      </button>
    </div>
    <div class="chart-container__canvas-wrap">
      <SkeletonLoader v-if="isLoading" variant="card" height="240px" />
      <canvas v-show="!isLoading" ref="canvasRef" />
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.chart-container__controls {
  display: flex;
  gap: var(--space-sm);
}

.chart-container__range {
  display: flex;
  gap: var(--space-xs);
}

.chart-container__range-btn {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.chart-container__range-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.chart-container__range-btn--active {
  border-color: var(--accent);
  color: var(--accent);
}

.chart-container__canvas-wrap {
  position: relative;
  height: 240px;
}

.chart-container__canvas-wrap canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
