<script setup lang="ts">
import StatBlock from '@/components/common/StatBlock.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import { useCategoryStore } from '@/stores/categories'
import type { UserAllStatisticsResponse, UserCategoryStatisticsResponse } from '@/types/api/users'
import type { CategoryCode, MetricType, TimeRange, TimeSeriesPoint } from '@/types/display'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  userId: string
  category: CategoryCode
  xpStats?: UserAllStatisticsResponse | null
}>()

const categoryStore = useCategoryStore()
const selectedMetric = ref<MetricType>('ap')
const selectedRange = ref<TimeRange>('7d')
const chartData = ref<UserCategoryStatisticsResponse[]>([])
const chartLoading = ref(false)
const allTimeData = ref<UserCategoryStatisticsResponse[]>([])

const timeRangeParams: Record<TimeRange, { amount: number; unit: 'h' | 'd' | 'mo' }> = {
  '24h': { amount: 24, unit: 'h' },
  '7d': { amount: 7, unit: 'd' },
  '14d': { amount: 14, unit: 'd' },
  '30d': { amount: 30, unit: 'd' },
  '90d': { amount: 90, unit: 'd' },
  '1y': { amount: 12, unit: 'mo' },
  'all': { amount: 120, unit: 'mo' },
}

const chartPoints = computed<TimeSeriesPoint[]>(() => {
  if (chartData.value.length === 0) return []

  const points = chartData.value
    .map((s) => ({ timestamp: new Date(s.createdAt).getTime(), value: getMetricValue(s) }))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (points.length === 0) return []

  const timeSpan = points[points.length - 1].timestamp - points[0].timestamp
  const targetBuckets = 150
  const minBucket = 3600000 // 1 hour minimum
  const bucketSize = Math.max(minBucket, Math.floor(timeSpan / targetBuckets))

  const bucketMap = new Map<number, TimeSeriesPoint>()
  for (const p of points) {
    const bucket = Math.floor(p.timestamp / bucketSize)
    const existing = bucketMap.get(bucket)
    if (!existing || p.timestamp >= existing.timestamp) {
      bucketMap.set(bucket, p)
    }
  }

  const distinctPoints: TimeSeriesPoint[] = []
  let lastVal: number | undefined
  for (const p of points) {
    if (lastVal === undefined || p.value !== lastVal) {
      distinctPoints.push(p)
      lastVal = p.value
    }
  }

  const merged = new Map<number, TimeSeriesPoint>()
  for (const p of distinctPoints) {
    merged.set(p.timestamp, p)
  }

  const buckets = Array.from(bucketMap.keys()).sort((a, b) => a - b)
  let lastValue = bucketMap.get(buckets[0])!.value
  const nowBucket = Math.floor(Date.now() / bucketSize)

  for (let b = buckets[0]; b <= nowBucket; b++) {
    const existing = bucketMap.get(b)
    if (existing) {
      lastValue = existing.value
      merged.set(existing.timestamp, existing)
    } else {
      const ts = b * bucketSize
      if (!merged.has(ts)) {
        merged.set(ts, { timestamp: ts, value: lastValue })
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp)
})

const peakStats = computed(() => {
  const data = allTimeData.value
  if (data.length === 0) return null

  let peakRank = Infinity
  let peakCountryRank = Infinity
  let peakAp = -Infinity

  for (const s of data) {
    if (s.ranking > 0 && s.ranking < peakRank) peakRank = s.ranking
    if (s.countryRanking > 0 && s.countryRanking < peakCountryRank) peakCountryRank = s.countryRanking
    if (s.ap > peakAp) peakAp = s.ap
  }

  return {
    peakRank: peakRank === Infinity ? null : peakRank,
    peakCountryRank: peakCountryRank === Infinity ? null : peakCountryRank,
    peakAp: peakAp === -Infinity ? null : peakAp,
  }
})

const chartAccent = computed(() => categoryStore.getAccent(props.category))
const xpAccent = computed(() => categoryStore.getAccent('xp'))

const availableMetrics: { key: MetricType; label: string }[] = [
  { key: 'ap', label: 'AP' },
  { key: 'avgAccuracy', label: 'Avg Accuracy' },
  { key: 'rankedPlays', label: 'Ranked Plays' },
  { key: 'rank', label: 'Rank' },
]

function getMetricValue(stat: UserCategoryStatisticsResponse): number {
  switch (selectedMetric.value) {
    case 'ap': return stat.ap
    case 'avgAccuracy': return stat.averageAcc * 100
    case 'rankedPlays': return stat.rankedPlays
    case 'rank': return stat.ranking
    default: return 0
  }
}

const chartFormatValue = computed(() =>
  selectedMetric.value === 'avgAccuracy'
    ? (v: number) => `${v.toFixed(2)}%`
    : undefined
)

async function fetchChartData() {
  chartLoading.value = true
  try {
    const { getUserHistoricStatistics } = await import('@/api/users')
    const params = timeRangeParams[selectedRange.value]
    chartData.value = await getUserHistoricStatistics(props.userId, {
      category: props.category,
      ...params,
    })
  } catch {
    chartData.value = []
  }
  chartLoading.value = false
}

async function fetchAllTimeData() {
  try {
    const { getUserHistoricStatistics } = await import('@/api/users')
    allTimeData.value = await getUserHistoricStatistics(props.userId, {
      category: props.category,
      amount: 120,
      unit: 'mo',
    })
  } catch {
    allTimeData.value = []
  }
}

watch(
  [() => props.userId, () => props.category, selectedRange],
  () => { fetchChartData() },
  { immediate: true },
)

watch(
  [() => props.userId, () => props.category],
  () => { fetchAllTimeData() },
  { immediate: true },
)
</script>

<template>
  <div class="statistics-tab">
    <section v-if="peakStats" class="statistics-tab__peaks">
      <h3 class="statistics-tab__section-title">Peak Stats</h3>
      <div class="statistics-tab__peaks-grid">
        <StatBlock
          v-if="peakStats.peakRank != null"
          label="Peak Global Rank"
          :value="peakStats.peakRank"
          :decimals="0"
        />
        <StatBlock
          v-if="peakStats.peakCountryRank != null"
          label="Peak Country Rank"
          :value="peakStats.peakCountryRank"
          :decimals="0"
        />
        <StatBlock
          v-if="peakStats.peakAp != null"
          label="Peak AP"
          :value="peakStats.peakAp"
        />
      </div>
    </section>

    <section v-if="xpStats" class="xp-breakdown">
      <h3 class="statistics-tab__section-title">XP Breakdown</h3>
      <StatBlock label="Total XP" :value="xpStats.totalXp" :decimals="0" :accent-color="xpAccent" />
      <div class="xp-breakdown__tree">
        <div class="xp-breakdown__drop" />
        <div class="xp-breakdown__drop" />
        <div class="xp-breakdown__drop" />
      </div>
      <div class="xp-breakdown__sources">
        <StatBlock label="Score XP" :value="xpStats.totalScoreXp" :decimals="0" />
        <StatBlock label="Milestone XP" :value="xpStats.totalMilestoneXp" :decimals="0" />
        <StatBlock label="Set Bonus XP" :value="xpStats.totalMilestoneSetBonusXp" :decimals="0" />
      </div>
    </section>

    <section class="statistics-tab__chart">
      <h3 class="statistics-tab__section-title">History</h3>
      <TimeSeriesChart :data="chartPoints" :metric-label="selectedMetric" :accent-color="chartAccent"
        :available-metrics="availableMetrics" :selected-metric="selectedMetric" :selected-range="selectedRange"
        :invert-y="selectedMetric === 'rank'" :format-value="chartFormatValue"
        @update:selected-metric="selectedMetric = $event" @update:selected-range="selectedRange = $event" />
    </section>
  </div>
</template>

<style scoped>
.statistics-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2xl);
}

.statistics-tab__section-title {
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
  text-align: center;
}

.statistics-tab__peaks {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
}

.statistics-tab__peaks-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-sm);
}

.xp-breakdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
}

.xp-breakdown__tree {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
  height: 28px;
}

.xp-breakdown__drop {
  position: relative;
}

.xp-breakdown__drop::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  background: var(--text-tertiary);
}

.xp-breakdown__drop:first-child::before,
.xp-breakdown__drop:last-child::before {
  content: '';
  position: absolute;
  top: 0;
  height: 1px;
  background: var(--text-tertiary);
}

.xp-breakdown__drop:first-child::before {
  left: 50%;
  right: 0;
}

.xp-breakdown__drop:last-child::before {
  left: 0;
  right: 50%;
}

.xp-breakdown__drop:nth-child(2)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--text-tertiary);
}

.xp-breakdown__sources {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
}

.xp-breakdown__sources :deep(.stat-block) {
  align-items: center;
}

@media (max-width: 767px) {
  .xp-breakdown__sources {
    grid-template-columns: 1fr;
  }

  .xp-breakdown__tree {
    display: none;
  }
}

.statistics-tab__chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  max-width: 800px;
}
</style>
