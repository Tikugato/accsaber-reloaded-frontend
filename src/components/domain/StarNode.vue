<script setup lang="ts">
import type { MilestoneCompletionResponse } from '@/types/api/milestones';
import type { GhostNode } from '@/types/milestones';
import { tierColor as getTierColor, TIER_SCALES } from '@/utils/constants';
import { computed } from 'vue';

const props = defineProps<{
  milestone: MilestoneCompletionResponse
  position: { x: number; y: number }
  loggedIn?: boolean
  ghost?: GhostNode
}>()

const emit = defineEmits<{
  select: [milestone: MilestoneCompletionResponse]
  hover: [milestone: MilestoneCompletionResponse]
  leave: []
  navigateToSet: [setId: string]
}>()

const tierKey = computed(() => props.milestone.tier.toUpperCase())
const tierColor = computed(() => getTierColor(props.milestone.tier))
const tierScale = computed(() => (props.ghost ? (TIER_SCALES[tierKey.value] ?? 1) * 0.7 : TIER_SCALES[tierKey.value] ?? 1))
const isCompleted = computed(() => props.milestone.userCompleted === true)
const isNotCompleted = computed(() => !!props.loggedIn && !isCompleted.value)
const isMilestoneType = computed(() => props.milestone.type?.toUpperCase() === 'MILESTONE')
const isApex = computed(() => tierKey.value === 'APEX')

const ariaLabel = computed(() => {
  if (props.ghost) {
    return `${props.ghost.title} - ${props.ghost.tier} - from ${props.ghost.setTitle}`
  }
  const status = isCompleted.value ? 'Completed' : 'Not completed'
  return `${props.milestone.title} - ${props.milestone.tier} - ${status}`
})

function handleClick() {
  if (props.ghost) {
    emit('navigateToSet', props.ghost.setId)
  } else {
    emit('select', props.milestone)
  }
}
</script>

<template>
  <button class="star-node" :class="{
    'star-node--completed': isCompleted,
    'star-node--dim': isNotCompleted,
    'star-node--ghost': !!ghost,
    'star-node--apex': isApex,
  }" :style="{
    left: `${position.x}%`,
    top: `${position.y}%`,
    '--tier-color': tierColor,
    '--tier-scale': tierScale,
  }" :aria-label="ariaLabel" tabindex="0" @click="handleClick" @pointerenter="emit('hover', milestone)"
    @pointerleave="emit('leave')" @focus="emit('hover', milestone)" @blur="emit('leave')">
    <span class="star-node__glow" />
    <span class="star-node__core">
      <svg v-if="isApex" class="star-node__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10 2l3 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1z" />
      </svg>
      <svg v-else-if="isMilestoneType" class="star-node__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="4" y1="3" x2="4" y2="17" />
        <path d="M4 3h10l-3 4 3 4H4" />
      </svg>
      <svg v-else class="star-node__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 3h8v5a4 4 0 0 1-8 0V3z" />
        <path d="M14 5h1a2 2 0 0 1 0 4h-1" />
        <path d="M6 5H5a2 2 0 0 0 0 4h1" />
        <line x1="10" y1="12" x2="10" y2="15" />
        <line x1="7" y1="15" x2="13" y2="15" />
      </svg>
    </span>
    <span v-if="ghost" class="star-node__set-label">{{ ghost.setTitle }}</span>
  </button>
</template>

<style scoped>
.star-node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.star-node:focus-visible {
  outline: 2px solid var(--tier-color);
  outline-offset: 4px;
  border-radius: 50%;
}

.star-node__glow {
  position: absolute;
  inset: calc(-8px * var(--tier-scale, 1));
  border-radius: 50%;
  background: radial-gradient(circle, var(--tier-color), transparent 70%);
  opacity: 0;
  transition: opacity 200ms ease;
}

.star-node--completed .star-node__glow {
  opacity: 0.4;
}

.star-node__core {
  position: relative;
  width: calc(14px * var(--tier-scale, 1));
  height: calc(14px * var(--tier-scale, 1));
  border-radius: 50%;
  background: var(--tier-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-base);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.star-node--completed .star-node__core {
  box-shadow:
    0 0 calc(8px * var(--tier-scale, 1)) var(--tier-color),
    0 0 calc(16px * var(--tier-scale, 1)) color-mix(in srgb, var(--tier-color) 30%, transparent);
}

.star-node--completed .star-node__core::before,
.star-node--completed .star-node__core::after {
  content: '';
  position: absolute;
  background: var(--tier-color);
  opacity: 0.4;
}

.star-node--completed .star-node__core::before {
  width: 1px;
  height: calc(24px * var(--tier-scale, 1));
}

.star-node--completed .star-node__core::after {
  width: calc(24px * var(--tier-scale, 1));
  height: 1px;
}

.star-node--dim .star-node__core {
  opacity: 0.3;
}

.star-node__icon {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
}

.star-node:hover .star-node__core {
  transform: scale(1.3);
}

.star-node:hover .star-node__glow {
  opacity: 0.6;
}

.star-node--ghost {
  opacity: 0.5;
}

.star-node--ghost .star-node__core {
  background: transparent;
  border: 1.5px dashed var(--tier-color);
  box-sizing: border-box;
  color: var(--tier-color);
}

.star-node--apex .star-node__core {
  background: var(--tier-color);
  box-shadow:
    0 0 12px var(--tier-color),
    0 0 32px color-mix(in srgb, var(--tier-color) 40%, transparent);
}

.star-node--apex .star-node__glow {
  opacity: 0.5;
  animation: apex-pulse 3s ease-in-out infinite;
}

.star-node--apex .star-node__icon {
  width: 12px;
  height: 12px;
}

.star-node--apex.star-node--completed .star-node__core {
  box-shadow:
    0 0 16px var(--tier-color),
    0 0 40px color-mix(in srgb, var(--tier-color) 50%, transparent),
    0 0 64px color-mix(in srgb, var(--tier-color) 20%, transparent);
}

.star-node--apex.star-node--completed .star-node__core::before,
.star-node--apex.star-node--completed .star-node__core::after {
  opacity: 0.6;
}

@keyframes apex-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.15); }
}

.star-node__set-label {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  color: var(--text-tertiary);
  white-space: nowrap;
  pointer-events: none;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (prefers-reduced-motion: reduce) {

  .star-node__glow,
  .star-node__core {
    transition: none;
  }

  .star-node--apex .star-node__glow {
    animation: none;
  }
}
</style>
