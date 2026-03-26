export interface MapAvgApResponse {
  mapDifficultyId: string
  mapId: string
  songName: string
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  difficulty: string
  categoryId: string
  categoryName: string
  averageAp: number
  scoreCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface MapRetryResponse {
  mapDifficultyId: string
  mapId: string
  songName: string
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  difficulty: string
  categoryId: string
  categoryName: string
  supersededCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface UserImprovementsResponse {
  userId: string
  userName: string
  avatarUrl: string
  country: string
  improvementCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface UserMapImprovementsResponse {
  userId: string
  userName: string
  avatarUrl: string
  country: string
  mapDifficultyId: string
  mapId: string
  songName: string
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  difficulty: string
  categoryId: string
  categoryName: string
  improvementCount: number
  latestScoreId: string
  latestScoreTimeSet: string
}

export interface MilestoneCollectorResponse {
  userId: string
  userName: string
  avatarUrl: string
  country: string
  milestoneCount: number
}

export interface TimeSeriesPointResponse {
  date: string
  value: number
}

export interface DistributionEntryResponse {
  label: string
  count: number
}
