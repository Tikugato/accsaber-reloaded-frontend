<script setup lang="ts">
import MilestoneListView from '@/components/domain/MilestoneListView.vue'
import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import { ref, watch } from 'vue'

const props = defineProps<{
  userId: string
}>()

const loading = ref(false)
const milestones = ref<MilestoneCompletionResponse[]>([])
const sets = ref<MilestoneSetResponse[]>([])

async function fetchMilestones() {
  loading.value = true
  try {
    const { getMilestoneSets, getMilestoneCompletionStats } = await import('@/api/milestones')
    const [completionRes, setRes] = await Promise.all([
      getMilestoneCompletionStats(props.userId),
      getMilestoneSets({ size: 100 }),
    ])
    milestones.value = completionRes
    sets.value = setRes.content
  } catch {
    milestones.value = []
    sets.value = []
  }
  loading.value = false
}

watch(() => props.userId, () => { fetchMilestones() }, { immediate: true })
</script>

<template>
  <MilestoneListView :milestones="milestones" :sets="sets" :loading="loading" logged-in />
</template>
