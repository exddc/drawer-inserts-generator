import { material } from '@/lib/defaults'
import * as THREE from 'three'

const coordinatePrecision = 1e6
const geometryTolerance = 1e-7

/**
 * Build one indexed, watertight box solid.
 *
 * A bottomed box is deliberately not represented as an overlapping wall ring
 * and slab. Its underside, outside wall, inside wall, cavity floor, and rim are
 * stitched into one boundary so every mesh edge belongs to exactly two faces.
 */
export function buildBoxMesh(
    outerPoints: THREE.Vector2[],
    innerPoints: THREE.Vector2[],
    wallHeight: number,
    bottomThickness?: number
): THREE.Mesh {
    const outer = normalizeLoop(outerPoints)
    const inner = normalizeLoop(innerPoints)
    if (outer.length < 3 || inner.length < 3) {
        throw new Error('Cannot build box geometry from an invalid outline.')
    }

    const positions: number[] = []
    const indices: number[] = []
    const vertices = new Map<string, number>()

    const vertex = (point: THREE.Vector2, height: number): number => {
        const key = [point.x, height, point.y]
            .map((value) => Math.round(value * coordinatePrecision))
            .join(':')
        const existing = vertices.get(key)
        if (existing !== undefined) return existing

        const index = positions.length / 3
        positions.push(point.x, height, point.y)
        vertices.set(key, index)
        return index
    }

    const triangle = (
        a: THREE.Vector2,
        aHeight: number,
        b: THREE.Vector2,
        bHeight: number,
        c: THREE.Vector2,
        cHeight: number,
        reverse = false
    ) => {
        const face = [
            vertex(a, aHeight),
            vertex(b, bHeight),
            vertex(c, cHeight),
        ]
        if (reverse) face.reverse()
        if (new Set(face).size < 3) return

        const ab = new THREE.Vector3(b.x - a.x, bHeight - aHeight, b.y - a.y)
        const ac = new THREE.Vector3(c.x - a.x, cHeight - aHeight, c.y - a.y)
        if (ab.cross(ac).lengthSq() <= geometryTolerance ** 2) return
        indices.push(...face)
    }

    const horizontalSurface = (
        contour: THREE.Vector2[],
        holes: THREE.Vector2[][],
        height: number,
        faceUp: boolean
    ) => {
        const points = [...contour, ...holes.flat()]
        THREE.ShapeUtils.triangulateShape(contour, holes).forEach(([a, b, c]) =>
            triangle(
                points[a],
                height,
                points[b],
                height,
                points[c],
                height,
                faceUp
            )
        )
    }

    const sideSurface = (
        loop: THREE.Vector2[],
        bottom: number,
        top: number,
        faceInward: boolean
    ) => {
        loop.forEach((current, index) => {
            const next = loop[(index + 1) % loop.length]
            triangle(current, bottom, current, top, next, top, faceInward)
            triangle(current, bottom, next, top, next, bottom, faceInward)
        })
    }

    const ringSurface = (
        outerLoop: THREE.Vector2[],
        innerLoop: THREE.Vector2[],
        height: number,
        faceUp: boolean
    ) => {
        const outerProgress = loopProgress(outerLoop)
        const innerProgress = loopProgress(innerLoop)
        let outerIndex = 0
        let innerIndex = 0

        while (outerIndex < outerLoop.length || innerIndex < innerLoop.length) {
            const outerCurrent = outerLoop[outerIndex % outerLoop.length]
            const innerCurrent = innerLoop[innerIndex % innerLoop.length]
            const nextOuterProgress =
                outerIndex < outerLoop.length
                    ? outerProgress[outerIndex + 1]
                    : Infinity
            const nextInnerProgress =
                innerIndex < innerLoop.length
                    ? innerProgress[innerIndex + 1]
                    : Infinity

            if (
                Math.abs(nextOuterProgress - nextInnerProgress) <=
                geometryTolerance
            ) {
                const outerNext = outerLoop[(outerIndex + 1) % outerLoop.length]
                const innerNext = innerLoop[(innerIndex + 1) % innerLoop.length]
                triangle(
                    outerCurrent,
                    height,
                    outerNext,
                    height,
                    innerCurrent,
                    height,
                    faceUp
                )
                triangle(
                    outerNext,
                    height,
                    innerNext,
                    height,
                    innerCurrent,
                    height,
                    faceUp
                )
                outerIndex++
                innerIndex++
            } else if (nextOuterProgress < nextInnerProgress) {
                const outerNext = outerLoop[(outerIndex + 1) % outerLoop.length]
                triangle(
                    outerCurrent,
                    height,
                    outerNext,
                    height,
                    innerCurrent,
                    height,
                    faceUp
                )
                outerIndex++
            } else {
                const innerNext = innerLoop[(innerIndex + 1) % innerLoop.length]
                triangle(
                    outerCurrent,
                    height,
                    innerNext,
                    height,
                    innerCurrent,
                    height,
                    faceUp
                )
                innerIndex++
            }
        }
    }

    const hasBottom = bottomThickness !== undefined && bottomThickness > 0
    if (hasBottom) horizontalSurface(outer, [], 0, false)
    else ringSurface(outer, inner, 0, false)
    ringSurface(outer, inner, wallHeight, true)
    if (hasBottom) horizontalSurface(inner, [], bottomThickness, true)
    sideSurface(outer, 0, wallHeight, false)
    sideSurface(inner, hasBottom ? bottomThickness : 0, wallHeight, true)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    )
    geometry.setIndex(indices)
    validatePrintableGeometry(geometry)
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    const boxMaterial = new THREE.MeshStandardMaterial({
        color: material.standard.color,
        roughness: material.standard.roughness,
        metalness: material.standard.metalness,
        side: THREE.DoubleSide,
    })
    return new THREE.Mesh(geometry, boxMaterial)
}

function loopProgress(loop: THREE.Vector2[]): number[] {
    const lengths = loop.map((point, index) =>
        point.distanceTo(loop[(index + 1) % loop.length])
    )
    const total = lengths.reduce((sum, length) => sum + length, 0)
    const progress = [0]
    lengths.forEach((length) =>
        progress.push(progress.at(-1)! + length / total)
    )
    progress[progress.length - 1] = 1
    return progress
}

export function validatePrintableGeometry(
    geometry: THREE.BufferGeometry
): void {
    const position = geometry.getAttribute('position')
    const index = geometry.getIndex()
    if (!position || !index || index.count === 0 || index.count % 3 !== 0) {
        throw new Error('Printable mesh has no indexed triangle geometry.')
    }

    const edges = new Map<string, { count: number; balance: number }>()
    let signedVolume = 0
    for (let item = 0; item < index.count; item += 3) {
        const vertexIndices = [
            index.getX(item),
            index.getX(item + 1),
            index.getX(item + 2),
        ]
        const points = vertexIndices.map((vertexIndex) =>
            new THREE.Vector3().fromBufferAttribute(position, vertexIndex)
        )
        if (points.some((point) => !point.toArray().every(Number.isFinite))) {
            throw new Error('Printable mesh contains non-finite coordinates.')
        }
        if (
            new THREE.Triangle(points[0], points[1], points[2]).getArea() <=
            geometryTolerance
        ) {
            throw new Error('Printable mesh contains a degenerate triangle.')
        }

        signedVolume += points[0].dot(points[1].clone().cross(points[2])) / 6
        ;[
            [vertexIndices[0], vertexIndices[1]],
            [vertexIndices[1], vertexIndices[2]],
            [vertexIndices[2], vertexIndices[0]],
        ].forEach(([a, b]) => {
            const key = a < b ? `${a}:${b}` : `${b}:${a}`
            const edge = edges.get(key) ?? { count: 0, balance: 0 }
            edge.count++
            edge.balance += a < b ? 1 : -1
            edges.set(key, edge)
        })
    }

    const invalidEdges = [...edges.entries()].filter(
        ([, { count, balance }]) => count !== 2 || balance !== 0
    )
    const invalidEdgeCount = invalidEdges.length
    if (invalidEdgeCount > 0) {
        throw new Error(
            `Printable mesh is open or non-manifold (${invalidEdgeCount} invalid edges: ${invalidEdges
                .slice(0, 3)
                .map(([key, edge]) => `${key}=${edge.count}/${edge.balance}`)
                .join(', ')}).`
        )
    }
    if (!(signedVolume > geometryTolerance)) {
        throw new Error('Printable mesh has a non-positive signed volume.')
    }
}

function normalizeLoop(points: THREE.Vector2[]): THREE.Vector2[] {
    const normalized: THREE.Vector2[] = []
    points.forEach((point) => {
        if (!point.toArray().every(Number.isFinite)) {
            throw new Error('Cannot build box geometry with non-finite points.')
        }
        const previous = normalized.at(-1)
        if (!previous || previous.distanceTo(point) > geometryTolerance) {
            normalized.push(point.clone())
        }
    })
    if (
        normalized.length > 1 &&
        normalized[0].distanceTo(normalized.at(-1)!) <= geometryTolerance
    ) {
        normalized.pop()
    }

    let changed = true
    while (changed && normalized.length >= 3) {
        changed = false
        for (let index = 0; index < normalized.length; index++) {
            const previous =
                normalized[(index + normalized.length - 1) % normalized.length]
            const current = normalized[index]
            const next = normalized[(index + 1) % normalized.length]
            const first = current.clone().sub(previous)
            const second = next.clone().sub(current)
            const cross = first.x * second.y - first.y * second.x
            if (
                Math.abs(cross) <= geometryTolerance &&
                first.dot(second) >= 0
            ) {
                normalized.splice(index, 1)
                changed = true
                break
            }
        }
    }
    return normalized
}
