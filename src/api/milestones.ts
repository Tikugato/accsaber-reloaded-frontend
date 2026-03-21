import type {
  MilestoneCompletionResponse,
  MilestoneListParams,
  MilestoneResponse,
  MilestoneSetResponse,
  PrerequisiteLinkResponse,
} from '@/types/api/milestones'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getMilestones(params?: MilestoneListParams): Promise<Page<MilestoneResponse>> {
  return get<Page<MilestoneResponse>>(`/milestones${buildQuery(params)}`)
}

export function getMilestoneSets(
  params?: PaginationParams & { userId?: string },
): Promise<Page<MilestoneSetResponse>> {
  return get<Page<MilestoneSetResponse>>(`/milestones/sets${buildQuery(params)}`)
}

export function getMilestone(id: string): Promise<MilestoneResponse> {
  return get<MilestoneResponse>(`/milestones/${id}`)
}

export function getMilestonesBySet(setId: string): Promise<MilestoneResponse[]> {
  return get<MilestoneResponse[]>(`/milestones/sets/${setId}/milestones`)
}

export function getLevels(): Promise<{ levels: { level: number; xpRequired: number }[] }> {
  return get('/milestones/levels')
}

export function getSetPrerequisites(setId: string): Promise<PrerequisiteLinkResponse[]> {
  return get<PrerequisiteLinkResponse[]>(`/milestones/sets/${setId}/prerequisites`)
}

export function getMilestoneCompletionStats(
  userId?: string,
): Promise<MilestoneCompletionResponse[]> {
  const params = userId ? { userId } : undefined
  return get<MilestoneCompletionResponse[]>(`/milestones/completion-stats${buildQuery(params)}`)
}
