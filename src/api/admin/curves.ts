import type { CreateCurveRequest, UpdateCurveRequest } from '@/types/api/admin'
import type { CurveResponse } from '@/types/api/categories'
import { get, patch, post } from '../client'

export { getCurve } from '../curves'

export function getCurves(): Promise<CurveResponse[]> {
  return get<CurveResponse[]>('/curves')
}

export function createCurve(req: CreateCurveRequest): Promise<CurveResponse> {
  return post<CurveResponse>('/admin/curves', req)
}

export function updateCurve(id: string, req: UpdateCurveRequest): Promise<CurveResponse> {
  return patch<CurveResponse>(`/admin/curves/${id}`, req)
}
