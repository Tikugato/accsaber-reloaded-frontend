import type { LeaderboardResponse, XpLeaderboardResponse } from '@/types/api/users'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export interface LeaderboardParams extends PaginationParams {
  inactiveUsers?: boolean
}

export function getLeaderboard(
  categoryId: string,
  params?: LeaderboardParams,
): Promise<Page<LeaderboardResponse>> {
  return get<Page<LeaderboardResponse>>(`/leaderboards/${categoryId}${buildQuery(params)}`)
}

export function getCountryLeaderboard(
  categoryId: string,
  country: string,
  params?: LeaderboardParams,
): Promise<Page<LeaderboardResponse>> {
  return get<Page<LeaderboardResponse>>(
    `/leaderboards/${categoryId}/country/${country}${buildQuery(params)}`,
  )
}

export function getXpLeaderboard(
  params?: LeaderboardParams & { country?: string },
): Promise<Page<XpLeaderboardResponse>> {
  return get<Page<XpLeaderboardResponse>>(`/leaderboards/xp${buildQuery(params)}`)
}
