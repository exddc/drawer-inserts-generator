import { Grid } from '@/lib/types'
import * as THREE from 'three'

type Segment = { a: THREE.Vector2; b: THREE.Vector2 }

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
        throw outlineError(groupId, 'region is disconnected')
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
            throw outlineError(groupId, 'boundary self-intersects')
        }
        if (outgoingCount !== 1 || incomingCount !== 1) {
            throw outlineError(groupId, 'boundary loop could not be completed')
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
            throw outlineError(groupId, 'boundary loop could not be completed')
        }
        currentIndex = next[0]
    }

    if (!closed) {
        throw outlineError(groupId, 'boundary loop could not be completed')
    }
    if (used.size !== segments.length) {
        throw outlineError(groupId, 'region contains a hole')
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

function outlineError(groupId: number, reason: string): Error {
    return new Error(`Cannot build outline for group ${groupId}: ${reason}.`)
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

export function getRoundedOutline(
    pts: THREE.Vector2[],
    radius: number,
    segmentsPerCorner = 5,
    corner_radius: number,
    wall_thickness: number
): THREE.Vector2[] {
    if (radius <= 0 || pts.length < 3) return pts.slice()
    const N = pts.length
    const path = new THREE.Path()

    const prev0 = pts[N - 1]
    const curr0 = pts[0]
    const d0 = curr0.clone().sub(prev0).normalize()
    path.moveTo(curr0.x - d0.x * radius, curr0.y - d0.y * radius)

    for (let i = 0; i < N; i++) {
        const prev = pts[(i + N - 1) % N]
        const curr = pts[i]
        const next = pts[(i + 1) % N]

        const dPrev = curr.clone().sub(prev).normalize()
        const dNext = next.clone().sub(curr).normalize()
        const cross = dPrev.x * dNext.y - dPrev.y * dNext.x
        const isConvex = cross >= 0

        const r = isConvex
            ? radius
            : radius === corner_radius
              ? corner_radius - wall_thickness
              : corner_radius

        const pA = curr.clone().addScaledVector(dPrev, -r)
        const pB = curr.clone().addScaledVector(dNext, r)

        path.lineTo(pA.x, pA.y)
        path.quadraticCurveTo(curr.x, curr.y, pB.x, pB.y)
    }

    path.closePath()
    const ptsOut = path.getPoints(N * segmentsPerCorner)
    return ptsOut.map((p) => new THREE.Vector2(p.x, p.y))
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
