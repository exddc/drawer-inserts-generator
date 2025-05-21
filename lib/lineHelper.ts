import { Grid } from '@/lib/types'
import * as THREE from 'three'

export function getOutline(grid: Grid, groupId: number): THREE.Vector2[] {
    const rows = grid.length
    const cols = grid[0].length

    // gather column‐widths from the 0th row
    const widths = grid[0].map((c) => c.width)
    // gather row‐depths   from the 0th column
    const depths = grid.map((row) => row[0].depth)

    // build prefix sums
    const cumW = [0]
    widths.forEach((w) => cumW.push(cumW[cumW.length - 1] + w))
    const cumD = [0]
    depths.forEach((d) => cumD.push(cumD[cumD.length - 1] + d))
    type Seg = { a: THREE.Vector2; b: THREE.Vector2 }
    const segs: Seg[] = []

    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            if (grid[z][x].group !== groupId) continue
            if (z === 0 || grid[z - 1][x].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x, z),
                    b: new THREE.Vector2(x + 1, z),
                })
            if (x === cols - 1 || grid[z][x + 1].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x + 1, z),
                    b: new THREE.Vector2(x + 1, z + 1),
                })
            if (z === rows - 1 || grid[z + 1][x].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x + 1, z + 1),
                    b: new THREE.Vector2(x, z + 1),
                })
            if (x === 0 || grid[z][x - 1].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x, z + 1),
                    b: new THREE.Vector2(x, z),
                })
        }
    }

    const loop: THREE.Vector2[] = []
    let cur = segs.shift()!
    loop.push(cur.a, cur.b)
    while (segs.length) {
        const tail = loop[loop.length - 1]
        const idx = segs.findIndex((s) => s.a.equals(tail))
        if (idx === -1) break
        loop.push(segs[idx].b)
        segs.splice(idx, 1)
    }
    if (loop.length > 1 && loop[0].equals(loop[loop.length - 1])) {
        loop.pop()
    }
    return loop.map((p) => new THREE.Vector2(cumW[p.x], cumD[p.y]))
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
