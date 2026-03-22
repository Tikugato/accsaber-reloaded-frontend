import type { MilestoneCompletionResponse, MilestoneSetResponse, PrerequisiteLinkResponse } from '@/types/api/milestones'
import type { EnrichedPrerequisite, CrossSetEdge } from '@/types/milestones'

export function enrichPrerequisites(
  prerequisites: PrerequisiteLinkResponse[],
  currentSetId: string,
  allMilestones: MilestoneCompletionResponse[],
  allSets: MilestoneSetResponse[],
): EnrichedPrerequisite[] {
  const milestoneSetMap = new Map<string, string>()
  for (const m of allMilestones) {
    milestoneSetMap.set(m.milestoneId, m.setId)
  }

  const setTitleMap = new Map<string, string>()
  for (const s of allSets) {
    setTitleMap.set(s.id, s.title)
  }

  return prerequisites.map((p) => {
    const prereqSetId = p.prerequisiteSetId
      ?? milestoneSetMap.get(p.prerequisiteMilestoneId)
      ?? currentSetId

    return {
      ...p,
      isCrossSet: prereqSetId !== currentSetId,
      resolvedSetId: prereqSetId,
      resolvedSetTitle: p.prerequisiteSetTitle ?? setTitleMap.get(prereqSetId) ?? 'Unknown Set',
    }
  })
}

export function extractCrossSetEdges(
  prerequisitesBySet: Map<string, PrerequisiteLinkResponse[]>,
  allMilestones: MilestoneCompletionResponse[],
): CrossSetEdge[] {
  const milestoneSetMap = new Map<string, string>()
  for (const m of allMilestones) {
    milestoneSetMap.set(m.milestoneId, m.setId)
  }

  const edgeCounts = new Map<string, CrossSetEdge>()

  for (const [setId, prereqs] of prerequisitesBySet) {
    for (const p of prereqs) {
      const prereqSetId = p.prerequisiteSetId
        ?? milestoneSetMap.get(p.prerequisiteMilestoneId)

      if (!prereqSetId || prereqSetId === setId) continue

      const key = [setId, prereqSetId].sort().join(':')
      const existing = edgeCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        edgeCounts.set(key, { fromSetId: prereqSetId, toSetId: setId, count: 1 })
      }
    }
  }

  return [...edgeCounts.values()]
}
