import { Grid } from '@/lib/types'
import * as THREE from 'three'

type Segment = { a: THREE.Vector2; b: THREE.Vector2 }

export type OutlineTopologyCode =
    | 'disconnected'
    | 'self-intersection'
    | 'incomplete-boundary'
    | 'contains-hole'

export class OutlineTopologyError extends Error {
    constructor(
        readonly groupId: number,
        readonly code: OutlineTopologyCode,
        message: string
    ) {
        super(`Cannot build outline for group ${groupId}: ${message}.`)
        this.name = 'OutlineTopologyError'
    }
}

export function getOutline(grid: Grid, groupId: number): THREE.Vector2[] {
    if (grid.length === 0 || grid[0].length === 0) {
        throw new Error('Cannot build an outline for an empty grid.')
    }

    const rows = grid.length
    const cols = grid[0].length
    if (grid.some((row) => row.length !== cols)) {
        throw new Error('Cannot build an outline for a non-rectangular grid.')
    }
    if (
        grid.some((row) =>
            row.some(
                (cell) =>
                    !Number.isFinite(cell.width) ||
                    cell.width <= 0 ||
                    !Number.isFinite(cell.depth) ||
                    cell.depth <= 0
            )
        )
    ) {
        throw new Error(
            'Cannot build an outline with non-positive or non-finite cell dimensions.'
        )
    }

    // gather column‐widths from the 0th row
    const widths = grid[0].map((c) => c.width)
    // gather row‐depths   from the 0th column
    const depths = grid.map((row) => row[0].depth)

    // build prefix sums
    const cumW = [0]
    widths.forEach((w) => cumW.push(cumW[cumW.length - 1] + w))
    const cumD = [0]
    depths.forEach((d) => cumD.push(cumD[cumD.length - 1] + d))
    const cells: THREE.Vector2[] = []
    const segments: Segment[] = []

    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            if (grid[z][x].group !== groupId) continue
            cells.push(new THREE.Vector2(x, z))
            if (z === 0 || grid[z - 1][x].group !== groupId)
                segments.push({
                    a: new THREE.Vector2(x, z),
                    b: new THREE.Vector2(x + 1, z),
                })
            if (x === cols - 1 || grid[z][x + 1].group !== groupId)
                segments.push({
                    a: new THREE.Vector2(x + 1, z),
                    b: new THREE.Vector2(x + 1, z + 1),
                })
            if (z === rows - 1 || grid[z + 1][x].group !== groupId)
                segments.push({
                    a: new THREE.Vector2(x + 1, z + 1),
                    b: new THREE.Vector2(x, z + 1),
                })
            if (x === 0 || grid[z][x - 1].group !== groupId)
                segments.push({
                    a: new THREE.Vector2(x, z + 1),
                    b: new THREE.Vector2(x, z),
                })
        }
    }

    if (segments.length === 0) {
        throw new Error(`Cannot build an outline for missing group ${groupId}.`)
    }

    if (!cellsAreConnected(cells)) {
        throw outlineError(groupId, 'disconnected')
    }

    const outgoing = new Map<string, number[]>()
    const incoming = new Map<string, number[]>()
    segments.forEach((segment, index) => {
        addEdge(outgoing, pointKey(segment.a), index)
        addEdge(incoming, pointKey(segment.b), index)
    })

    const vertices = new Set([...outgoing.keys(), ...incoming.keys()])
    for (const vertex of vertices) {
        const outgoingCount = outgoing.get(vertex)?.length ?? 0
        const incomingCount = incoming.get(vertex)?.length ?? 0
        if (outgoingCount > 1 || incomingCount > 1) {
            throw outlineError(groupId, 'self-intersection')
        }
        if (outgoingCount !== 1 || incomingCount !== 1) {
            throw outlineError(groupId, 'incomplete-boundary')
        }
    }

    const loop: THREE.Vector2[] = []
    const used = new Set<number>()
    const startKey = pointKey(segments[0].a)
    let currentIndex = 0
    let closed = false

    while (!used.has(currentIndex)) {
        const segment = segments[currentIndex]
        used.add(currentIndex)
        loop.push(segment.a)

        const nextKey = pointKey(segment.b)
        if (nextKey === startKey) {
            closed = true
            break
        }

        const next = outgoing.get(nextKey)
        if (!next || next.length !== 1 || used.has(next[0])) {
            throw outlineError(groupId, 'incomplete-boundary')
        }
        currentIndex = next[0]
    }

    if (!closed) {
        throw outlineError(groupId, 'incomplete-boundary')
    }
    if (used.size !== segments.length) {
        throw outlineError(groupId, 'contains-hole')
    }
    // Positive dimensions make both coordinate maps strictly increasing, so
    // the validated grid-space topology cannot gain intersections here.
    return loop.map((point) => new THREE.Vector2(cumW[point.x], cumD[point.y]))
}

function pointKey(point: THREE.Vector2): string {
    return `${point.x},${point.y}`
}

function addEdge(map: Map<string, number[]>, key: string, index: number): void {
    const edges = map.get(key) ?? []
    edges.push(index)
    map.set(key, edges)
}

function outlineError(
    groupId: number,
    code: OutlineTopologyCode
): OutlineTopologyError {
    const messages: Record<OutlineTopologyCode, string> = {
        disconnected: 'region is disconnected',
        'self-intersection': 'boundary self-intersects',
        'incomplete-boundary': 'boundary loop could not be completed',
        'contains-hole': 'region contains a hole',
    }
    return new OutlineTopologyError(groupId, code, messages[code])
}

function cellsAreConnected(cells: THREE.Vector2[]): boolean {
    const remaining = new Set(cells.map(pointKey))
    const pending = [cells[0]]
    remaining.delete(pointKey(cells[0]))

    while (pending.length > 0) {
        const cell = pending.pop()!
        const neighbors = [
            new THREE.Vector2(cell.x - 1, cell.y),
            new THREE.Vector2(cell.x + 1, cell.y),
            new THREE.Vector2(cell.x, cell.y - 1),
            new THREE.Vector2(cell.x, cell.y + 1),
        ]
        neighbors.forEach((neighbor) => {
            const key = pointKey(neighbor)
            if (!remaining.delete(key)) return
            pending.push(neighbor)
        })
    }

    return remaining.size === 0
}

export function offsetPolygonCCW(pts: THREE.Vector2[], t: number) {
    const N = pts.length
    const inner: THREE.Vector2[] = []
    for (let i = 0; i < N; i++) {
        const prev = pts[(i + N - 1) % N],
            curr = pts[i],
            next = pts[(i + 1) % N]

        const d1 = curr.clone().sub(prev).normalize()
        const d2 = next.clone().sub(curr).normalize()
        const n1 = new THREE.Vector2(-d1.y, d1.x)
        const n2 = new THREE.Vector2(-d2.y, d2.x)

        const p1 = prev.clone().addScaledVector(n1, t)
        const p2 = curr.clone().addScaledVector(n2, t)
        const diff = p2.clone().sub(p1)
        const crossD = d1.x * d2.y - d1.y * d2.x

        let pt: THREE.Vector2
        if (Math.abs(crossD) > 1e-6) {
            const s = (diff.x * d2.y - diff.y * d2.x) / crossD
            pt = p1.clone().addScaledVector(d1, s)
        } else {
            pt = curr.clone().addScaledVector(n1, t)
        }
        inner.push(pt)
    }
    return inner
}

export type RoundedOutlineGeometry = {
    points: THREE.Vector2[]
    corners: THREE.Vector2[][]
}

export function getRoundedOutlineGeometry(
    pts: THREE.Vector2[],
    radius: number,
    segmentsPerCorner = 5,
    corner_radius: number,
    wall_thickness: number
): RoundedOutlineGeometry {
    const outline = removeCollinearOutlinePoints(pts)
    if (outline.length < 3) return { points: outline, corners: [] }
    if (radius <= 0 && corner_radius <= 0) {
        const corners = outline.map((point) => [point.clone()])
        return { points: corners.flat(), corners }
    }
    const pointCount = outline.length
    const corners: THREE.Vector2[][] = []

    for (let i = 0; i < pointCount; i++) {
        const prev = outline[(i + pointCount - 1) % pointCount]
        const curr = outline[i]
        const next = outline[(i + 1) % pointCount]

        const previousEdge = curr.clone().sub(prev)
        const nextEdge = next.clone().sub(curr)
        const previousLength = previousEdge.length()
        const nextLength = nextEdge.length()
        if (previousLength === 0 || nextLength === 0) continue

        const dPrev = previousEdge.divideScalar(previousLength)
        const dNext = nextEdge.divideScalar(nextLength)
        const cross = dPrev.x * dNext.y - dPrev.y * dNext.x
        if (Math.abs(cross) <= 1e-10) {
            corners.push([curr.clone()])
            continue
        }

        const requestedRadius =
            cross > 0
                ? radius
                : radius === corner_radius
                  ? corner_radius - wall_thickness
                  : corner_radius
        const r = Math.min(
            Math.max(0, requestedRadius),
            previousLength / 2,
            nextLength / 2
        )
        if (r <= 1e-8) {
            corners.push([curr.clone()])
            continue
        }

        const pA = curr.clone().addScaledVector(dPrev, -r)
        const pB = curr.clone().addScaledVector(dNext, r)
        const corner: THREE.Vector2[] = []
        pushUniquePoint(corner, pA)
        for (let segment = 1; segment <= segmentsPerCorner; segment++) {
            const t = segment / segmentsPerCorner
            const inverse = 1 - t
            pushUniquePoint(
                corner,
                new THREE.Vector2(
                    inverse * inverse * pA.x +
                        2 * inverse * t * curr.x +
                        t * t * pB.x,
                    inverse * inverse * pA.y +
                        2 * inverse * t * curr.y +
                        t * t * pB.y
                )
            )
        }
        corners.push(corner)
    }

    return { points: corners.flat(), corners }
}

export function getRoundedOutline(
    pts: THREE.Vector2[],
    radius: number,
    segmentsPerCorner = 5,
    corner_radius: number,
    wall_thickness: number
): THREE.Vector2[] {
    return getRoundedOutlineGeometry(
        pts,
        radius,
        segmentsPerCorner,
        corner_radius,
        wall_thickness
    ).points
}

function pushUniquePoint(points: THREE.Vector2[], point: THREE.Vector2): void {
    const previous = points.at(-1)
    if (previous && previous.distanceTo(point) <= 1e-8) return
    points.push(point.clone())
}

function removeCollinearOutlinePoints(
    points: THREE.Vector2[]
): THREE.Vector2[] {
    return points
        .filter((current, index) => {
            const previous = points[(index + points.length - 1) % points.length]
            const next = points[(index + 1) % points.length]
            const first = current.clone().sub(previous)
            const second = next.clone().sub(current)
            return Math.abs(first.x * second.y - first.y * second.x) > 1e-10
        })
        .map((point) => point.clone())
}

export function createCornerLines(
    outlinePoints: THREE.Vector2[],
    height: number,
    color: number,
    opacity: number,
    bottomThickness: number,
    inner = false
): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry()
    const positions: number[] = []

    outlinePoints.forEach((point) => {
        positions.push(point.x, 0, point.y)
        positions.push(point.x, height, point.y)
    })

    for (let i = 0; i < outlinePoints.length; i++) {
        const current = outlinePoints[i]
        const next = outlinePoints[(i + 1) % outlinePoints.length]
        const lowerHeight = inner ? bottomThickness : 0

        positions.push(current.x, lowerHeight, current.y)
        positions.push(next.x, lowerHeight, next.y)
        positions.push(current.x, height, current.y)
        positions.push(next.x, height, next.y)
    }

    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    )

    const material = new THREE.LineBasicMaterial({
        color,
        opacity,
        transparent: true,
        linewidth: 1,
    })

    const lines = new THREE.LineSegments(geometry, material)
    lines.name = 'corner-lines'
    return lines
}
