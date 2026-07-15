import { BoxGenerationOptions, generateCustomBox } from '@/lib/boxHelper'
import {
    canCombineGridBoxes,
    combineGridBoxes,
    getNextAvailableGroupId,
    validateGridBoxCombination,
} from '@/lib/gridCombine'
import { gridMatchesLayout, resizeGrid } from '@/lib/gridHelper'
import { dimensionTolerance } from '@/lib/gridSizing'
import {
    getGridBoxes,
    isGridBoxVisible,
    setGridBoxVisible,
} from '@/lib/gridVisibility'
import {
    getOutline,
    OutlineTopologyError,
    type OutlineTopologyCode,
} from '@/lib/lineHelper'
import {
    getMinimumBoxSize,
    sanitizeModelParameters,
} from '@/lib/parameterValidation'
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

function expectTopologyError(
    action: () => unknown,
    code: OutlineTopologyCode
): void {
    try {
        action()
        throw new Error('Expected a topology error')
    } catch (error) {
        expect(error).toBeInstanceOf(OutlineTopologyError)
        expect((error as OutlineTopologyError).code).toBe(code)
    }
}

function meshes(object: THREE.Object3D): THREE.Mesh[] {
    const result: THREE.Mesh[] = []
    object.traverse((child) => {
        if (child instanceof THREE.Mesh) result.push(child)
    })
    return result
}

function generationOptions(
    overrides: Partial<BoxGenerationOptions> = {}
): BoxGenerationOptions {
    return {
        wallThickness: 2,
        cornerRadius: 4,
        wallHeight: 30,
        generateBottom: true,
        cornerLines: { show: false, color: 0x000000, opacity: 0.25 },
        ...overrides,
    }
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

function generationSignature(object: THREE.Object3D): unknown[] {
    const signature: unknown[] = []

    object.traverse((child) => {
        if (!(
            child instanceof THREE.Mesh || child instanceof THREE.LineSegments
        ))
            return

        const position = child.geometry.getAttribute('position')
        const materials = Array.isArray(child.material)
            ? child.material
            : [child.material]

        signature.push({
            type: child.type,
            name: child.name,
            position: Array.from(position.array),
            materials: materials.map((material) => ({
                color:
                    'color' in material && material.color instanceof THREE.Color
                        ? material.color.getHex()
                        : null,
                opacity: material.opacity,
            })),
        })
    })

    return signature
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

function horizontalTriangleAreaAtHeight(
    mesh: THREE.Mesh,
    height: number
): number {
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

        if (triangle.every((point) => Math.abs(point.y - height) < 1e-5)) {
            area +=
                Math.abs(
                    triangle[0].x * (triangle[1].z - triangle[2].z) +
                        triangle[1].x * (triangle[2].z - triangle[0].z) +
                        triangle[2].x * (triangle[0].z - triangle[1].z)
                ) / 2
        }
    }

    return area
}

function hasVertexAtHeight(object: THREE.Object3D, height: number): boolean {
    return meshes(object).some((mesh) => {
        const position = mesh.geometry.getAttribute('position')
        return Array.from({ length: position.count }, (_, index) =>
            position.getY(index)
        ).some((value) => Math.abs(value - height) < 1e-5)
    })
}

function expectWatertight(object: THREE.Object3D): void {
    meshes(object).forEach((mesh) => {
        const position = mesh.geometry.getAttribute('position')
        const index = mesh.geometry.getIndex()
        expect(index).not.toBeNull()

        const edgeUse = new Map<string, { count: number; balance: number }>()
        const triangleCount = index!.count / 3
        for (
            let triangleIndex = 0;
            triangleIndex < triangleCount;
            triangleIndex++
        ) {
            const vertices = [0, 1, 2].map((corner) =>
                index!.getX(triangleIndex * 3 + corner)
            )
            const points = vertices.map((vertexIndex) =>
                new THREE.Vector3().fromBufferAttribute(position, vertexIndex)
            )
            expect(
                new THREE.Triangle(points[0], points[1], points[2]).getArea()
            ).toBeGreaterThan(1e-8)

            ;[
                [vertices[0], vertices[1]],
                [vertices[1], vertices[2]],
                [vertices[2], vertices[0]],
            ].forEach(([a, b]) => {
                const key = a < b ? `${a}:${b}` : `${b}:${a}`
                const edge = edgeUse.get(key) ?? { count: 0, balance: 0 }
                edge.count++
                edge.balance += a < b ? 1 : -1
                edgeUse.set(key, edge)
            })
        }

        expect(
            new Set([...edgeUse.values()].map(({ count }) => count))
        ).toEqual(new Set([2]))
        expect(
            new Set([...edgeUse.values()].map(({ balance }) => balance))
        ).toEqual(new Set([0]))
    })
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

        expectTopologyError(() => getOutline(grid, 9), 'disconnected')
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

        expectTopologyError(() => getOutline(grid, 8), 'contains-hole')
    })

    it('rejects boundaries that touch and self-intersect at a vertex', () => {
        const grid: Grid = [
            [
                { group: 5, width: 10, depth: 10 },
                { group: 5, width: 10, depth: 10 },
                { group: 5, width: 10, depth: 10 },
            ],
            [
                { group: 5, width: 10, depth: 10 },
                { group: 0, width: 10, depth: 10 },
                { group: 5, width: 10, depth: 10 },
            ],
            [
                { group: 0, width: 10, depth: 10 },
                { group: 5, width: 10, depth: 10 },
                { group: 5, width: 10, depth: 10 },
            ],
        ]

        expectTopologyError(() => getOutline(grid, 5), 'self-intersection')
    })

    it('rejects malformed grids explicitly', () => {
        const grid = [
            [
                { group: 1, width: 10, depth: 10 },
                { group: 1, width: 10, depth: 10 },
            ],
            [{ group: 1, width: 10, depth: 10 }],
        ]

        expect(() => getOutline(grid, 1)).toThrow(
            'Cannot build an outline for a non-rectangular grid.'
        )
    })

    it.each([
        ['zero width', { width: 0, depth: 10 }],
        ['negative depth', { width: 10, depth: -1 }],
        ['non-finite width', { width: Number.NaN, depth: 10 }],
        ['non-finite depth', { width: 10, depth: Number.POSITIVE_INFINITY }],
    ])('rejects %s before mapping the outline', (_, dimensions) => {
        const grid: Grid = [[{ group: 1, ...dimensions }]]

        expect(() => getOutline(grid, 1)).toThrow(
            'Cannot build an outline with non-positive or non-finite cell dimensions.'
        )
    })

    it('builds a high-perimeter 100x100 outline within the interactive budget', () => {
        const size = 100
        const grid: Grid = Array.from({ length: size }, (_, z) =>
            Array.from({ length: size }, (_, x) => ({
                group: z === 0 || x % 2 === 0 ? 12 : 0,
                width: 1,
                depth: 1,
            }))
        )

        const startedAt = performance.now()
        const outline = getOutline(grid, 12)
        const elapsed = performance.now() - startedAt

        expect(outline.length).toBeGreaterThan(10_000)
        expect(elapsed).toBeLessThan(100)
    })
})

describe('box generation', () => {
    beforeEach(() => {
        useStore.setState({ wallHeight: 30, showCornerLines: false })
    })

    it('generates valid wall and bottom meshes for rectangular boxes', () => {
        const grid: Grid = [[{ group: 0, width: 30, depth: 20 }]]
        const box = generateCustomBox(grid, generationOptions())
        const cell = box.children[0]
        const size = boundingSize(cell)

        expect(box.children).toHaveLength(1)
        expect(meshes(cell)).toHaveLength(1)
        expect(cell.visible).toBe(true)
        expect(getGridBoxes(grid, 30)[0].dimensions).toMatchObject({
            width: 30,
            depth: 20,
        })
        expect(size.x).toBeCloseTo(30)
        expect(size.y).toBeCloseTo(30)
        expect(size.z).toBeCloseTo(20)
        expectFiniteGeometry(cell)
        expectWatertight(cell)
    })

    it('omits bottom geometry when bottom generation is disabled', () => {
        const grid: Grid = [[{ group: 0, width: 30, depth: 20 }]]

        const bottomless = generateCustomBox(
            grid,
            generationOptions({ generateBottom: false })
        )
        const bottomed = generateCustomBox(grid, generationOptions())

        expect(meshes(bottomless)).toHaveLength(1)
        expect(meshes(bottomed)).toHaveLength(1)
        expect(hasVertexAtHeight(bottomless, 2)).toBe(false)
        expect(hasVertexAtHeight(bottomed, 2)).toBe(true)
        expectWatertight(bottomless)
        expectWatertight(bottomed)
    })

    it('generates one box for combined cells and split boxes after ungrouping', () => {
        const grid: Grid = [
            [
                { group: 4, width: 25, depth: 40 },
                { group: 4, width: 35, depth: 40 },
            ],
        ]
        const combined = generateCustomBox(
            grid,
            generationOptions({ generateBottom: false })
        )

        expect(combined.children).toHaveLength(1)
        expect(combined.children[0].name).toBe('group:4')
        expect(getGridBoxes(grid, 30)[0].dimensions).toMatchObject({
            width: 60,
            depth: 40,
        })

        grid[0][0].group = 0
        grid[0][1].group = 0
        const split = generateCustomBox(
            grid,
            generationOptions({ generateBottom: false })
        )

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
        const box = generateCustomBox(
            grid,
            generationOptions({ cornerRadius: 0 })
        )
        const combined = box.children.find((child) => child.name === 'group:7')
        const metadata = getGridBoxes(grid, 30).find(
            (entry) => entry.id === 'group:7'
        )

        expect(combined).toBeDefined()
        expect(meshes(combined!)).toHaveLength(1)
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

        expect(
            horizontalTriangleAreaAtHeight(meshes(combined!)[0], 0)
        ).toBeCloseTo(1300)
        expectWatertight(combined!)

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

        expectTopologyError(
            () =>
                generateCustomBox(grid, generationOptions({ cornerRadius: 0 })),
            'disconnected'
        )
    })

    it('makes every generation option observable in the output', () => {
        const grid: Grid = [[{ group: 0, width: 30, depth: 20 }]]
        const options = generationOptions({
            wallThickness: 2,
            cornerRadius: 6,
            wallHeight: 18,
            generateBottom: true,
            cornerLines: { show: true, color: 0x123456, opacity: 0.4 },
        })
        const box = generateCustomBox(grid, options)
        const size = boundingSize(box)
        const boxMeshes = meshes(box)
        const lines = box.getObjectsByProperty('name', 'corner-lines')
        const sharpBox = generateCustomBox(grid, {
            ...options,
            cornerRadius: 0,
        })
        const roundedPositionCount =
            boxMeshes[0].geometry.getAttribute('position').count
        const sharpPositionCount =
            meshes(sharpBox)[0].geometry.getAttribute('position').count
        const lineMaterial = (lines[0] as THREE.LineSegments)
            .material as THREE.LineBasicMaterial

        expect(size.y).toBeCloseTo(18)
        expect(boxMeshes).toHaveLength(1)
        expect(hasVertexAtHeight(box, 2)).toBe(true)
        expect(roundedPositionCount).toBeGreaterThan(sharpPositionCount)
        expect(lines).toHaveLength(2)
        expect(lineMaterial.color.getHex()).toBe(0x123456)
        expect(lineMaterial.opacity).toBe(0.4)
    })

    const explicitOptions = generationOptions({
        wallThickness: 2,
        cornerRadius: 6,
        wallHeight: 18,
        generateBottom: true,
        cornerLines: { show: true, color: 0x123456, opacity: 0.4 },
    })
    const matchingStoreState = {
        wallThickness: explicitOptions.wallThickness,
        cornerRadius: explicitOptions.cornerRadius,
        wallHeight: explicitOptions.wallHeight,
        generateBottom: explicitOptions.generateBottom,
        showCornerLines: explicitOptions.cornerLines.show,
        cornerLineColor: explicitOptions.cornerLines.color,
        cornerLineOpacity: explicitOptions.cornerLines.opacity,
    }

    it.each([
        ['wall thickness', { wallThickness: 8 }],
        ['corner radius', { cornerRadius: 0 }],
        ['wall height', { wallHeight: 99 }],
        ['bottom generation', { generateBottom: false }],
        ['corner-line visibility', { showCornerLines: false }],
        ['corner-line color', { cornerLineColor: 0xffffff }],
        ['corner-line opacity', { cornerLineOpacity: 1 }],
    ])('ignores Zustand %s', (_, conflictingState) => {
        const grid: Grid = [[{ group: 0, width: 30, depth: 20 }]]
        useStore.setState(matchingStoreState)
        const expected = generationSignature(
            generateCustomBox(grid, explicitOptions)
        )

        useStore.setState(conflictingState)

        expect(
            generationSignature(generateCustomBox(grid, explicitOptions))
        ).toEqual(expected)
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
        expect(validateGridBoxCombination(grid, boxes)).toMatchObject({
            valid: false,
            code: 'disconnected',
        })
        expect(combineGridBoxes(grid, boxes, 1)).toBe(false)
        expect(grid[0].map((cell) => cell.group)).toEqual([0, 0, 0])
    })

    it('does not treat diagonal corner contact as connected', () => {
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]
        const boxes = [{ cells: [{ x: 0, z: 0 }] }, { cells: [{ x: 1, z: 1 }] }]

        expect(validateGridBoxCombination(grid, boxes)).toMatchObject({
            valid: false,
            code: 'disconnected',
        })
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
        expect(validateGridBoxCombination(grid, boxes)).toMatchObject({
            valid: false,
            code: 'contains-hole',
        })
        expect(combineGridBoxes(grid, boxes, 1)).toBe(false)
        expect(grid.flat().map((cell) => cell.group)).toEqual(Array(9).fill(0))
    })

    it('accepts cells connected through an L-shaped edge path', () => {
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]
        const boxes = [
            { cells: [{ x: 0, z: 0 }] },
            { cells: [{ x: 1, z: 0 }] },
            { cells: [{ x: 0, z: 1 }] },
        ]

        expect(validateGridBoxCombination(grid, boxes)).toEqual({ valid: true })
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
        expect(
            generateCustomBox(grid, generationOptions()).children[0].visible
        ).toBe(false)

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
        expect(() => generateCustomBox([], generationOptions())).toThrow(
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
    it('rounds a corrected maximum without creating another undersized segment', () => {
        const sanitized = sanitizeModelParameters({
            totalWidth: 41,
            totalDepth: 1.2,
            maxBoxWidth: 1.2,
            maxBoxDepth: 1.2,
            wallThickness: 0.1,
            cornerRadius: 0,
        })
        const minBoxSize = getMinimumBoxSize(
            sanitized.wallThickness,
            sanitized.cornerRadius
        )
        const grid = resizeGrid(
            [],
            sanitized.totalWidth,
            sanitized.totalDepth,
            sanitized.maxBoxWidth,
            sanitized.maxBoxDepth,
            minBoxSize
        )
        const widths = grid[0].map((cell) => cell.width)

        expect(minBoxSize).toBe(1.2)
        expect(sanitized.maxBoxWidth).toBe(1.205882353)
        expect(widths).toHaveLength(34)
        expect(widths.every((width) => width >= minBoxSize)).toBe(true)
        expect(
            widths.every(
                (width) => width - sanitized.maxBoxWidth <= dimensionTolerance
            )
        ).toBe(true)
        expect(
            Math.abs(
                widths.reduce((sum, width) => sum + width, 0) -
                    sanitized.totalWidth
            )
        ).toBeLessThanOrEqual(dimensionTolerance)
    })

    it.each([
        [201, 100, 100, 3],
        [150, 149, 149, 2],
        [100, 1, 100 / 7, 7],
        [113, 100, 100, 2],
        [26.000000001, 13, 13, 2],
    ])(
        'keeps every segment valid for a %d mm total and %d mm requested max',
        (total, requestedMax, expectedMax, expectedSegmentCount) => {
            const sanitized = sanitizeModelParameters({
                totalWidth: total,
                totalDepth: total,
                maxBoxWidth: requestedMax,
                maxBoxDepth: requestedMax,
                wallThickness: 2,
                cornerRadius: 4,
            })
            const minBoxSize = getMinimumBoxSize(
                sanitized.wallThickness,
                sanitized.cornerRadius
            )
            const grid = resizeGrid(
                [],
                sanitized.totalWidth,
                sanitized.totalDepth,
                sanitized.maxBoxWidth,
                sanitized.maxBoxDepth,
                minBoxSize
            )

            expect(minBoxSize).toBe(13)
            expect(sanitized.maxBoxWidth).toBeCloseTo(expectedMax)
            expect(sanitized.maxBoxDepth).toBeCloseTo(expectedMax)
            expect(grid).toHaveLength(expectedSegmentCount)
            expect(grid[0]).toHaveLength(expectedSegmentCount)
            expect(
                grid.every((row) =>
                    row.every(
                        (cell) =>
                            cell.width >= minBoxSize && cell.depth >= minBoxSize
                    )
                )
            ).toBe(true)
        }
    )

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
        expect(sanitized.totalDepth).toBe(91)
        expect(sanitized.maxBoxWidth).toBe(150)
        expect(sanitized.maxBoxDepth).toBe(100)
        expect(sanitized.wallHeight).toBe(30)
        expect(Number.isFinite(sanitized.wallThickness)).toBe(true)
        expect(Number.isFinite(sanitized.cornerRadius)).toBe(true)
        expect(sanitized.wallThickness).toBe(15)
        expect(sanitized.cornerRadius).toBe(30)
    })

    it('preserves sizing invariants across generated and boundary parameters', () => {
        const wallThicknesses = [0.1, 0.2, 2, 7.3, 15]
        const cornerRadii = [0, 0.1, 4, 12.7, 30]
        let checkedConfigurations = 0

        const expectSizingInvariants = (
            wallThickness: number,
            cornerRadius: number,
            totalWidth: number,
            maxBoxWidth: number
        ) => {
            const minBoxSize = getMinimumBoxSize(wallThickness, cornerRadius)
            const sanitized = sanitizeModelParameters({
                totalWidth,
                totalDepth: minBoxSize,
                maxBoxWidth,
                maxBoxDepth: 500,
                wallThickness,
                cornerRadius,
            })
            const sanitizedAgain = sanitizeModelParameters(sanitized)
            const grid = resizeGrid(
                [],
                sanitized.totalWidth,
                sanitized.totalDepth,
                sanitized.maxBoxWidth,
                sanitized.maxBoxDepth,
                minBoxSize
            )
            const resizedAgain = resizeGrid(
                grid,
                sanitized.totalWidth,
                sanitized.totalDepth,
                sanitized.maxBoxWidth,
                sanitized.maxBoxDepth,
                minBoxSize
            )
            const widths = grid[0].map((cell) => cell.width)
            const depths = grid.map((row) => row[0].depth)

            const sizes = [...widths, ...depths]
            sizes.forEach((size) => {
                expect(size).toBeGreaterThanOrEqual(minBoxSize)
            })
            widths.forEach((width) => {
                expect(width - sanitized.maxBoxWidth).toBeLessThanOrEqual(
                    dimensionTolerance
                )
            })
            depths.forEach((depth) => {
                expect(depth - sanitized.maxBoxDepth).toBeLessThanOrEqual(
                    dimensionTolerance
                )
            })
            expect(
                Math.abs(
                    widths.reduce((sum, width) => sum + width, 0) -
                        sanitized.totalWidth
                )
            ).toBeLessThanOrEqual(dimensionTolerance)
            expect(
                Math.abs(
                    depths.reduce((sum, depth) => sum + depth, 0) -
                        sanitized.totalDepth
                )
            ).toBeLessThanOrEqual(dimensionTolerance)
            expect(sanitizedAgain).toEqual(sanitized)
            expect(resizedAgain).toEqual(grid)
            checkedConfigurations++
        }

        wallThicknesses.forEach((wallThickness) => {
            cornerRadii.forEach((cornerRadius) => {
                const minBoxSize = getMinimumBoxSize(
                    wallThickness,
                    cornerRadius
                )
                const totals = [
                    minBoxSize,
                    minBoxSize + dimensionTolerance / 2,
                    minBoxSize + dimensionTolerance * 10,
                    41,
                    100,
                    201,
                    500,
                ].filter((total) => total >= minBoxSize && total <= 500)
                const uniqueTotals = [...new Set(totals)]

                uniqueTotals.forEach((totalWidth) => {
                    const requestedMaxima = [
                        1,
                        minBoxSize,
                        minBoxSize + dimensionTolerance / 2,
                        Math.max(
                            minBoxSize,
                            totalWidth / 2 - dimensionTolerance / 2
                        ),
                        totalWidth / 2,
                        totalWidth / 3,
                        100,
                        500,
                    ]
                    const uniqueMaxima = [...new Set(requestedMaxima)]

                    uniqueMaxima.forEach((maxBoxWidth) => {
                        expectSizingInvariants(
                            wallThickness,
                            cornerRadius,
                            totalWidth,
                            maxBoxWidth
                        )
                    })
                })
            })
        })

        let randomState = 0x224
        const nextRandom = () => {
            randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0
            return randomState / 0x1_0000_0000
        }

        for (let index = 0; index < 250; index++) {
            const wallThickness = 0.1 + nextRandom() * 14.9
            const cornerRadius = nextRandom() * 30
            const minBoxSize = getMinimumBoxSize(wallThickness, cornerRadius)
            const totalWidth = minBoxSize + nextRandom() * (500 - minBoxSize)
            const maxBoxWidth = 1 + nextRandom() * 499

            expectSizingInvariants(
                wallThickness,
                cornerRadius,
                totalWidth,
                maxBoxWidth
            )
        }

        expect(checkedConfigurations).toBeGreaterThan(750)
    })
})
