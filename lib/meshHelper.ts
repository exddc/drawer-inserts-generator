import { material } from '@/lib/defaults'
import type { RoundedOutlineGeometry } from '@/lib/lineHelper'
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
    outerOutline: RoundedOutlineGeometry,
    innerOutline: RoundedOutlineGeometry,
    wallHeight: number,
    bottomThickness?: number
): THREE.Mesh {
    const outer = normalizeLoop(outerOutline.points)
    const inner = normalizeLoop(innerOutline.points)
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
        if (new Set(face).size < 3) {
            throw new Error('Printable mesh triangulation collapsed a face.')
        }

        const ab = new THREE.Vector3(b.x - a.x, bHeight - aHeight, b.y - a.y)
        const ac = new THREE.Vector3(c.x - a.x, cHeight - aHeight, c.y - a.y)
        if (ab.cross(ac).lengthSq() <= geometryTolerance ** 2) {
            throw new Error(
                'Printable mesh triangulation produced a degenerate face.'
            )
        }
        indices.push(...face)
    }

    const horizontalSurface = (
        contour: THREE.Vector2[],
        height: number,
        faceUp: boolean
    ) => {
        triangulateSimplePolygon(contour).forEach(([a, b, c]) =>
            triangle(
                contour[a],
                height,
                contour[b],
                height,
                contour[c],
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
        if (Math.abs(top - bottom) <= geometryTolerance) return
        loop.forEach((current, index) => {
            const next = loop[(index + 1) % loop.length]
            triangle(current, bottom, current, top, next, top, faceInward)
            triangle(current, bottom, next, top, next, bottom, faceInward)
        })
    }

    const ringSurface = (
        outerCorners: THREE.Vector2[][],
        innerCorners: THREE.Vector2[][],
        height: number,
        faceUp: boolean
    ) => {
        if (outerCorners.length !== innerCorners.length) {
            throw new Error('Printable mesh outlines have mismatched corners.')
        }

        outerCorners.forEach((outerCorner, cornerIndex) => {
            const innerCorner = innerCorners[cornerIndex]
            if (outerCorner.length === 1) {
                for (let index = 0; index < innerCorner.length - 1; index++) {
                    triangle(
                        outerCorner[0],
                        height,
                        innerCorner[index + 1],
                        height,
                        innerCorner[index],
                        height,
                        faceUp
                    )
                }
            } else if (innerCorner.length === 1) {
                for (let index = 0; index < outerCorner.length - 1; index++) {
                    triangle(
                        outerCorner[index],
                        height,
                        outerCorner[index + 1],
                        height,
                        innerCorner[0],
                        height,
                        faceUp
                    )
                }
            } else {
                if (outerCorner.length !== innerCorner.length) {
                    throw new Error(
                        'Printable mesh rounded corners have mismatched samples.'
                    )
                }
                for (let index = 0; index < outerCorner.length - 1; index++) {
                    const outerCurrent = outerCorner[index]
                    const outerNext = outerCorner[index + 1]
                    const innerCurrent = innerCorner[index]
                    const innerNext = innerCorner[index + 1]
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
                }
            }

            const nextCorner = (cornerIndex + 1) % outerCorners.length
            const outerCurrent = outerCorner.at(-1)!
            const outerNext = outerCorners[nextCorner][0]
            const innerCurrent = innerCorner.at(-1)!
            const innerNext = innerCorners[nextCorner][0]
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
        })
    }

    const hasBottom = bottomThickness !== undefined && bottomThickness > 0
    if (hasBottom) horizontalSurface(outer, 0, false)
    else ringSurface(outerOutline.corners, innerOutline.corners, 0, false)
    ringSurface(outerOutline.corners, innerOutline.corners, wallHeight, true)
    if (hasBottom) horizontalSurface(inner, bottomThickness, true)
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

/**
 * Triangulate one validated, hole-free outline while retaining its boundary
 * vertices. Three.js delegates this case to Earcut, which can choose a
 * zero-area ear when a concave orthogonal outline and its rounded samples line
 * up. A local ear clipper can reject those ears without dropping any boundary
 * edge, keeping the horizontal faces stitched to the side walls.
 */
function triangulateSimplePolygon(
    points: THREE.Vector2[]
): [number, number, number][] {
    if (points.length < 3) {
        throw new Error(
            'Cannot triangulate a printable face with fewer than 3 points.'
        )
    }

    const order = points.map((_, index) => index)
    if (signedArea(points) < 0) order.reverse()

    const previous: number[] = []
    const next: number[] = []
    const active = points.map(() => true)
    order.forEach((index, position) => {
        previous[index] = order[(position + order.length - 1) % order.length]
        next[index] = order[(position + 1) % order.length]
    })

    const isEar = (currentIndex: number): boolean => {
        if (!active[currentIndex]) return false

        const previousIndex = previous[currentIndex]
        const nextIndex = next[currentIndex]
        const previousPoint = points[previousIndex]
        const currentPoint = points[currentIndex]
        const nextPoint = points[nextIndex]
        if (
            cross2d(previousPoint, currentPoint, nextPoint) <=
            geometryTolerance * 2
        ) {
            return false
        }

        return !active.some(
            (isActive, candidateIndex) =>
                isActive &&
                candidateIndex !== previousIndex &&
                candidateIndex !== currentIndex &&
                candidateIndex !== nextIndex &&
                pointInOrOnTriangle(
                    points[candidateIndex],
                    previousPoint,
                    currentPoint,
                    nextPoint
                )
        )
    }

    const ears = new Set(order.filter(isEar))
    const refreshEar = (index: number) => {
        ears.delete(index)
        if (isEar(index)) ears.add(index)
    }

    const triangles: [number, number, number][] = []
    let remainingCount = points.length
    while (remainingCount > 3) {
        if (ears.size === 0) {
            active.forEach((isActive, index) => {
                if (isActive && isEar(index)) ears.add(index)
            })
        }
        if (ears.size === 0) {
            throw new Error(
                'Printable mesh face could not be triangulated without degenerate triangles.'
            )
        }

        let currentIndex = -1
        let bestEarArea = -Infinity
        ears.forEach((candidateIndex) => {
            const area = cross2d(
                points[previous[candidateIndex]],
                points[candidateIndex],
                points[next[candidateIndex]]
            )
            if (area > bestEarArea) {
                bestEarArea = area
                currentIndex = candidateIndex
            }
        })

        const previousIndex = previous[currentIndex]
        const nextIndex = next[currentIndex]
        triangles.push([previousIndex, currentIndex, nextIndex])
        active[currentIndex] = false
        remainingCount--
        ears.delete(currentIndex)
        next[previousIndex] = nextIndex
        previous[nextIndex] = previousIndex
        refreshEar(previousIndex)
        refreshEar(nextIndex)
    }

    const first = active.findIndex(Boolean)
    const remaining = [first, next[first], next[next[first]]]

    if (
        cross2d(
            points[remaining[0]],
            points[remaining[1]],
            points[remaining[2]]
        ) <=
        geometryTolerance * 2
    ) {
        throw new Error('Printable mesh face ended with a degenerate triangle.')
    }
    triangles.push([remaining[0], remaining[1], remaining[2]])
    return triangles
}

function signedArea(points: THREE.Vector2[]): number {
    return points.reduce((area, point, index) => {
        const next = points[(index + 1) % points.length]
        return area + point.x * next.y - next.x * point.y
    }, 0)
}

function cross2d(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function pointInOrOnTriangle(
    point: THREE.Vector2,
    a: THREE.Vector2,
    b: THREE.Vector2,
    c: THREE.Vector2
): boolean {
    return (
        cross2d(a, b, point) >= -geometryTolerance &&
        cross2d(b, c, point) >= -geometryTolerance &&
        cross2d(c, a, point) >= -geometryTolerance
    )
}
