import { generateCustomBox } from '@/lib/boxHelper'
import {
    canCombineGridBoxes,
    combineGridBoxes,
    getNextAvailableGroupId,
} from '@/lib/gridCombine'
import { gridMatchesLayout, resizeGrid } from '@/lib/gridHelper'
import {
    getGridBoxes,
    isGridBoxVisible,
    setGridBoxVisible,
} from '@/lib/gridVisibility'
import { getOutline } from '@/lib/lineHelper'
import { sanitizeModelParameters } from '@/lib/parameterValidation'
import { useStore } from '@/lib/store'
import { Grid } from '@/lib/types'
import * as THREE from 'three'
import { beforeEach, describe, expect, it } from 'vitest'

function points(outline: ReturnType<typeof getOutline>): string[] {
    return outline.map((point) => `${point.x},${point.y}`)
}

function signedArea(outline: ReturnType<typeof getOutline>): number {
    return outline.reduce((sum, point, index) => {
        const next = outline[(index + 1) % outline.length]
        return sum + point.x * next.y - next.x * point.y
    }, 0)
}

function meshes(object: THREE.Object3D): THREE.Mesh[] {
    const result: THREE.Mesh[] = []
    object.traverse((child) => {
        if (child instanceof THREE.Mesh) result.push(child)
    })
    return result
}

function expectFiniteGeometry(object: THREE.Object3D): void {
    const objectMeshes = meshes(object)
    expect(objectMeshes.length).toBeGreaterThan(0)

    objectMeshes.forEach((mesh) => {
        const position = mesh.geometry.getAttribute('position')
        expect(position.count).toBeGreaterThan(0)

        for (let index = 0; index < position.count; index++) {
            expect(Number.isFinite(position.getX(index))).toBe(true)
            expect(Number.isFinite(position.getY(index))).toBe(true)
            expect(Number.isFinite(position.getZ(index))).toBe(true)
        }
    })
}

function boundingSize(object: THREE.Object3D): THREE.Vector3 {
    object.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(object)
    const size = new THREE.Vector3()
    box.getSize(size)
    return size
}

function footprintPoints(object: THREE.Object3D): Set<string> {
    object.updateMatrixWorld(true)

    const footprint = new Set<string>()
    meshes(object).forEach((mesh) => {
        const position = mesh.geometry.getAttribute('position')
        const vector = new THREE.Vector3()

        for (let index = 0; index < position.count; index++) {
            vector
                .set(
                    position.getX(index),
                    position.getY(index),
                    position.getZ(index)
                )
                .applyMatrix4(mesh.matrixWorld)
            footprint.add(`${Math.round(vector.x)},${Math.round(vector.z)}`)
        }
    })

    return footprint
}

function hasFootprintPoint(
    footprint: Set<string>,
    predicate: (x: number, z: number) => boolean
): boolean {
    return Array.from(footprint).some((point) => {
        const [x, z] = point.split(',').map(Number)
        return predicate(x, z)
    })
}

function projectedTriangleArea(mesh: THREE.Mesh): number {
    mesh.updateMatrixWorld(true)

    const position = mesh.geometry.getAttribute('position')
    const index = mesh.geometry.getIndex()
    const vertex = new THREE.Vector3()
    const triangle: THREE.Vector3[] = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
    ]
    let area = 0

    const readVertex = (vertexIndex: number, target: THREE.Vector3) => {
        target
            .set(
                position.getX(vertexIndex),
                position.getY(vertexIndex),
                position.getZ(vertexIndex)
            )
            .applyMatrix4(mesh.matrixWorld)
    }

    const triangleCount = (index?.count ?? position.count) / 3
    for (
        let triangleIndex = 0;
        triangleIndex < triangleCount;
        triangleIndex++
    ) {
        for (let corner = 0; corner < 3; corner++) {
            const rawIndex = triangleIndex * 3 + corner
            readVertex(index ? index.getX(rawIndex) : rawIndex, vertex)
            triangle[corner].copy(vertex)
        }

        area +=
            Math.abs(
                triangle[0].x * (triangle[1].z - triangle[2].z) +
                    triangle[1].x * (triangle[2].z - triangle[0].z) +
                    triangle[2].x * (triangle[0].z - triangle[1].z)
            ) / 2
    }

    return area
}

describe('geometry outlines', () => {
    it('builds the outline for a rectangular cell', () => {
        const grid: Grid = [[{ group: 0, width: 30, depth: 20 }]]

        const outline = getOutline(grid, 0)

        expect(points(outline)).toEqual(['0,0', '30,0', '30,20', '0,20'])
        expect(outline[0].equals(outline[outline.length - 1])).toBe(false)
        expect(new Set(points(outline)).size).toBe(outline.length)
        expect(signedArea(outline)).toBeGreaterThan(0)
    })

    it('builds the ordered outline for an L-shaped combined box', () => {
        const grid: Grid = [
            [
                { group: 1, width: 10, depth: 30 },
                { group: 1, width: 20, depth: 30 },
            ],
            [
                { group: 1, width: 10, depth: 40 },
                { group: 0, width: 20, depth: 40 },
            ],
        ]

        const outline = getOutline(grid, 1)

        expect(points(outline)).toEqual([
            '0,0',
            '10,0',
            '30,0',
            '30,30',
            '10,30',
            '10,70',
            '0,70',
            '0,30',
        ])
        expect(outline[0].equals(outline[outline.length - 1])).toBe(false)
        expect(new Set(points(outline)).size).toBe(outline.length)
        expect(signedArea(outline)).toBeGreaterThan(0)
    })

    it('rejects disconnected cells that share one group id', () => {
        const grid: Grid = [
            [
                { group: 9, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
                { group: 9, width: 10, depth: 10 },
            ],
        ]

        expect(() => getOutline(grid, 9)).toThrow(
            'Cannot build a single outline for group 9 with disconnected cells or holes.'
        )
    })

    it('rejects holed groups that need multiple outline loops', () => {
        const grid: Grid = [
            [
                { group: 8, width: 10, depth: 10 },
                { group: 8, width: 10, depth: 10 },
                { group: 8, width: 10, depth: 10 },
            ],
            [
                { group: 8, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
                { group: 8, width: 10, depth: 10 },
            ],
            [
                { group: 8, width: 10, depth: 10 },
                { group: 8, width: 10, depth: 10 },
                { group: 8, width: 10, depth: 10 },
            ],
        ]

        expect(() => getOutline(grid, 8)).toThrow(
            'Cannot build a single outline for group 8 with disconnected cells or holes.'
        )
    })
})

describe('box generation', () => {
    beforeEach(() => {
        useStore.setState({ wallHeight: 30, showCornerLines: false })
    })

    it('generates valid wall and bottom meshes for rectangular boxes', () => {
        const grid: Grid = [[{ group: 0, width: 30, depth: 20 }]]
        const box = generateCustomBox(grid, 2, 4, true)
        const cell = box.children[0]
        const size = boundingSize(cell)

        expect(box.children).toHaveLength(1)
        expect(meshes(cell)).toHaveLength(2)
        expect(cell.visible).toBe(true)
        expect(getGridBoxes(grid, 30)[0].dimensions).toMatchObject({
            width: 30,
            depth: 20,
        })
        expect(size.x).toBeCloseTo(30)
        expect(size.y).toBeCloseTo(30)
        expect(size.z).toBeCloseTo(20)
        expectFiniteGeometry(cell)
    })

    it('omits bottom geometry when bottom generation is disabled', () => {
        const grid: Grid = [[{ group: 0, width: 30, depth: 20 }]]

        expect(meshes(generateCustomBox(grid, 2, 4, false))).toHaveLength(1)
        expect(meshes(generateCustomBox(grid, 2, 4, true))).toHaveLength(2)
    })

    it('generates one box for combined cells and split boxes after ungrouping', () => {
        const grid: Grid = [
            [
                { group: 4, width: 25, depth: 40 },
                { group: 4, width: 35, depth: 40 },
            ],
        ]
        const combined = generateCustomBox(grid, 2, 4, false)

        expect(combined.children).toHaveLength(1)
        expect(combined.children[0].name).toBe('group:4')
        expect(getGridBoxes(grid, 30)[0].dimensions).toMatchObject({
            width: 60,
            depth: 40,
        })

        grid[0][0].group = 0
        grid[0][1].group = 0
        const split = generateCustomBox(grid, 2, 4, false)

        expect(split.children).toHaveLength(2)
        expect(split.children.map((child) => child.name)).toEqual([
            'cell:0:0',
            'cell:1:0',
        ])
        expect(
            getGridBoxes(grid, 30).map((box) => box.dimensions.width)
        ).toEqual([25, 35])
        split.children.forEach(expectFiniteGeometry)
    })

    it('generates finite mesh geometry for non-uniform L-shaped groups', () => {
        const grid: Grid = [
            [
                { group: 7, width: 10, depth: 30 },
                { group: 7, width: 20, depth: 30 },
            ],
            [
                { group: 7, width: 10, depth: 40 },
                { group: 0, width: 20, depth: 40 },
            ],
        ]
        const box = generateCustomBox(grid, 2, 0, true)
        const combined = box.children.find((child) => child.name === 'group:7')
        const metadata = getGridBoxes(grid, 30).find(
            (entry) => entry.id === 'group:7'
        )

        expect(combined).toBeDefined()
        expect(meshes(combined!)).toHaveLength(2)
        expect(metadata?.cells).toEqual([
            { x: 0, z: 0 },
            { x: 1, z: 0 },
            { x: 0, z: 1 },
        ])
        expect(metadata?.dimensions).toMatchObject({
            width: 30,
            depth: 70,
        })

        const size = boundingSize(combined!)
        expect(size.x).toBeCloseTo(30)
        expect(size.y).toBeCloseTo(30)
        expect(size.z).toBeCloseTo(70)
        expectFiniteGeometry(combined!)

        const combinedMeshes = meshes(combined!)
        const bottomMesh = combinedMeshes[1]
        expect(projectedTriangleArea(bottomMesh) / 2).toBeCloseTo(1300)

        const footprint = footprintPoints(combined!)
        expect(hasFootprintPoint(footprint, (x, z) => x >= 28 && z <= 30)).toBe(
            true
        )
        expect(hasFootprintPoint(footprint, (x, z) => x <= 10 && z >= 68)).toBe(
            true
        )
        expect(
            hasFootprintPoint(
                footprint,
                (x, z) => x >= 8 && x <= 12 && z >= 28 && z <= 32
            )
        ).toBe(true)
        expect(hasFootprintPoint(footprint, (x, z) => x >= 28 && z >= 68)).toBe(
            false
        )
    })

    it('rejects disconnected combined groups before mesh generation', () => {
        const grid: Grid = [
            [
                { group: 6, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
                { group: 6, width: 20, depth: 20 },
            ],
        ]

        expect(() => generateCustomBox(grid, 2, 0, true)).toThrow(
            'Cannot build a single outline for group 6 with disconnected cells or holes.'
        )
    })
})

describe('grid combine policy', () => {
    it('combines adjacent selected boxes before geometry generation', () => {
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]
        const boxes = [{ cells: [{ x: 0, z: 0 }] }, { cells: [{ x: 1, z: 0 }] }]

        expect(canCombineGridBoxes(grid, boxes)).toBe(true)
        expect(
            combineGridBoxes(grid, boxes, getNextAvailableGroupId(grid))
        ).toBe(true)
        expect(grid[0].map((cell) => cell.group)).toEqual([1, 1])
    })

    it('rejects disconnected selected boxes without mutating the grid', () => {
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]
        const boxes = [{ cells: [{ x: 0, z: 0 }] }, { cells: [{ x: 2, z: 0 }] }]

        expect(canCombineGridBoxes(grid, boxes)).toBe(false)
        expect(combineGridBoxes(grid, boxes, 1)).toBe(false)
        expect(grid[0].map((cell) => cell.group)).toEqual([0, 0, 0])
    })

    it('rejects holed selected boxes without mutating the grid', () => {
        const grid: Grid = [
            [
                { group: 0, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
            ],
            [
                { group: 0, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
            ],
            [
                { group: 0, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
            ],
        ]
        const boxes = [
            { cells: [{ x: 0, z: 0 }] },
            { cells: [{ x: 1, z: 0 }] },
            { cells: [{ x: 2, z: 0 }] },
            { cells: [{ x: 0, z: 1 }] },
            { cells: [{ x: 2, z: 1 }] },
            { cells: [{ x: 0, z: 2 }] },
            { cells: [{ x: 1, z: 2 }] },
            { cells: [{ x: 2, z: 2 }] },
        ]

        expect(canCombineGridBoxes(grid, boxes)).toBe(false)
        expect(combineGridBoxes(grid, boxes, 1)).toBe(false)
        expect(grid.flat().map((cell) => cell.group)).toEqual(Array(9).fill(0))
    })
})

describe('grid visibility', () => {
    it('uses grid cells as the visibility source of truth', () => {
        const grid: Grid = [
            [
                { group: 3, width: 20, depth: 20 },
                { group: 3, width: 20, depth: 20 },
            ],
        ]
        const [box] = getGridBoxes(grid)

        expect(isGridBoxVisible(grid, box)).toBe(true)

        setGridBoxVisible(grid, box, false)
        expect(grid[0].map((cell) => cell.visibility)).toEqual([
            'hidden',
            'hidden',
        ])
        expect(getGridBoxes(grid)[0].visibility).toBe('hidden')
        expect(generateCustomBox(grid, 2, 4, true).children[0].visible).toBe(
            false
        )

        setGridBoxVisible(grid, box, true)
        expect(getGridBoxes(grid)[0].visibility).toBe('visible')
    })

    it('handles empty grids as an edge case', () => {
        expect(getGridBoxes([])).toEqual([])
    })

    it('documents empty grids as invalid for lower-level geometry builders', () => {
        expect(() => getOutline([], 0)).toThrow(
            'Cannot build an outline for an empty grid.'
        )
        expect(() => generateCustomBox([], 2, 4, true)).toThrow(
            'Cannot generate box geometry for an empty grid.'
        )
    })
})

describe('grid resizing', () => {
    it('preserves group and visibility while resizing physical dimensions', () => {
        const oldGrid: Grid = [
            [
                { group: 1, visibility: 'hidden', width: 50, depth: 50 },
                { group: 0, width: 50, depth: 50 },
            ],
            [
                { group: 2, width: 50, depth: 50 },
                { group: 0, width: 50, depth: 50 },
            ],
        ]

        const resized = resizeGrid(oldGrid, 180, 120, 100, 100)

        expect(resized).toHaveLength(2)
        expect(resized[0]).toHaveLength(2)
        expect(resized[0][0]).toMatchObject({
            group: 1,
            visibility: 'hidden',
            width: 100,
            depth: 100,
        })
        expect(resized[0][1]).toMatchObject({ group: 0, width: 80 })
        expect(resized[1][0]).toMatchObject({ group: 2, depth: 20 })
        expect(gridMatchesLayout(resized, 180, 120, 100, 100)).toBe(true)
        expect(gridMatchesLayout(resized, 181, 120, 100, 100)).toBe(false)
    })

    it('falls back to one safe segment for invalid dimensions', () => {
        const resized = resizeGrid(
            [],
            Number.NaN,
            50,
            0,
            Number.POSITIVE_INFINITY
        )

        expect(resized).toHaveLength(1)
        expect(resized[0]).toHaveLength(1)
        expect(resized[0][0]).toMatchObject({
            width: 1,
            depth: 1,
            group: 0,
        })
    })
})

describe('parameter validation', () => {
    it('clamps invalid model parameters to finite safe values', () => {
        const sanitized = sanitizeModelParameters({
            totalWidth: Number.NaN,
            totalDepth: -10,
            maxBoxWidth: 0,
            maxBoxDepth: Number.POSITIVE_INFINITY,
            wallHeight: Number.NEGATIVE_INFINITY,
            wallThickness: 999,
            cornerRadius: 999,
        })

        expect(sanitized.totalWidth).toBe(150)
        expect(sanitized.totalDepth).toBe(1)
        expect(sanitized.maxBoxWidth).toBe(1)
        expect(sanitized.maxBoxDepth).toBe(100)
        expect(sanitized.wallHeight).toBe(30)
        expect(Number.isFinite(sanitized.wallThickness)).toBe(true)
        expect(Number.isFinite(sanitized.cornerRadius)).toBe(true)
        expect(sanitized.wallThickness).toBeLessThanOrEqual(0.4)
        expect(sanitized.cornerRadius).toBeLessThanOrEqual(0.5)
    })
})
