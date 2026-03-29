import type { MilestoneSetResponse, PrerequisiteLinkResponse, SetGroupResponse } from './api/milestones'

export interface EnrichedPrerequisite extends PrerequisiteLinkResponse {
  isCrossSet: boolean
  resolvedSetId: string
  resolvedSetTitle: string
}

export interface CrossSetEdge {
  fromSetId: string
  toSetId: string
  count: number
}

export interface ResolvedSetGroup {
  group: SetGroupResponse
  sets: MilestoneSetResponse[]
}

export interface GhostNode {
  milestoneId: string
  title: string
  tier: string
  setId: string
  setTitle: string
  completed?: boolean
}
