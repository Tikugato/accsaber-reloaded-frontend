import type { SortDirection, SortState } from '@/types/display'
import type { PaginationParams } from '@/types/pagination'
import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface PageableRouteOptions {
  defaultSort: MaybeRefOrGetter<string>
  defaultOrder?: SortDirection
  defaultSize?: number
  sortFieldMap?: Record<string, string>
  secondarySort?: MaybeRefOrGetter<string | null>
}

export function usePageableRoute(options: PageableRouteOptions) {
  const route = useRoute()
  const router = useRouter()

  const {
    defaultSort,
    defaultOrder = 'desc',
    defaultSize = 50,
    sortFieldMap = {},
    secondarySort = 'ap,desc',
  } = options

  const currentPage = computed<number>(() => {
    const p = Number(route.query.page)
    return p > 0 ? p : 1
  })

  const sortState = computed<SortState>(() => {
    const key = (route.query.sort as string) || toValue(defaultSort)
    const direction = (route.query.order as SortDirection) || defaultOrder
    return { key, direction }
  })

  function setPage(page: number) {
    const query = { ...route.query }
    if (page <= 1) {
      delete query.page
    } else {
      query.page = String(page)
    }
    router.replace({ query })
  }

  function setSort(key: string) {
    const query = { ...route.query }
    if (sortState.value.key === key) {
      const newDir = sortState.value.direction === 'asc' ? 'desc' : 'asc'
      query.order = newDir
    } else {
      query.sort = key
      query.order = 'desc'
    }
    delete query.page
    router.replace({ query })
  }

  function resetPage() {
    const query = { ...route.query }
    delete query.page
    router.replace({ query })
  }

  const paginationParams = computed<PaginationParams>(() => {
    const apiField = sortFieldMap[sortState.value.key] ?? sortState.value.key
    const primarySort = `${apiField},${sortState.value.direction}`
    const secondary = toValue(secondarySort)
    const sort = (!secondary || primarySort.startsWith(secondary.split(',')[0]))
      ? primarySort
      : [primarySort, secondary]
    return {
      page: currentPage.value - 1,
      size: defaultSize,
      sort,
    }
  })

  return {
    currentPage,
    sortState,
    paginationParams,
    setPage,
    setSort,
    resetPage,
  }
}
