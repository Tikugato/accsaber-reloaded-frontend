<script setup lang="ts">
import { useClickOutside } from '@/composables/useClickOutside'
import type { CurveResponse } from '@/types/api/categories'
import { calculateAp, reverseApToAccuracy, reverseApToAccuracyByComplexity, tweakRawAp } from '@/utils/curveEval'
import { computed, nextTick, ref, toRef, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  curveId: string
  anchorEl: HTMLElement | null
  defaultAccuracy?: number
  accuracy?: number
  ap?: number
  weightedAp?: number
  complexity?: number
  showWeighted?: boolean
  siblingAps?: number[]
}>(), {
  defaultAccuracy: 0.9,
  showWeighted: true,
})

const isScoreMode = computed(() => props.ap != null && props.accuracy != null)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const panelRef = ref<HTMLElement | null>(null)
const anchorRef = toRef(props, 'anchorEl')
const curve = ref<CurveResponse | null>(null)
const curveLoading = ref(false)
const editingAcc = ref(false)
const editingAp = ref(false)
const editInput = ref('')
const panelStyle = ref<Record<string, string>>({})

const wholeValue = ref(0)
const decimalValue = ref(0)
const referenceAccuracy = ref(0)
const decimalMax = computed(() => wholeValue.value >= 100 ? 0 : 99)
const combinedAccuracy = computed(() => (wholeValue.value + decimalValue.value / 100) / 100)

function splitAccuracy(acc: number) {
  const pct = Math.round(acc * 10000) / 100
  wholeValue.value = Math.floor(pct)
  decimalValue.value = Math.round((pct - Math.floor(pct)) * 100)
}

function initAccuracy(acc: number) {
  splitAccuracy(acc)
  referenceAccuracy.value = combinedAccuracy.value
}

watch(() => wholeValue.value, (val) => {
  if (val >= 100) {
    wholeValue.value = 100
    decimalValue.value = 0
  }
})

function updatePosition() {
  if (!props.anchorEl) return
  const rect = props.anchorEl.getBoundingClientRect()
  const panelHeight = panelRef.value?.offsetHeight ?? 200
  const spaceBelow = window.innerHeight - rect.bottom
  const fitsBelow = spaceBelow >= panelHeight + 8

  panelStyle.value = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: '300',
    ...(fitsBelow
      ? { top: `${rect.bottom + 4}px` }
      : { bottom: `${window.innerHeight - rect.top + 4}px` }),
  }
}

function startEditingAcc() {
  editingAcc.value = true
  editInput.value = `${wholeValue.value}.${decimalValue.value.toString().padStart(2, '0')}`
  nextTick(() => {
    const input = panelRef.value?.querySelector('.ap-tweaker__edit-input') as HTMLInputElement | null
    input?.select()
  })
}

function commitAccEdit() {
  editingAcc.value = false
  const parsed = parseFloat(editInput.value)
  if (isNaN(parsed)) return
  splitAccuracy(Math.max(0, Math.min(1, parsed / 100)))
}

function startEditingAp() {
  editingAp.value = true
  editInput.value = tweakedRawAp.value.toFixed(2)
  nextTick(() => {
    const input = panelRef.value?.querySelector('.ap-tweaker__ap-edit') as HTMLInputElement | null
    input?.select()
  })
}

function commitApEdit() {
  editingAp.value = false
  const targetAp = parseFloat(editInput.value)
  if (isNaN(targetAp) || targetAp < 0 || !curve.value) return

  let acc: number | null = null
  if (isScoreMode.value) {
    acc = reverseApToAccuracy(curve.value, targetAp, props.accuracy!, props.ap!)
  } else if (props.complexity != null) {
    acc = reverseApToAccuracyByComplexity(curve.value, targetAp, props.complexity)
  }

  if (acc != null) splitAccuracy(Math.max(0, Math.min(1, acc)))
}

function handleEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    if (editingAcc.value) commitAccEdit()
    else if (editingAp.value) commitApEdit()
  }
  if (e.key === 'Escape') {
    editingAcc.value = false
    editingAp.value = false
  }
}

function close() {
  if (!editingAcc.value && !editingAp.value) emit('update:open', false)
}

useClickOutside(panelRef, toRef(props, 'open'), close, { ignoreRefs: [anchorRef] })

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    initAccuracy(isScoreMode.value ? props.accuracy! : props.defaultAccuracy)
    editingAcc.value = false
    editingAp.value = false

    if (!curve.value || curve.value.id !== props.curveId) {
      curveLoading.value = true
      try {
        const { getCurve } = await import('@/api/curves')
        curve.value = await getCurve(props.curveId)
      } catch {
        curve.value = null
      }
      curveLoading.value = false
    }

    await nextTick()
    updatePosition()
    document.addEventListener('scroll', updatePosition, true)
  } else {
    document.removeEventListener('scroll', updatePosition, true)
  }
})

const tweakedRawAp = computed(() => {
  if (!curve.value) return 0
  if (isScoreMode.value) {
    return tweakRawAp(curve.value, referenceAccuracy.value, props.ap!, combinedAccuracy.value)
  }
  return calculateAp(curve.value, combinedAccuracy.value, props.complexity ?? 0)
})

const weightResult = computed(() => {
  if (!isScoreMode.value) return { weightedAp: 0, posChanged: false }

  const currentAp = props.ap!
  const newAp = tweakedRawAp.value
  const ratio = currentAp > 0 ? (props.weightedAp ?? 0) / currentAp : 1
  const weightedAp = newAp * ratio

  let posChanged = false
  if (props.siblingAps?.length) {
    const others = [...props.siblingAps]
    const idx = others.indexOf(currentAp)
    if (idx !== -1) others.splice(idx, 1)

    if (newAp > currentAp) {
      posChanged = others.some((s) => s >= currentAp && s < newAp)
    } else if (newAp < currentAp) {
      posChanged = others.some((s) => s <= currentAp && s > newAp)
    }
  }

  return { weightedAp, posChanged }
})

const apDiff = computed(() => isScoreMode.value ? tweakedRawAp.value - props.ap! : 0)
const weightedDiff = computed(() => {
  if (!isScoreMode.value) return 0
  return weightResult.value.weightedAp - (props.weightedAp ?? 0)
})

function formatDiff(val: number): string {
  if (Math.abs(val) < 0.005) return '0.00'
  return (val > 0 ? '+' : '') + val.toFixed(2)
}

function diffColor(val: number): string {
  if (val > 0.005) return 'var(--success)'
  if (val < -0.005) return 'var(--error)'
  return 'var(--text-secondary)'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="tweaker">
      <div v-if="open" ref="panelRef" class="ap-tweaker" :style="panelStyle" @mousedown.stop @click.stop>
        <div class="ap-tweaker__header">
          <span class="ap-tweaker__title">AP Tweaker</span>
          <button class="ap-tweaker__close" aria-label="Close AP tweaker" @click="emit('update:open', false)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div v-if="curveLoading" class="ap-tweaker__loading">Loading curve...</div>
        <template v-else-if="curve">
          <div class="ap-tweaker__acc-display">
            <input v-if="editingAcc" v-model="editInput" class="ap-tweaker__edit-input" type="text" inputmode="decimal"
              @blur="commitAccEdit" @keydown="handleEditKeydown" />
            <button v-else class="ap-tweaker__acc-btn" @click="startEditingAcc">
              {{ wholeValue }}.{{ decimalValue.toString().padStart(2, '0') }}%
            </button>
          </div>

          <div class="ap-tweaker__slider-group">
            <div class="ap-tweaker__slider-row">
              <label class="ap-tweaker__label">Whole %</label>
              <input v-model.number="wholeValue" type="range" class="ap-tweaker__slider" min="0" max="100" step="1" />
            </div>
            <div class="ap-tweaker__slider-row">
              <label class="ap-tweaker__label">Decimal</label>
              <input v-model.number="decimalValue" type="range" class="ap-tweaker__slider" min="0" :max="decimalMax"
                step="1" :disabled="wholeValue >= 100" />
            </div>
          </div>

          <div class="ap-tweaker__results">
            <div class="ap-tweaker__result">
              <span class="ap-tweaker__result-label">AP</span>
              <input v-if="editingAp" v-model="editInput" class="ap-tweaker__ap-edit" type="text" inputmode="decimal"
                @blur="commitApEdit" @keydown="handleEditKeydown" />
              <button v-else class="ap-tweaker__result-btn" @click="startEditingAp">
                {{ tweakedRawAp.toFixed(2) }}
              </button>
              <span v-if="isScoreMode && !editingAp" class="ap-tweaker__result-diff" :style="{ color: diffColor(apDiff) }">
                {{ formatDiff(apDiff) }}
              </span>
            </div>
            <div v-if="showWeighted && isScoreMode" class="ap-tweaker__result">
              <span class="ap-tweaker__result-label">Weighted</span>
              <span class="ap-tweaker__result-value">
                {{ weightResult.posChanged ? '~' : '' }}{{ weightResult.weightedAp.toFixed(2) }}
              </span>
              <span class="ap-tweaker__result-diff" :style="{ color: diffColor(weightedDiff) }">
                {{ formatDiff(weightedDiff) }}
              </span>
            </div>
            <span v-if="showWeighted && isScoreMode && weightResult.posChanged" class="ap-tweaker__approx-note">
              Position changed - weighted AP may differ
            </span>
          </div>
        </template>
        <div v-else class="ap-tweaker__loading">Curve data unavailable</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ap-tweaker {
  width: 260px;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm) var(--space-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ap-tweaker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ap-tweaker__title {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ap-tweaker__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.ap-tweaker__close:hover {
  color: var(--text-primary);
}

.ap-tweaker__loading {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-align: center;
  padding: var(--space-sm) 0;
}

.ap-tweaker__acc-display {
  text-align: center;
}

.ap-tweaker__acc-btn {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--text-primary);
  font-weight: 600;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-input);
  padding: 2px 8px;
  cursor: pointer;
  transition: border-color 120ms ease;
}

.ap-tweaker__acc-btn:hover {
  border-color: var(--bg-overlay);
}

.ap-tweaker__edit-input {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--text-primary);
  font-weight: 600;
  background: var(--bg-base);
  border: 1px solid var(--accent, var(--bg-overlay));
  border-radius: var(--radius-input);
  padding: 2px 8px;
  width: 100px;
  text-align: center;
  outline: none;
}

.ap-tweaker__slider-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ap-tweaker__slider-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.ap-tweaker__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  width: 52px;
  flex-shrink: 0;
}

.ap-tweaker__slider {
  flex: 1;
  height: 4px;
  appearance: none;
  background: var(--bg-overlay);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.ap-tweaker__slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ap-tweaker__slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent, var(--text-primary));
  border: 2px solid var(--bg-elevated);
  cursor: pointer;
  transition: transform 100ms ease;
}

.ap-tweaker__slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.ap-tweaker__slider:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}

.ap-tweaker__slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent, var(--text-primary));
  border: 2px solid var(--bg-elevated);
  cursor: pointer;
}

.ap-tweaker__results {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--bg-overlay);
}

.ap-tweaker__result {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.ap-tweaker__result-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  width: 56px;
  flex-shrink: 0;
}

.ap-tweaker__result-value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
}

.ap-tweaker__result-btn {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-input);
  padding: 0;
  cursor: pointer;
  text-align: left;
  transition: border-color 120ms ease;
}

.ap-tweaker__result-btn:hover {
  border-color: var(--bg-overlay);
}

.ap-tweaker__ap-edit {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
  background: var(--bg-base);
  border: 1px solid var(--accent, var(--bg-overlay));
  border-radius: var(--radius-input);
  padding: 0;
  outline: none;
  width: 80px;
}

.ap-tweaker__result-diff {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  white-space: nowrap;
}

.ap-tweaker__approx-note {
  font-size: 0.625rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.tweaker-enter-active,
.tweaker-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.tweaker-enter-from,
.tweaker-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {

  .tweaker-enter-active,
  .tweaker-leave-active {
    transition: none;
  }
}
</style>
