<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import { provideCategoryContext } from '@/composables/useCategoryContext'
import { useCategoryStore } from '@/stores/categories'
import type { CategoryCode } from '@/types/display'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: CategoryCode
  exclude?: CategoryCode[]
}>(), {
  exclude: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: CategoryCode]
}>()

const categoryStore = useCategoryStore()

const tabs = computed(() => {
  const all = categoryStore.categoryInfoList
  const sorted = [
    ...all.filter((c) => c.code === 'overall'),
    ...all.filter((c) => c.code !== 'overall'),
  ]
  const list = props.exclude.length > 0
    ? sorted.filter((c) => !props.exclude.includes(c.code))
    : sorted
  return list.map((c) => ({
    key: c.code,
    label: c.name,
    accentColor: c.accent,
  }))
})

provideCategoryContext(computed(() => props.modelValue))
</script>

<template>
  <BaseTabs :tabs="tabs" :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event as CategoryCode)" />
</template>
