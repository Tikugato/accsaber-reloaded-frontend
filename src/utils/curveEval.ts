import type { CurveResponse } from '@/types/api/categories'
import { evaluateFormula } from './formulaParser'

type Point = { x: number; y: number }

const sortedCache = new WeakMap<Point[], Point[]>()

function getSortedPoints(rawPoints: Point[]): Point[] {
  let sorted = sortedCache.get(rawPoints)
  if (!sorted) {
    sorted = [...rawPoints].sort((a, b) => a.x - b.x)
    sortedCache.set(rawPoints, sorted)
  }
  return sorted
}

function interpolatePoints(rawPoints: Point[], x: number): number {
  if (rawPoints.length === 0) return 0
  const points = getSortedPoints(rawPoints)
  if (x <= points[0].x) return points[0].y
  if (x >= points[points.length - 1].x) return points[points.length - 1].y

  let lo = 0
  let hi = points.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >>> 1
    if (points[mid].x <= x) lo = mid
    else hi = mid
  }

  const p0 = points[lo]
  const p1 = points[hi]
  const t = (x - p0.x) / (p1.x - p0.x)
  return p0.y + t * (p1.y - p0.y)
}

function reverseInterpolatePoints(rawPoints: Point[], y: number): number | null {
  if (rawPoints.length === 0) return null
  const points = getSortedPoints(rawPoints)
  if (y <= points[0].y) return points[0].x
  if (y >= points[points.length - 1].y) return points[points.length - 1].x

  let lo = 0
  let hi = points.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >>> 1
    if (points[mid].y <= y) lo = mid
    else hi = mid
  }

  const p0 = points[lo]
  const p1 = points[hi]
  if (p1.y === p0.y) return p0.x
  const t = (y - p0.y) / (p1.y - p0.y)
  return p0.x + t * (p1.x - p0.x)
}

function buildCurveVars(curve: CurveResponse, accuracy: number): Record<string, number> {
  const vars: Record<string, number> = {
    x: accuracy,
    scale: curve.scale ?? 1,
    shift: curve.shift ?? 0,
  }
  if (curve.xParameterName) vars[curve.xParameterName] = curve.xParameterValue ?? 0
  if (curve.yParameterName) vars[curve.yParameterName] = curve.yParameterValue ?? 0
  if (curve.zParameterName) vars[curve.zParameterName] = curve.zParameterValue ?? 0
  return vars
}

function evaluateNormalized(curve: CurveResponse, accuracy: number): number {
  if (curve.type === 'POINT_LOOKUP' && curve.points?.length) {
    return interpolatePoints(curve.points, accuracy)
  }
  if (curve.type === 'FORMULA' && curve.formula) {
    return evaluateFormula(curve.formula, buildCurveVars(curve, accuracy))
  }
  return 0
}

export function calculateAp(curve: CurveResponse, accuracy: number, complexity: number): number {
  const normalized = evaluateNormalized(curve, accuracy)
  const scale = curve.scale ?? 1
  const shift = curve.shift ?? 0
  return normalized * (complexity - shift) * scale
}

export function reverseApToAccuracy(
  curve: CurveResponse,
  targetAp: number,
  currentAccuracy: number,
  currentAp: number,
): number | null {
  if (currentAp <= 0) return null
  const currentNorm = evaluateNormalized(curve, currentAccuracy)
  if (currentNorm <= 0) return null
  const targetNorm = (targetAp / currentAp) * currentNorm
  return reverseNormalized(curve, targetNorm)
}

export function reverseApToAccuracyByComplexity(
  curve: CurveResponse,
  targetAp: number,
  complexity: number,
): number | null {
  const scale = curve.scale ?? 1
  const shift = curve.shift ?? 0
  const denom = (complexity - shift) * scale
  if (denom <= 0) return null
  const targetNorm = targetAp / denom
  return reverseNormalized(curve, targetNorm)
}

function reverseNormalized(curve: CurveResponse, targetNorm: number): number | null {
  if (curve.type === 'POINT_LOOKUP' && curve.points?.length) {
    return reverseInterpolatePoints(curve.points, targetNorm)
  }
  if (curve.type === 'FORMULA' && curve.formula) {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2
      const val = evaluateNormalized(curve, mid)
      if (val < targetNorm) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }
  return null
}

export function tweakRawAp(
  curve: CurveResponse,
  currentAccuracy: number,
  currentAp: number,
  newAccuracy: number,
): number {
  const currentNorm = evaluateNormalized(curve, currentAccuracy)
  const newNorm = evaluateNormalized(curve, newAccuracy)
  return currentNorm !== 0 ? currentAp * (newNorm / currentNorm) : 0
}
