import type { CurveResponse } from '@/types/api/categories'
import { get } from './client'

export function getCurve(id: string): Promise<CurveResponse> {
  return get<CurveResponse>(`/curves/${id}`)
}
