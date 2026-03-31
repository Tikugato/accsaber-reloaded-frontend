import type { MilestoneSetResponse, SetGroupLinkResponse, SetGroupResponse } from '@/types/api/milestones'
import type { ResolvedSetGroup } from '@/types/milestones'
import { computed, ref, type Ref } from 'vue'

export function useSetGroups(sets: Ref<MilestoneSetResponse[]>) {
  const setGroups = ref<SetGroupResponse[]>([])
  const setGroupLinks = ref<Map<string, SetGroupLinkResponse[]>>(new Map())

  const resolvedGroups = computed<ResolvedSetGroup[]>(() => {
    const result: ResolvedSetGroup[] = []
    for (const group of setGroups.value) {
      const links = setGroupLinks.value.get(group.id) ?? []
      const sortedLinks = [...links].sort((a, b) => a.sortOrder - b.sortOrder)
      const groupSets = sortedLinks
        .map((link) => sets.value.find((s) => s.id === link.setId))
        .filter((s): s is MilestoneSetResponse => s !== undefined)
      if (groupSets.length > 0) {
        result.push({ group, sets: groupSets })
      }
    }
    return result
  })

  const groupedSetIds = computed(() => {
    const ids = new Set<string>()
    for (const links of setGroupLinks.value.values()) {
      for (const link of links) ids.add(link.setId)
    }
    return ids
  })

  const standaloneSets = computed(() =>
    sets.value.filter((s) => !groupedSetIds.value.has(s.id)),
  )

  async function fetchGroups() {
    try {
      const { getSetGroups, getSetGroupLinks } = await import('@/api/milestones')
      const groupsRes = await getSetGroups()
      setGroups.value = groupsRes

      const linkResults = await Promise.allSettled(
        groupsRes.map((g) => getSetGroupLinks(g.id)),
      )
      const linksMap = new Map<string, SetGroupLinkResponse[]>()
      for (let i = 0; i < groupsRes.length; i++) {
        const result = linkResults[i]
        linksMap.set(groupsRes[i].id, result.status === 'fulfilled' ? result.value : [])
      }
      setGroupLinks.value = linksMap
    } catch {
      setGroups.value = []
      setGroupLinks.value = new Map()
    }
  }

  function resetGroups() {
    setGroups.value = []
    setGroupLinks.value = new Map()
  }

  return { resolvedGroups, standaloneSets, fetchGroups, resetGroups }
}
