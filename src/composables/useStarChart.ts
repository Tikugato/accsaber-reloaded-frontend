import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import type { CrossSetEdge } from '@/types/milestones'
import { hashString, seededRandom } from '@/utils/constants'
import type { Ref } from 'vue'

export interface Position {
  x: number
  y: number
}

export interface SetNodeLayout {
  id: string
  set: MilestoneSetResponse
  position: Position
  milestoneCount: number
  completionPercentage: number
}

export interface StarLayout {
  milestone: MilestoneCompletionResponse
  position: Position
}

export interface Highway {
  from: Position
  to: Position
  opacity: number
}

export function scatterPosition(
  index: number,
  totalCount: number,
  width: number,
  height: number,
  seed: number,
): Position {
  if (totalCount <= 0) return { x: width / 2, y: height / 2 }

  const padX = width * 0.1
  const padY = height * 0.15
  const usableW = width - padX * 2
  const usableH = height - padY * 2

  const r1 = seededRandom(seed)
  const r2 = seededRandom(seed + 1)
  const r3 = seededRandom(seed + 5)

  const xBase = totalCount <= 1 ? width / 2 : padX + (index / (totalCount - 1)) * usableW
  const xJitter = (r1 - 0.5) * (usableW / totalCount) * 0.4
  const yBase = padY + usableH * 0.5
  const yOffset = (r2 - 0.5) * usableH * 0.8
  const yWobble = (r3 - 0.5) * 30

  return {
    x: Math.max(padX, Math.min(width - padX, xBase + xJitter)),
    y: Math.max(padY, Math.min(height - padY, yBase + yOffset + yWobble)),
  }
}

export interface SetGroupCluster {
  groupId: string
  groupName: string
  setIds: string[]
}

export function useStarChart(
  sets: Ref<MilestoneSetResponse[]>,
  milestonesBySet: Ref<Map<string, MilestoneCompletionResponse[]>>,
) {
  function buildNode(set: MilestoneSetResponse, position: Position): SetNodeLayout {
    const milestones = milestonesBySet.value.get(set.id) ?? []
    const completedCount = milestones.filter((m) => m.userCompleted === true).length
    const completionPct = milestones.length > 0
      ? (completedCount / milestones.length) * 100
      : 0
    return {
      id: set.id,
      set,
      position,
      milestoneCount: milestones.length,
      completionPercentage: set.userCompletionPercentage ?? completionPct,
    }
  }

  function separateOverlaps(nodes: SetNodeLayout[], containerWidth: number, containerHeight: number, regionX?: number, regionW?: number) {
    const minDist = 110
    const padX = regionX ?? containerWidth * 0.1
    const maxX = regionX !== undefined && regionW !== undefined ? regionX + regionW : containerWidth - containerWidth * 0.1
    const padY = containerHeight * 0.15
    const maxY = containerHeight - padY

    for (let pass = 0; pass < 12; pass++) {
      let anyOverlap = false
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].position
          const b = nodes[j].position
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist >= minDist || dist === 0) continue

          anyOverlap = true
          const overlap = (minDist - dist) / 2 + 1
          const nx = dx / dist
          const ny = dy / dist
          a.x = Math.max(padX, Math.min(maxX, a.x - nx * overlap))
          a.y = Math.max(padY, Math.min(maxY, a.y - ny * overlap))
          b.x = Math.max(padX, Math.min(maxX, b.x + nx * overlap))
          b.y = Math.max(padY, Math.min(maxY, b.y + ny * overlap))
        }
      }
      if (!anyOverlap) break
    }
  }

  function computeSetPositions(containerWidth: number, containerHeight: number, lockedCount = 0, groups?: SetGroupCluster[]): SetNodeLayout[] {
    if (sets.value.length === 0) return []

    if (!groups || groups.length === 0) {
      return computeUngroupedPositions(containerWidth, containerHeight, lockedCount)
    }

    const setMap = new Map<string, MilestoneSetResponse>()
    for (const s of sets.value) setMap.set(s.id, s)

    const groupedIds = new Set<string>()
    for (const g of groups) {
      for (const id of g.setIds) groupedIds.add(id)
    }

    const standaloneSets = sets.value.filter((s) => !groupedIds.has(s.id))

    const segments: { setIds: string[] }[] = groups.map((g) => ({
      setIds: g.setIds.filter((id) => setMap.has(id)),
    }))
    if (standaloneSets.length > 0) {
      segments.push({ setIds: standaloneSets.map((s) => s.id) })
    }
    if (lockedCount > 0) {
      segments.push({ setIds: Array.from({ length: lockedCount }, (_, i) => `__locked_${i}`) })
    }

    const totalWeight = segments.reduce((sum, s) => sum + Math.max(s.setIds.length, 1), 0)
    const padX = containerWidth * 0.06
    const usableW = containerWidth - padX * 2
    const allNodes: SetNodeLayout[] = []
    let cursorX = padX

    for (const seg of segments) {
      const segW = (Math.max(seg.setIds.length, 1) / totalWeight) * usableW
      const resolvedSets = seg.setIds
        .map((id) => setMap.get(id))
        .filter((s): s is MilestoneSetResponse => s !== undefined)

      const nodes = resolvedSets.map((set, i) => {
        const pos = scatterPosition(i, resolvedSets.length, segW, containerHeight, hashString(set.id))
        pos.x += cursorX
        return buildNode(set, pos)
      })

      separateOverlaps(nodes, containerWidth, containerHeight, cursorX, segW)
      allNodes.push(...nodes)
      cursorX += segW
    }

    return allNodes
  }

  function computeUngroupedPositions(containerWidth: number, containerHeight: number, lockedCount: number): SetNodeLayout[] {
    const sorted = [...sets.value].sort((a, b) => a.title.localeCompare(b.title))
    const totalCount = sorted.length + lockedCount

    const nodes = sorted.map((set, i) =>
      buildNode(set, scatterPosition(i, totalCount, containerWidth, containerHeight, hashString(set.id))),
    )

    separateOverlaps(nodes, containerWidth, containerHeight)
    return nodes
  }

  function computeHighways(nodes: SetNodeLayout[], crossSetEdges?: CrossSetEdge[], groups?: SetGroupCluster[]): Highway[] {
    if (nodes.length < 2) return []

    const nodeMap = new Map<string, SetNodeLayout>()
    for (const n of nodes) nodeMap.set(n.id, n)

    const nodeGroupMap = new Map<string, string>()
    if (groups) {
      for (const g of groups) {
        for (const id of g.setIds) nodeGroupMap.set(id, g.groupId)
      }
    }

    const highways: Highway[] = []
    const connected = new Set<string>()

    if (crossSetEdges && crossSetEdges.length > 0) {
      for (const edge of crossSetEdges) {
        const from = nodeMap.get(edge.fromSetId)
        const to = nodeMap.get(edge.toSetId)
        if (!from || !to) continue

        const key = [edge.fromSetId, edge.toSetId].sort().join('-')
        if (connected.has(key)) continue
        connected.add(key)

        highways.push({
          from: from.position,
          to: to.position,
          opacity: Math.min(0.6, 0.3 + edge.count * 0.08),
        })
      }
    }

    for (const node of nodes) {
      const nodeGroup = nodeGroupMap.get(node.id)
      const distances = nodes
        .filter((n) => {
          if (n.id === node.id) return false
          if (nodeGroupMap.size === 0) return true
          return nodeGroupMap.get(n.id) === nodeGroup
        })
        .map((n) => ({
          neighbor: n,
          dist: Math.sqrt(
            (n.position.x - node.position.x) ** 2 +
            (n.position.y - node.position.y) ** 2,
          ),
        }))
        .sort((a, b) => a.dist - b.dist)

      const maxConnections = Math.min(3, distances.length)
      let connectionCount = 0
      const maxDist = Math.max(...distances.map((d) => d.dist), 1)

      for (const { neighbor, dist } of distances) {
        if (connectionCount >= maxConnections) break

        const key = [node.id, neighbor.id].sort().join('-')
        if (connected.has(key)) {
          connectionCount++
          continue
        }

        connected.add(key)
        connectionCount++

        highways.push({
          from: node.position,
          to: neighbor.position,
          opacity: Math.max(0.15, 0.35 - (dist / maxDist) * 0.2),
        })
      }
    }

    return highways
  }

  return { computeSetPositions, computeHighways }
}
