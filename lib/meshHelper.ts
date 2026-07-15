import { material } from '@/lib/defaults'
import * as THREE from 'three'

const coordinatePrecision = 1e6

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

    const hasBottom = bottomThickness !== undefined && bottomThickness > 0
    horizontalSurface(outer, hasBottom ? [] : [inner], 0, false)
    horizontalSurface(outer, [inner], wallHeight, true)
    if (hasBottom) horizontalSurface(inner, [], bottomThickness, true)
    sideSurface(outer, 0, wallHeight, false)
    sideSurface(inner, hasBottom ? bottomThickness : 0, wallHeight, true)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    )
    geometry.setIndex(indices)
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

function normalizeLoop(points: THREE.Vector2[]): THREE.Vector2[] {
    const normalized: THREE.Vector2[] = []
    points.forEach((point) => {
        if (!normalized.at(-1)?.equals(point)) normalized.push(point.clone())
    })
    if (normalized.length > 1 && normalized[0].equals(normalized.at(-1)!)) {
        normalized.pop()
    }
    return normalized
}
