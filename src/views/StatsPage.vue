<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import DistributionRanking from '@/components/domain/DistributionRanking.vue'
import PlayerTooltipTrigger from '@/components/domain/PlayerTooltipTrigger.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type {
  DistributionEntryResponse,
  TimeSeriesPointResponse
} from '@/types/api/statistics'
import type { ScoreResponse } from '@/types/api/users'
import type { CategoryCode, MetricType, ScoreDisplay, TableColumn, TimeRange, TimeSeriesPoint } from '@/types/display'
import type { Page } from '@/types/pagination'
import { TIME_RANGE_PARAMS } from '@/utils/constants'
import { countryName } from '@/utils/countries'
import { formatRelativeDate } from '@/utils/formatters'
import { formatDifficulty, toScoreDisplay } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

type SectionKey = 'leaderboards' | 'platform'
type LeaderboardTab = 'streaks' | 'max-ap' | 'avg-ap' | 'most-retried' | 'grinders' | 'dedication' | 'collectors'

const leaderboardOptions: { key: LeaderboardTab; label: string; icon: string; description: string }[] = [
  { key: 'streaks', label: 'Longest Streaks', icon: 'streak', description: 'Highest 115 streaks' },
  { key: 'max-ap', label: 'Highest AP', icon: 'star', description: 'Top single-score AP' },
  { key: 'avg-ap', label: 'Most Worth Maps', icon: 'mountain', description: 'Highest average AP' },
  { key: 'most-retried', label: 'Most Grinded Maps', icon: 'repeat', description: 'Most superseded scores' },
  { key: 'grinders', label: 'Top Grinders', icon: 'trending', description: 'Most improvements overall' },
  { key: 'dedication', label: 'Map Dedication', icon: 'target', description: 'Most improvements on one map' },
  { key: 'collectors', label: 'Milestone Collectors', icon: 'trophy', description: 'Most milestones earned' },
]

const TABS_WITH_CATEGORY = new Set<LeaderboardTab>([
  'streaks', 'max-ap', 'avg-ap', 'most-retried', 'grinders', 'dedication',
])

const DEFAULT_SORTS: Record<LeaderboardTab, string> = {
  'streaks': 'streak115', 'max-ap': 'ap', 'avg-ap': 'averageAp',
  'most-retried': 'supersededCount', 'grinders': 'improvementCount',
  'dedication': 'improvementCount', 'collectors': 'milestoneCount',
}

const activeSection = computed<SectionKey>({
  get: () => (route.query.section as SectionKey) || 'leaderboards',
  set: (section) => {
    router.push({ query: { section: section === 'leaderboards' ? undefined : section } })
  },
})

const activeTab = computed<LeaderboardTab>({
  get: () => (route.query.tab as LeaderboardTab) || 'streaks',
  set: (tab) => {
    const query: Record<string, string> = { tab }
    if (route.query.section) query.section = route.query.section as string
    if (route.query.category) query.category = route.query.category as string
    router.push({ query })
  },
})

const activeCategory = computed<CategoryCode>({
  get: () => (route.query.category as CategoryCode) || 'overall',
  set: (code) => {
    const query: Record<string, unknown> = { ...route.query, category: code }
    delete query.page
    router.push({ query: query as Record<string, string> })
  },
})

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: computed(() => DEFAULT_SORTS[activeTab.value] ?? 'streak115'),
  defaultOrder: 'desc',
  defaultSize: 50,
})

const accent = computed(() => categoryStore.getAccent(activeCategory.value))
const isScoreTab = computed(() => activeTab.value === 'streaks' || activeTab.value === 'max-ap')

function categoryDotColor(categoryId: string): string {
  const code = categoryStore.getCategoryCode(categoryId)
  return categoryStore.getAccent(code ?? 'overall')
}

const detailColumn: TableColumn = { key: 'detail', label: '', width: '44px', align: 'center' }

const COLUMNS: Record<LeaderboardTab, TableColumn[]> = {
  'streaks': [
    { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
    { key: 'player', label: 'Player', align: 'left' },
    { key: 'map', label: 'Map', align: 'left' },
    { key: 'streak115', label: 'Streak', align: 'right', mono: true, width: '100px' },
    { key: 'accuracy', label: 'Accuracy', align: 'right', mono: true, width: '110px' },
    { key: 'ap', label: 'AP', align: 'right', mono: true, width: '100px' },
    { key: 'timeSet', label: 'Date', align: 'right', width: '110px' },
    detailColumn,
  ],
  'max-ap': [
    { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
    { key: 'player', label: 'Player', align: 'left' },
    { key: 'map', label: 'Map', align: 'left' },
    { key: 'ap', label: 'AP', align: 'right', mono: true, width: '100px' },
    { key: 'accuracy', label: 'Accuracy', align: 'right', mono: true, width: '110px' },
    { key: 'timeSet', label: 'Date', align: 'right', width: '110px' },
    detailColumn,
  ],
  'avg-ap': [
    { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
    { key: 'map', label: 'Map', align: 'left' },
    { key: 'categoryName', label: 'Category', align: 'left', width: '130px' },
    { key: 'averageAp', label: 'Avg AP', align: 'right', mono: true, width: '110px' },
    { key: 'scoreCount', label: 'Scores', align: 'right', mono: true, width: '100px' },
    { key: 'latestScoreTimeSet', label: 'Latest', align: 'right', width: '110px' },
  ],
  'most-retried': [
    { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
    { key: 'map', label: 'Map', align: 'left' },
    { key: 'categoryName', label: 'Category', align: 'left', width: '130px' },
    { key: 'supersededCount', label: 'Retries', align: 'right', mono: true, width: '110px' },
    { key: 'latestScoreTimeSet', label: 'Latest', align: 'right', width: '110px' },
  ],
  'grinders': [
    { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
    { key: 'player', label: 'Player', align: 'left' },
    { key: 'improvementCount', label: 'Improvements', align: 'right', mono: true, width: '140px' },
    { key: 'latestScoreTimeSet', label: 'Latest', align: 'right', width: '110px' },
  ],
  'dedication': [
    { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
    { key: 'player', label: 'Player', align: 'left' },
    { key: 'map', label: 'Map', align: 'left' },
    { key: 'improvementCount', label: 'Improvements', align: 'right', mono: true, width: '140px' },
    { key: 'latestScoreTimeSet', label: 'Latest', align: 'right', width: '110px' },
  ],
  'collectors': [
    { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
    { key: 'player', label: 'Player', align: 'left' },
    { key: 'milestoneCount', label: 'Milestones', align: 'right', mono: true, width: '140px' },
  ],
}

const columns = computed(() => COLUMNS[activeTab.value] ?? [])

const loading = ref(false)
const pageData = ref<Page<unknown> | null>(null)
const scoreResponses = ref<ScoreResponse[]>([])
const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref('')

function openScoreDetail(scoreId: string) {
  const raw = scoreResponses.value.find((s) => s.id === scoreId)
  if (!raw) return
  detailScore.value = toScoreDisplay(raw, modifierStore.resolveModifierCodes(raw.modifierIds), categoryStore.getCategoryCode(raw.categoryId))
  detailUserId.value = raw.userId
  detailOpen.value = true
}

function addRank(item: Record<string, unknown>, index: number) {
  return { ...item, rank: pageData.value!.number * pageData.value!.size + index + 1 }
}

const rows = computed(() => {
  if (!pageData.value) return []
  return pageData.value.content.map((item, i) => addRank(item as Record<string, unknown>, i))
})

const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const totalElements = computed(() => pageData.value?.totalElements ?? 0)

function rowTo(row: Record<string, unknown>) {
  if (activeTab.value === 'avg-ap' || activeTab.value === 'most-retried') {
    return { name: 'map-detail', params: { mapId: row.mapId as string }, query: row.mapDifficultyId ? { difficultyId: row.mapDifficultyId as string } : undefined }
  }
  if (row.userId) return { name: 'player-profile', params: { userId: row.userId as string } }
  return undefined
}

let lbRequestId = 0

async function fetchLeaderboardData() {
  const requestId = ++lbRequestId
  loading.value = true
  try {
    const categoryId = TABS_WITH_CATEGORY.has(activeTab.value) && activeCategory.value !== 'overall'
      ? categoryStore.getCategoryId(activeCategory.value) : undefined
    const params = paginationParams.value
    const api = await import('@/api/statistics')
    let result: Page<unknown>

    switch (activeTab.value) {
      case 'streaks': result = await api.getStreakLeaderboard(params, categoryId); break
      case 'max-ap': result = await api.getMaxApLeaderboard(params, categoryId); break
      case 'avg-ap': result = await api.getHighestAvgApMaps(params, categoryId); break
      case 'most-retried': result = await api.getMostRetriedMaps(params, categoryId); break
      case 'grinders': result = await api.getMostImprovements(params, categoryId); break
      case 'dedication': result = await api.getMostMapImprovements(params, categoryId); break
      case 'collectors': result = await api.getMilestoneCollectors(params); break
      default: result = { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0, first: true, last: true, empty: true }
    }

    if (requestId !== lbRequestId) return
    if (isScoreTab.value) scoreResponses.value = result.content as ScoreResponse[]
    pageData.value = result
  } catch (error) {
    if (requestId !== lbRequestId) return
    console.error('Failed to fetch leaderboard:', error)
    pageData.value = null
  }
  loading.value = false
}

const growthMetric = ref<MetricType>('newPlayers')
const growthRange = ref<TimeRange>('30d')
const growthChartData = ref<TimeSeriesPoint[]>([])
const growthLoading = ref(false)
const hmdData = ref<DistributionEntryResponse[]>([])
const countryData = ref<DistributionEntryResponse[]>([])
const categoryData = ref<DistributionEntryResponse[]>([])
const distributionsLoaded = ref(false)
const chartCache = ref<Record<string, TimeSeriesPointResponse[]>>({})

const GROWTH_METRICS: { key: MetricType; label: string }[] = [
  { key: 'newPlayers', label: 'New Players' },
  { key: 'totalPlayers', label: 'Total Players' },
  { key: 'dailyScores', label: 'Daily Scores' },
  { key: 'totalScores', label: 'Total Scores' },
]

function toChartPoints(data: TimeSeriesPointResponse[]): TimeSeriesPoint[] {
  return data.map((d) => ({ timestamp: new Date(d.date).getTime(), value: d.value }))
}

const METRIC_ENDPOINTS = {
  newPlayers: 'getNewPlayersPerDay',
  totalPlayers: 'getCumulativeAccounts',
  dailyScores: 'getScoresPerDay',
  totalScores: 'getCumulativeScores',
} as const

let chartRequestId = 0

async function fetchChart(metric: MetricType, range: TimeRange) {
  const key = `${metric}:${range}`
  if (chartCache.value[key]) {
    growthChartData.value = toChartPoints(chartCache.value[key])
    growthLoading.value = false
    return
  }
  const requestId = ++chartRequestId
  growthLoading.value = true
  growthChartData.value = []
  try {
    const api = await import('@/api/statistics')
    const endpoint = METRIC_ENDPOINTS[metric as keyof typeof METRIC_ENDPOINTS]
    if (!endpoint) { growthChartData.value = []; return }
    const data = await api[endpoint](TIME_RANGE_PARAMS[range])
    if (requestId !== chartRequestId) return
    chartCache.value[key] = data
    growthChartData.value = toChartPoints(data)
  } catch (error) {
    if (requestId !== chartRequestId) return
    console.error('Failed to fetch chart:', error)
    growthChartData.value = []
  }
  growthLoading.value = false
}

async function fetchDistributions() {
  if (distributionsLoaded.value) return
  try {
    const api = await import('@/api/statistics')
    const [hmd, country, category] = await Promise.all([
      api.getPlayersByHmd(), api.getPlayersPerCountry(), api.getScoresPerCategory(),
    ])
    hmdData.value = hmd
    countryData.value = country.map((c) => ({ ...c, label: countryName(c.label) }))
    categoryData.value = category
    distributionsLoaded.value = true
  } catch (error) {
    console.error('Failed to fetch distributions:', error)
  }
}

function onMetricChange(m: MetricType) { growthMetric.value = m; fetchChart(m, growthRange.value) }
function onRangeChange(r: TimeRange) { growthRange.value = r; fetchChart(growthMetric.value, r) }

watch(
  [activeTab, activeCategory, paginationParams],
  () => { if (activeSection.value === 'leaderboards') fetchLeaderboardData() },
  { immediate: true },
)
watch(activeSection, (s) => {
  if (s === 'platform') { fetchChart(growthMetric.value, growthRange.value); fetchDistributions() }
}, { immediate: true })
watch(() => categoryStore.loaded, (loaded, wasLoaded) => {
  if (loaded && !wasLoaded && activeSection.value === 'leaderboards') fetchLeaderboardData()
})
</script>

<template>
  <div class="stats" :style="{ '--page-accent': accent }">
    <header class="stats__header">
      <div class="stats__header-bleed" />
      <div class="stats__header-content">
        <h1 class="stats__title">{{ activeSection === 'leaderboards' ? 'Extra Leaderboards' : 'Platform Stats' }}</h1>
        <p v-if="activeSection === 'leaderboards' && totalElements > 0" class="stats__subtitle">
          {{ totalElements.toLocaleString() }} records
        </p>
      </div>
    </header>

    <div class="section-toggle">
      <button class="section-toggle__btn" :class="{ 'section-toggle__btn--active': activeSection === 'leaderboards' }"
        @click="activeSection = 'leaderboards'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        Extra Leaderboards
      </button>
      <button class="section-toggle__btn" :class="{ 'section-toggle__btn--active': activeSection === 'platform' }"
        @click="activeSection = 'platform'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
        Platform Stats
      </button>
    </div>

    <template v-if="activeSection === 'leaderboards'">
      <div class="stats__category-filter">
        <CategoryTabs :model-value="activeCategory" :exclude="['xp']" @update:model-value="activeCategory = $event" />
      </div>

      <div class="lb-picker">
        <button v-for="opt in leaderboardOptions" :key="opt.key" class="lb-picker__card"
          :class="{ 'lb-picker__card--active': activeTab === opt.key }" @click="activeTab = opt.key">
          <span class="lb-picker__icon">
            <svg v-if="opt.icon === 'streak'" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <svg v-else-if="opt.icon === 'star'" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <svg v-else-if="opt.icon === 'mountain'" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
            </svg>
            <svg v-else-if="opt.icon === 'repeat'" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <svg v-else-if="opt.icon === 'trending'" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <svg v-else-if="opt.icon === 'target'" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <svg v-else-if="opt.icon === 'trophy'" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
          </span>
          <span class="lb-picker__label">{{ opt.label }}</span>
          <span class="lb-picker__desc">{{ opt.description }}</span>
        </button>
      </div>

      <div class="stats__table" :style="{ '--accent': accent }">
        <DataTable :columns="columns" :rows="rows" :loading="loading" :loading-rows="10" row-clickable :row-to="rowTo"
          row-key="rank" empty-message="No records found">

          <template #cell-rank="{ value }">
            <span class="rank-cell" :class="getRankClass(value as number)">#{{ value }}</span>
          </template>

          <template #cell-player="{ row }">
            <PlayerTooltipTrigger :user-id="(row.userId as string)" :user-name="(row.userName as string)"
              :avatar-url="(row.avatarUrl as string)" :country="(row.country as string)">
              <div class="player-cell">
                <GlowImage :src="(row.avatarUrl as string)" :alt="(row.userName as string)" :size="32" />
                <span class="player-cell__name">{{ row.userName }}</span>
                <CountryFlag :country="(row.country as string)" />
              </div>
            </PlayerTooltipTrigger>
          </template>

          <template #cell-map="{ row }">
            <router-link
              :to="{ name: 'map-detail', params: { mapId: row.mapId as string }, query: row.mapDifficultyId ? { difficultyId: row.mapDifficultyId as string } : undefined }"
              class="map-cell map-cell--link" @click.stop>
              <GlowImage :src="(row.coverUrl as string)" :alt="(row.songName as string)" :size="32" />
              <div class="map-cell__info">
                <div class="map-cell__title-row">
                  <span class="map-cell__dot" :style="{ background: categoryDotColor(row.categoryId as string) }" />
                  <span class="map-cell__name">{{ row.songName }}</span>
                </div>
                <div class="map-cell__meta">
                  <span class="map-cell__mapper">{{ row.mapAuthor }}</span>
                  <span class="map-cell__diff">{{ formatDifficulty(row.difficulty as string) }}</span>
                </div>
              </div>
            </router-link>
          </template>

          <template #cell-streak115="{ value }"><span class="stat-accent">{{ value }}</span></template>
          <template #cell-accuracy="{ value }">{{ ((value as number) * 100).toFixed(2) }}%</template>
          <template #cell-ap="{ value }"><span class="stat-accent">{{ (value as number).toFixed(2) }}</span></template>
          <template #cell-averageAp="{ value }"><span class="stat-accent">{{ (value as number).toFixed(2)
              }}</span></template>
          <template #cell-supersededCount="{ value }"><span class="stat-accent">{{ (value as number).toLocaleString()
              }}</span></template>
          <template #cell-improvementCount="{ value }"><span class="stat-accent">{{ (value as number).toLocaleString()
              }}</span></template>
          <template #cell-milestoneCount="{ value }"><span class="stat-accent">{{ (value as number).toLocaleString()
              }}</span></template>
          <template #cell-scoreCount="{ value }">{{ (value as number).toLocaleString() }}</template>
          <template #cell-timeSet="{ value }"><span class="date-cell">{{ formatRelativeDate(value as string) }}</span></template>
          <template #cell-latestScoreTimeSet="{ value }"><span class="date-cell">{{ formatRelativeDate(value as string) }}</span></template>

          <template #cell-detail="{ row }">
            <button v-if="isScoreTab" class="detail-btn" aria-label="View score details"
              @click.stop="openScoreDetail(row.id as string)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 11L5.5 5L8 8L10.5 4L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                  stroke-linejoin="round" />
                <path d="M2 13H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </template>

          <template #mobile-card="{ row }">
            <div class="stats-card" @click="rowTo(row) && $router.push(rowTo(row)!)">
              <span class="stats-card__rank rank-cell" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
              <div v-if="row.userName" class="stats-card__player">
                <GlowImage :src="(row.avatarUrl as string)" :alt="(row.userName as string)" :size="28" />
                <span class="stats-card__name">{{ row.userName }}</span>
                <CountryFlag v-if="row.country" :country="(row.country as string)" />
              </div>
              <router-link v-if="row.songName" class="stats-card__map"
                :to="{ name: 'map-detail', params: { mapId: row.mapId as string }, query: row.mapDifficultyId ? { difficultyId: row.mapDifficultyId as string } : undefined }"
                @click.stop>
                <GlowImage :src="(row.coverUrl as string)" :alt="(row.songName as string)" :size="28" />
                <div class="stats-card__map-info">
                  <span class="stats-card__map-name">{{ row.songName }}</span>
                  <span class="stats-card__map-meta"><span class="map-cell__dot"
                      :style="{ background: categoryDotColor(row.categoryId as string) }" /> {{ row.mapAuthor }} · {{
                        formatDifficulty(row.difficulty as string) }}</span>
                </div>
              </router-link>
              <span class="stats-card__stat stat-accent">
                <template v-if="activeTab === 'streaks'">{{ row.streak115 }}</template>
                <template v-else-if="activeTab === 'max-ap'">{{ (row.ap as number).toFixed(2) }}</template>
                <template v-else-if="activeTab === 'avg-ap'">{{ (row.averageAp as number).toFixed(2) }}</template>
                <template v-else-if="activeTab === 'most-retried'">{{ (row.supersededCount as number).toLocaleString()
                  }}</template>
                <template v-else-if="activeTab === 'grinders' || activeTab === 'dedication'">{{ (row.improvementCount as
                  number).toLocaleString() }}</template>
                <template v-else-if="activeTab === 'collectors'">{{ (row.milestoneCount as number).toLocaleString()
                  }}</template>
              </span>
              <button v-if="isScoreTab" class="detail-btn" aria-label="View score details"
                @click.stop="openScoreDetail(row.id as string)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 11L5.5 5L8 8L10.5 4L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                    stroke-linejoin="round" />
                  <path d="M2 13H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          </template>
        </DataTable>
      </div>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

      <ScoreDetailModal :open="detailOpen" :score="detailScore" :user-id="detailUserId" @close="detailOpen = false" />
    </template>

    <template v-else>
      <div class="growth">
        <div class="growth__chart">
          <TimeSeriesChart :data="growthChartData" metric-label="Platform Growth" :accent-color="accent"
            :available-metrics="GROWTH_METRICS" :selected-metric="growthMetric" :selected-range="growthRange"
            @update:selected-metric="onMetricChange" @update:selected-range="onRangeChange" />
          <div v-if="growthLoading" class="growth__chart-skeleton">
            <SkeletonLoader variant="card" height="300px" />
          </div>
        </div>
        <div class="growth__distributions">
          <DistributionRanking title="Top Headsets" :entries="hmdData" :accent-color="accent" />
          <DistributionRanking title="Top Countries" :entries="countryData" :accent-color="accent" />
          <DistributionRanking title="Scores by Category" :entries="categoryData" :accent-color="accent" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1030px;
  margin: 0 auto;
  width: 100%;
}

.section-toggle {
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
}

.section-toggle__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-pill, 20px);
  border: 1px solid var(--bg-overlay);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.section-toggle__btn:hover {
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.section-toggle__btn--active {
  border-color: color-mix(in srgb, var(--page-accent) 50%, transparent);
  background: color-mix(in srgb, var(--page-accent) 8%, var(--bg-surface));
  color: var(--page-accent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--page-accent) 15%, transparent);
}

.section-toggle__btn--active:hover {
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 12%, var(--bg-surface));
}

.section-toggle__btn svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.section-toggle__btn--active svg {
  opacity: 1;
}

.stats__header {
  position: relative;
  text-align: center;
  padding: var(--space-2xl) 0 var(--space-lg);
}

.stats__header-bleed {
  position: absolute;
  inset: -32px -64px 0 -64px;
  background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--page-accent) 15%, transparent), transparent 70%);
  pointer-events: none;
}

.stats__header-content {
  position: relative;
  z-index: 1;
}

.stats__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.stats__subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--page-accent);
  margin: var(--space-xs) 0 0;
  letter-spacing: 0.02em;
}

.stats__category-filter {
  display: flex;
  justify-content: center;
}

.stats__table {
  --accent: var(--page-accent);
}

.lb-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--space-sm);
}

.lb-picker__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition: all 150ms ease;
}

.lb-picker__card:hover {
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.lb-picker__card--active {
  border-color: color-mix(in srgb, var(--page-accent) 60%, transparent);
  background: color-mix(in srgb, var(--page-accent) 6%, var(--bg-surface));
}

.lb-picker__card--active:hover {
  border-color: var(--page-accent);
}

.lb-picker__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--bg-overlay);
  background: var(--bg-base);
  color: var(--text-tertiary);
  transition: all 150ms ease;
}

.lb-picker__card:hover .lb-picker__icon {
  color: var(--text-secondary);
  border-color: var(--text-tertiary);
}

.lb-picker__card--active .lb-picker__icon {
  color: var(--page-accent);
  border-color: var(--page-accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--page-accent) 30%, transparent), 0 0 20px color-mix(in srgb, var(--page-accent) 10%, transparent);
}

.lb-picker__label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.lb-picker__desc {
  font-size: 0.625rem;
  color: var(--text-tertiary);
  line-height: 1.3;
}

.rank-cell {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-secondary);
}

.player-cell {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.player-cell__name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.map-cell {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.map-cell--link:hover .map-cell__name {
  color: var(--page-accent);
}

.map-cell__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.map-cell__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.map-cell__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.map-cell__name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 120ms ease;
}

.map-cell__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.map-cell__mapper {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-cell__diff {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.stat-accent {
  color: var(--page-accent);
  font-weight: 600;
}

.date-cell {
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.detail-btn {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.detail-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.stats-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-left: 2px solid transparent;
  border-radius: var(--radius-card);
  cursor: pointer;
  min-height: 48px;
  transition: border-color 120ms ease;
  text-decoration: none;
  color: inherit;
}

.stats-card:hover {
  border-left-color: var(--page-accent);
}

.stats-card__rank {
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.stats-card__player {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  flex: 1;
}

.stats-card__name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-card__stat {
  font-family: var(--font-mono);
  font-weight: 600;
  flex-shrink: 0;
  margin-left: auto;
}

.stats-card__map {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.stats-card__map:hover .stats-card__map-name {
  color: var(--page-accent);
}

.stats-card__map-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.stats-card__map-name {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 120ms ease;
}

.stats-card__map-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.625rem;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.growth {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.growth__chart {
  position: relative;
}

.growth__chart-skeleton {
  position: absolute;
  inset: 0;
}

.growth__distributions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

@media (max-width: 767px) {
  .stats__header {
    padding: var(--space-lg) 0 var(--space-md);
  }

  .growth__distributions {
    grid-template-columns: 1fr;
  }
}
</style>
