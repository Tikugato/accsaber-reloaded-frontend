import { getCategories } from '@/api/categories'
import type { CategoryResponse } from '@/types/api/categories'
import type { CategoryCode, CategoryInfo } from '@/types/display'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const CATEGORY_COLORS: Record<string, { accent: string; tint: string; tintLight: string }> = {
  true_acc: { accent: '#22c55e', tint: '#0f3d1e', tintLight: '#d4f5e0' },
  standard_acc: { accent: '#3b82f6', tint: '#162650', tintLight: '#d4e4fd' },
  tech_acc: { accent: '#ef4444', tint: '#3d1414', tintLight: '#fdd4d4' },
  low_mid: { accent: '#eab308', tint: '#3d3508', tintLight: '#faf0c8' },
  overall: { accent: '#a855f7', tint: '#2d1650', tintLight: '#ead4fd' },
  xp: { accent: '#06b6d4', tint: '#0e3640', tintLight: '#ccf2f8' },
}

const DEFAULT_COLOR = { accent: '#a855f7', tint: '#2d1650', tintLight: '#ead4fd' }

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref<CategoryResponse[]>([])
  const loaded = ref(false)

  const byId = computed(() => {
    const map = new Map<string, CategoryResponse>()
    for (const cat of categories.value) {
      map.set(cat.id, cat)
    }
    return map
  })

  const byCode = computed(() => {
    const map = new Map<string, CategoryResponse>()
    for (const cat of categories.value) {
      map.set(cat.code, cat)
    }
    return map
  })

  const XP_INFO: CategoryInfo = {
    code: 'xp',
    name: 'XP',
    accent: CATEGORY_COLORS.xp.accent,
    tint: CATEGORY_COLORS.xp.tint,
    tintLight: CATEGORY_COLORS.xp.tintLight,
  }

  const categoryInfoList = computed<CategoryInfo[]>(() => {
    const list = categories.value.map((cat) => {
      const colors = CATEGORY_COLORS[cat.code] ?? DEFAULT_COLOR
      return {
        code: cat.code,
        name: cat.name,
        accent: colors.accent,
        tint: colors.tint,
        tintLight: colors.tintLight,
      }
    })
    return [...list, XP_INFO]
  })

  const categoryInfoByCode = computed(() => {
    const map = new Map<string, CategoryInfo>()
    for (const info of categoryInfoList.value) {
      map.set(info.code, info)
    }
    return map
  })

  function getCategoryId(code: CategoryCode): string | undefined {
    return byCode.value.get(code)?.id
  }

  function getCategoryCode(id: string): CategoryCode | undefined {
    return byId.value.get(id)?.code
  }

  function getCategoryInfo(code: string): CategoryInfo | undefined {
    return categoryInfoByCode.value.get(code)
  }

  function getAccent(code: string): string {
    return CATEGORY_COLORS[code]?.accent ?? DEFAULT_COLOR.accent
  }

  async function fetchCategories(): Promise<void> {
    try {
      categories.value = await getCategories()
      loaded.value = true
    } catch {
    }
  }

  return {
    categories,
    loaded,
    byId,
    byCode,
    categoryInfoList,
    categoryInfoByCode,
    getCategoryId,
    getCategoryCode,
    getCategoryInfo,
    getAccent,
    fetchCategories,
  }
})
