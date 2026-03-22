<script setup lang="ts">
import CountryFlag from '@/components/domain/CountryFlag.vue';
import type { MilestoneHolderResponse } from '@/types/api/milestones';
import { onUnmounted, ref } from 'vue';

const props = defineProps<{
  milestoneId: string
  completions: number
}>()

const holders = ref<MilestoneHolderResponse[]>([])
const loading = ref(true)
const fetched = ref(false)
const showTooltip = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let leaveTimer: ReturnType<typeof setTimeout> | null = null

function onMouseEnter() {
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  if (showTooltip.value) return
  hoverTimer = setTimeout(() => {
    showTooltip.value = true
    if (!fetched.value) fetchHolders()
  }, 600)
}

function onMouseLeave() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
  leaveTimer = setTimeout(() => { showTooltip.value = false }, 150)
}

function onPopupEnter() {
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
}

function onPopupLeave() {
  leaveTimer = setTimeout(() => { showTooltip.value = false }, 150)
}

async function fetchHolders() {
  fetched.value = true
  try {
    const { getMilestoneHolders } = await import('@/api/milestones')
    const res = await getMilestoneHolders(props.milestoneId)
    holders.value = res.content
  } catch {
    holders.value = []
  }
  loading.value = false
}

onUnmounted(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
  if (leaveTimer) clearTimeout(leaveTimer)
})

function formatRelative(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}
</script>

<template>
  <span class="holder-trigger" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <span class="holder-trigger__pill">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>

    <Transition name="holder-tooltip">
      <div v-if="showTooltip" class="holder-popup" @mouseenter="onPopupEnter" @mouseleave="onPopupLeave">
        <div class="holder-popup__bridge" />
        <div class="holder-popup__card">
          <div class="holder-popup__header">
            <span class="holder-popup__title">Completed by</span>
            <span class="holder-popup__count">{{ completions }}</span>
          </div>

          <div v-if="loading" class="holder-popup__loading">
            <div v-for="i in Math.min(completions, 5)" :key="i" class="holder-popup__shimmer" />
          </div>

          <div v-else-if="holders.length === 0" class="holder-popup__empty">
            No holders found
          </div>

          <div v-else class="holder-popup__list">
            <router-link v-for="h in holders" :key="h.userId"
              :to="{ name: 'player-profile', params: { userId: h.userId } }" class="holder-popup__row">
              <img :src="h.avatarUrl" :alt="h.name" class="holder-popup__avatar" loading="lazy" />
              <span class="holder-popup__name">{{ h.name }}</span>
              <CountryFlag :country="h.country" />
              <span class="holder-popup__time">{{ formatRelative(h.completedAt) }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </Transition>
  </span>
</template>

<style scoped>
.holder-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
  z-index: 2;
}

.holder-trigger:hover {
  z-index: 10000;
}

.holder-trigger__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  color: var(--text-secondary);
  transition: border-color 120ms ease, color 120ms ease, background-color 120ms ease;
}

.holder-trigger:hover .holder-trigger__pill {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
  background: var(--bg-overlay);
}

.holder-popup {
  position: absolute;
  bottom: 100%;
  right: 0;
  z-index: 10000;
  pointer-events: auto;
  padding-bottom: 8px;
}

.holder-popup__bridge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 12px;
}

.holder-popup__card {
  width: 280px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
}

.holder-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.holder-popup__title {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.holder-popup__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.holder-popup__list {
  display: flex;
  flex-direction: column;
  max-height: 260px;
  overflow-y: auto;
}

.holder-popup__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  transition: background-color 80ms ease;
}

.holder-popup__row:hover {
  background: var(--bg-elevated);
}

.holder-popup__link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  text-decoration: none;
  color: inherit;
  flex: 1;
  min-width: 0;
}

.holder-popup__avatar {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  flex-shrink: 0;
}

.holder-popup__name {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.holder-popup__time {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.holder-popup__loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
}

.holder-popup__shimmer {
  height: 24px;
  background: var(--bg-elevated);
  border-radius: var(--radius-btn);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    opacity: 0.5;
  }

  50% {
    opacity: 0.8;
  }

  100% {
    opacity: 0.5;
  }
}

.holder-popup__empty {
  padding: var(--space-md);
  text-align: center;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.holder-tooltip-enter-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.holder-tooltip-leave-active {
  transition: opacity 100ms ease-in, transform 100ms ease-in;
}

.holder-tooltip-enter-from,
.holder-tooltip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {

  .holder-tooltip-enter-active,
  .holder-tooltip-leave-active {
    transition: none;
  }
}
</style>
