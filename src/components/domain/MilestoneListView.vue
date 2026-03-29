<script setup lang="ts">
import type { MilestoneSort } from '@/api/milestones'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneDetail from '@/components/domain/MilestoneDetail.vue'
import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import type { Tab } from '@/types/display'
import type { ResolvedSetGroup } from '@/types/milestones'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  milestones: MilestoneCompletionResponse[]
  sets: MilestoneSetResponse[]
  sort?: MilestoneSort
  loading?: boolean
  loggedIn?: boolean
  groups?: ResolvedSetGroup[]
  standaloneSets?: MilestoneSetResponse[]
}>()

const emit = defineEmits<{
  'update:sort': [sort: MilestoneSort]
}>()

const expandedSets = ref<Set<string>>(new Set())
const viewMode = ref('all')
const activeSort = ref<string>(props.sort ?? 'tier')

watch(() => props.sort, (v) => { if (v) activeSort.value = v })

function onSortChange(value: string) {
  activeSort.value = value
  emit('update:sort', value as MilestoneSort)
}

const sortOptions = computed(() => {
  const options = [
    { value: 'tier', label: 'Tier' },
    { value: 'completions', label: 'Most Completed' },
  ]
  if (props.loggedIn) {
    options.push({ value: 'completedAt', label: 'Recently Completed' })
  }
  return options
})

const viewTabs = computed<Tab[]>(() => {
  const tabs: Tab[] = [
    { key: 'all', label: 'All Progress' },
  ]
  if (props.loggedIn) {
    tabs.push({ key: 'completed', label: `Completed (${completedMilestones.value.length})` })
  } else {
    tabs.push({ key: 'completed', label: 'Completed' })
  }
  return tabs
})

interface MilestoneGroup {
  setId: string
  setTitle: string
  setBonusXp: number
  completedCount: number
  totalCount: number
  milestones: MilestoneCompletionResponse[]
}

const completedMilestones = computed(() =>
  props.milestones.filter((m) => m.userCompleted === true),
)

const activeMilestones = computed(() =>
  viewMode.value === 'completed' ? completedMilestones.value : props.milestones,
)

const isFlatSort = computed(() => activeSort.value !== 'tier')

function buildMilestoneGroup(setId: string, setInfo: MilestoneSetResponse | undefined, milestones: MilestoneCompletionResponse[]): MilestoneGroup {
  return {
    setId,
    setTitle: setInfo?.title ?? 'Other',
    setBonusXp: setInfo?.setBonusXp ?? 0,
    completedCount: milestones.filter((m) => m.userCompleted === true).length,
    totalCount: milestones.length,
    milestones,
  }
}

const milestonesBySetId = computed(() => {
  const map = new Map<string, MilestoneCompletionResponse[]>()
  for (const m of activeMilestones.value) {
    const key = m.setId || 'uncategorized'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return map
})

const setMap = computed(() => {
  const map = new Map<string, MilestoneSetResponse>()
  for (const s of props.sets) map.set(s.id, s)
  return map
})

interface DisplayGroup {
  groupId: string
  groupName: string
  groupDescription: string
  sets: MilestoneGroup[]
}

function buildDisplayGroupFromSets(groupId: string, groupName: string, groupDescription: string, groupSets: MilestoneSetResponse[]): DisplayGroup {
  return {
    groupId,
    groupName,
    groupDescription,
    sets: groupSets
      .map((s) => buildMilestoneGroup(s.id, setMap.value.get(s.id), milestonesBySetId.value.get(s.id) ?? []))
      .filter((g) => g.totalCount > 0),
  }
}

const displayGroups = computed<DisplayGroup[]>(() => {
  const hasGroups = (props.groups?.length ?? 0) > 0

  if (!hasGroups) {
    const allSets: MilestoneGroup[] = []
    for (const [setId, items] of milestonesBySetId.value) {
      allSets.push(buildMilestoneGroup(setId, setMap.value.get(setId), items))
    }
    if (allSets.length === 0) return []
    return [{ groupId: 'all', groupName: '', groupDescription: '', sets: allSets }]
  }

  const result: DisplayGroup[] = props.groups!.map((rg) =>
    buildDisplayGroupFromSets(rg.group.id, rg.group.name, rg.group.description, rg.sets),
  ).filter((dg) => dg.sets.length > 0)

  const standalone = props.standaloneSets ?? []
  if (standalone.length > 0) {
    const standaloneGroup = buildDisplayGroupFromSets('standalone', 'Other', '', standalone)
    if (standaloneGroup.sets.length > 0) {
      result.push(standaloneGroup)
    }
  }

  return result
})

const allSets = computed<MilestoneGroup[]>(() =>
  displayGroups.value.flatMap((dg) => dg.sets),
)

function toggleSet(setId: string) {
  if (expandedSets.value.has(setId)) {
    expandedSets.value.delete(setId)
  } else {
    expandedSets.value.add(setId)
  }
}


</script>

<template>
  <div class="milestone-list-view">
    <div class="milestone-list-view__controls">
      <BaseTabs :tabs="viewTabs" :model-value="viewMode" @update:model-value="viewMode = $event" />
      <BaseSelect :model-value="activeSort" :options="sortOptions" @update:model-value="onSortChange" />
    </div>

    <template v-if="loading">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" />
    </template>

    <div v-else-if="viewMode === 'completed' && !loggedIn" class="milestone-list-view__login-hint">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <p>Log in with your Steam ID to track your milestone progress</p>
    </div>

    <p v-else-if="allSets.length === 0" class="milestone-list-view__empty">
      {{ viewMode === 'completed' ? 'No completed milestones yet' : 'No milestone progress found' }}
    </p>

    <template v-else-if="isFlatSort">
      <div class="milestone-set__rows milestone-set__rows--flat">
        <MilestoneDetail v-for="m in activeMilestones" :key="m.milestoneId" :milestone="m" :logged-in="loggedIn"
          compact />
      </div>
    </template>

    <template v-else>
      <div v-for="dg in displayGroups" :key="dg.groupId" class="milestone-group">
        <div v-if="dg.groupName" class="milestone-group__header">
          <h2 class="milestone-group__title">{{ dg.groupName }}</h2>
          <p v-if="dg.groupDescription" class="milestone-group__desc">{{ dg.groupDescription }}</p>
        </div>

        <div v-for="ms in dg.sets" :key="ms.setId" class="milestone-set">
          <button class="milestone-set__header" :aria-expanded="expandedSets.has(ms.setId)"
            @click="toggleSet(ms.setId)">
            <div class="milestone-set__info">
              <h3 class="milestone-set__title">{{ ms.setTitle }}</h3>
              <span v-if="loggedIn" class="milestone-set__count">
                {{ ms.completedCount }}/{{ ms.totalCount }} completed
              </span>
              <span v-else class="milestone-set__count">
                {{ ms.totalCount }} milestones
              </span>
            </div>
            <div class="milestone-set__meta">
              <span v-if="ms.setBonusXp > 0" class="milestone-set__bonus">
                +{{ ms.setBonusXp }} XP bonus
              </span>
              <span class="milestone-set__chevron"
                :class="{ 'milestone-set__chevron--open': expandedSets.has(ms.setId) }">
                &#9660;
              </span>
            </div>
          </button>

          <div v-if="expandedSets.has(ms.setId)" class="milestone-set__rows">
            <MilestoneDetail v-for="m in ms.milestones" :key="m.milestoneId" :milestone="m" :logged-in="loggedIn"
              compact />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.milestone-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.milestone-list-view__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.milestone-list-view__empty {
  padding: var(--space-3xl) var(--space-md);
  text-align: center;
  color: var(--text-secondary);
  margin: 0;
}

.milestone-list-view__login-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-3xl) var(--space-md);
  color: var(--text-tertiary);
  text-align: center;
}

.milestone-list-view__login-hint p {
  margin: 0;
  font-size: var(--text-body);
  max-width: 320px;
}

.milestone-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.milestone-group__header {
  padding: var(--space-sm) 0;
}

.milestone-group__title {
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.milestone-group__desc {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: var(--space-xs) 0 0;
}

.milestone-set {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.milestone-set__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  transition: background-color 120ms ease;
}

.milestone-set__header:hover {
  background: var(--bg-elevated);
}

.milestone-set__info {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.milestone-set__title {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.milestone-set__count {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.milestone-set__meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.milestone-set__bonus {
  font-size: var(--text-caption);
  color: var(--accent);
  font-family: var(--font-mono);
  font-weight: 500;
}

.milestone-set__chevron {
  font-size: 0.6rem;
  color: var(--text-tertiary);
  transition: transform 150ms ease;
}

.milestone-set__chevron--open {
  transform: rotate(180deg);
}

.milestone-set__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-lg) var(--space-lg);
}

.milestone-set__rows--flat {
  padding: 0;
  gap: var(--space-sm);
}

@media (max-width: 767px) {
  .milestone-set__header {
    padding: var(--space-md);
  }

  .milestone-set__info {
    flex-direction: column;
    gap: 2px;
  }

  .milestone-set__title {
    font-size: var(--text-body);
  }

  .milestone-set__rows {
    padding: var(--space-xs) var(--space-sm) var(--space-md);
    gap: var(--space-sm);
  }

  .milestone-set__bonus {
    font-size: 0.625rem;
  }
}
</style>
