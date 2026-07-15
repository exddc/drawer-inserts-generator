import {
    generateSeparateStlZip,
    generateStl,
    generateThreeMf,
} from '@/lib/exportUtils'
import {
    buildPrintableParts,
    exportLimits,
    ExportModelError,
    groupPrintableParts,
    type PrintableModel,
} from '@/lib/printableModel'
import JSZip from 'jszip'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { describe, expect, it } from 'vitest'

function model(overrides: Partial<PrintableModel> = {}): PrintableModel {
    return {
        totalWidth: 40,
        totalDepth: 20,
        wallThickness: 2,
        cornerRadius: 4,
        wallHeight: 30,
        generateBottom: true,
        grid: [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ],
        ...overrides,
    }
}

function gridFromPattern(pattern: string[]): PrintableModel['grid'] {
    return pattern.map((row) =>
        [...row].map((cell) =>
            cell === '#'
                ? { group: 1, width: 20, depth: 20 }
                : {
                      group: 0,
                      width: 20,
                      depth: 20,
                      visibility: 'hidden' as const,
                  }
        )
    )
}

function expectBinaryStlToBeWatertight(buffer: ArrayBuffer): void {
    const geometry = new STLLoader().parse(buffer)
    const position = geometry.getAttribute('position')
    const edgeUse = new Map<string, { count: number; balance: number }>()
    let signedVolume = 0
    const vertexKey = (index: number) =>
        [position.getX(index), position.getY(index), position.getZ(index)]
            .map((value) => (Math.round(value * 1e5) / 1e5).toFixed(5))
            .join(',')

    for (let index = 0; index < position.count; index += 3) {
        const [a, b, c] = [index, index + 1, index + 2].map((vertex) => ({
            x: position.getX(vertex),
            y: position.getY(vertex),
            z: position.getZ(vertex),
        }))
        signedVolume +=
            (a.x * (b.y * c.z - b.z * c.y) -
                a.y * (b.x * c.z - b.z * c.x) +
                a.z * (b.x * c.y - b.y * c.x)) /
            6
        const vertices = [
            vertexKey(index),
            vertexKey(index + 1),
            vertexKey(index + 2),
        ]
        ;[
            [vertices[0], vertices[1]],
            [vertices[1], vertices[2]],
            [vertices[2], vertices[0]],
        ].forEach(([a, b]) => {
            const key = a < b ? `${a}|${b}` : `${b}|${a}`
            const edge = edgeUse.get(key) ?? { count: 0, balance: 0 }
            edge.count++
            edge.balance += a < b ? 1 : -1
            edgeUse.set(key, edge)
        })
    }

    expect(position.count).toBeGreaterThan(0)
    expect(new Set([...edgeUse.values()].map(({ count }) => count))).toEqual(
        new Set([2])
    )
    expect(
        new Set([...edgeUse.values()].map(({ balance }) => balance))
    ).toEqual(new Set([0]))
    expect(signedVolume).toBeGreaterThan(0)
}

function expectThreeMfMeshesToBeWatertight(modelXml: string): void {
    const objects = [
        ...modelXml.matchAll(
            /<object id="\d+" type="model">([\s\S]*?)<\/object>/g
        ),
    ]
    expect(objects.length).toBeGreaterThan(0)

    objects.forEach(([, body]) => {
        const vertices = [
            ...body.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g),
        ].map(
            ([, x, y, z]) => new THREE.Vector3(Number(x), Number(y), Number(z))
        )
        const triangles = [
            ...body.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g),
        ].map(([, a, b, c]) => [Number(a), Number(b), Number(c)])
        const edges = new Map<string, { count: number; balance: number }>()
        let signedVolume = 0

        triangles.forEach(([a, b, c]) => {
            const points = [vertices[a], vertices[b], vertices[c]]
            expect(
                points.every((point) => point.toArray().every(Number.isFinite))
            ).toBe(true)
            expect(
                new THREE.Triangle(points[0], points[1], points[2]).getArea()
            ).toBeGreaterThan(1e-7)
            signedVolume +=
                points[0].dot(points[1].clone().cross(points[2])) / 6
            ;[
                [a, b],
                [b, c],
                [c, a],
            ].forEach(([from, to]) => {
                const key = from < to ? `${from}:${to}` : `${to}:${from}`
                const edge = edges.get(key) ?? { count: 0, balance: 0 }
                edge.count++
                edge.balance += from < to ? 1 : -1
                edges.set(key, edge)
            })
        })

        expect(
            [...edges.values()].every(
                ({ count, balance }) => count === 2 && balance === 0
            )
        ).toBe(true)
        expect(signedVolume).toBeGreaterThan(0)
    })
}

describe('printable model export', () => {
    it('generates deterministic binary STL from domain data', () => {
        const first = generateStl(model())
        const second = generateStl(model())
        const triangleCount = new DataView(first).getUint32(80, true)

        expect([...new Uint8Array(first)]).toEqual([...new Uint8Array(second)])
        expect(first.byteLength).toBe(84 + triangleCount * 50)
        expectBinaryStlToBeWatertight(first)

        const geometry = new STLLoader().parse(first)
        geometry.computeBoundingBox()
        expect(geometry.boundingBox!.min.toArray()).toEqual([0, 0, 0])
        expect(geometry.boundingBox!.max.x).toBeCloseTo(45)
        expect(geometry.boundingBox!.max.y).toBeCloseTo(20)
        expect(geometry.boundingBox!.max.z).toBeCloseTo(30)
    })

    it('emits a valid millimeter-based 3MF package', async () => {
        const data = await generateThreeMf(model())
        const zip = await JSZip.loadAsync(data)
        const modelXml = await zip.file('3D/3dmodel.model')!.async('string')

        expect(zip.file('[Content_Types].xml')).not.toBeNull()
        expect(zip.file('_rels/.rels')).not.toBeNull()
        expect(modelXml).toContain('<model unit="millimeter" xml:lang="en-US"')
        expect(modelXml.match(/<object id=/g)).toHaveLength(2)
        expect(modelXml.match(/<item objectid=/g)).toHaveLength(2)
        expect(modelXml).toContain('<vertices>')
        expect(modelXml).toContain('<triangles>')
        expectThreeMfMeshesToBeWatertight(modelXml)
    })

    it.each([1, 2, 4, 8])(
        'exports rounded concave solids at a %d mm radius',
        async (cornerRadius) => {
            const grids = [
                [
                    [
                        { group: 1, width: 20, depth: 20 },
                        { group: 1, width: 20, depth: 20 },
                    ],
                    [
                        { group: 1, width: 20, depth: 20 },
                        {
                            group: 0,
                            width: 20,
                            depth: 20,
                            visibility: 'hidden' as const,
                        },
                    ],
                ],
                [
                    [
                        { group: 1, width: 20, depth: 20 },
                        {
                            group: 0,
                            width: 20,
                            depth: 20,
                            visibility: 'hidden' as const,
                        },
                    ],
                    [
                        { group: 1, width: 20, depth: 20 },
                        { group: 1, width: 20, depth: 20 },
                    ],
                ],
                gridFromPattern(['.##.', '##..', '#...', '....']),
                gridFromPattern(['####', '#...', '....', '....']),
            ]

            for (const grid of grids) {
                const concaveModel = model({
                    totalWidth: grid[0].length * 20,
                    totalDepth: grid.length * 20,
                    cornerRadius,
                    grid,
                })
                const stl = generateStl(concaveModel)
                const threeMf = await generateThreeMf(concaveModel)
                const zip = await JSZip.loadAsync(threeMf)
                const modelXml = await zip
                    .file('3D/3dmodel.model')!
                    .async('string')

                expectBinaryStlToBeWatertight(stl)
                expectThreeMfMeshesToBeWatertight(modelXml)
            }
        }
    )

    it('deduplicates identical meshes and keeps different same-size shapes', () => {
        const identical = groupPrintableParts(buildPrintableParts(model()))
        expect(identical).toHaveLength(1)
        expect(identical[0].count).toBe(2)

        const sameBoundsDifferentShapes = model({
            totalWidth: 70,
            grid: [
                [
                    { group: 1, width: 10, depth: 10 },
                    { group: 1, width: 10, depth: 10 },
                    { group: 1, width: 10, depth: 10 },
                    { group: 0, width: 10, depth: 10, visibility: 'hidden' },
                    { group: 2, width: 10, depth: 10 },
                    { group: 2, width: 10, depth: 10 },
                    { group: 2, width: 10, depth: 10 },
                ],
                [
                    { group: 1, width: 10, depth: 10 },
                    { group: 0, width: 10, depth: 10, visibility: 'hidden' },
                    { group: 0, width: 10, depth: 10, visibility: 'hidden' },
                    { group: 0, width: 10, depth: 10, visibility: 'hidden' },
                    { group: 0, width: 10, depth: 10, visibility: 'hidden' },
                    { group: 2, width: 10, depth: 10 },
                    { group: 0, width: 10, depth: 10, visibility: 'hidden' },
                ],
            ],
        })
        const shapedParts = buildPrintableParts(
            sameBoundsDifferentShapes
        ).filter((part) => part.metadata.isCombined)

        expect(shapedParts.map((part) => part.metadata.dimensions)).toEqual([
            { width: 30, depth: 20, height: 30 },
            { width: 30, depth: 20, height: 30 },
        ])
        expect(groupPrintableParts(shapedParts)).toHaveLength(2)

        const partitionIndependent = buildPrintableParts(
            model({
                totalWidth: 60,
                grid: [
                    [
                        { group: 3, width: 10, depth: 20 },
                        { group: 3, width: 20, depth: 20 },
                        { group: 0, width: 30, depth: 20 },
                    ],
                ],
            })
        )
        expect(groupPrintableParts(partitionIndependent)).toHaveLength(1)
        expect(groupPrintableParts(partitionIndependent)[0].count).toBe(2)

        const rotatedRectangles = buildPrintableParts(
            model({
                totalWidth: 30,
                totalDepth: 30,
                grid: [
                    [
                        {
                            group: 0,
                            width: 10,
                            depth: 10,
                            visibility: 'hidden',
                        },
                        { group: 0, width: 20, depth: 10 },
                    ],
                    [
                        { group: 0, width: 10, depth: 20 },
                        {
                            group: 0,
                            width: 20,
                            depth: 20,
                            visibility: 'hidden',
                        },
                    ],
                ],
            })
        )
        expect(groupPrintableParts(rotatedRectangles)).toHaveLength(1)
        expect(groupPrintableParts(rotatedRectangles)[0].count).toBe(2)

        const lShape = (rotated: boolean) =>
            buildPrintableParts(
                model({
                    totalWidth: 40,
                    totalDepth: 40,
                    grid: rotated
                        ? [
                              [
                                  { group: 5, width: 20, depth: 20 },
                                  {
                                      group: 0,
                                      width: 20,
                                      depth: 20,
                                      visibility: 'hidden',
                                  },
                              ],
                              [
                                  { group: 5, width: 20, depth: 20 },
                                  { group: 5, width: 20, depth: 20 },
                              ],
                          ]
                        : [
                              [
                                  { group: 5, width: 20, depth: 20 },
                                  { group: 5, width: 20, depth: 20 },
                              ],
                              [
                                  { group: 5, width: 20, depth: 20 },
                                  {
                                      group: 0,
                                      width: 20,
                                      depth: 20,
                                      visibility: 'hidden',
                                  },
                              ],
                          ],
                })
            )[0].shapeSignature
        expect(lShape(false)).toBe(lShape(true))
    })

    it('packs unique binary STL designs with quantity suffixes', async () => {
        const data = await generateSeparateStlZip(model())
        const zip = await JSZip.loadAsync(data)
        const stlNames = Object.keys(zip.files).filter((name) =>
            name.endsWith('.stl')
        )
        const stl = await zip.file(stlNames[0])!.async('arraybuffer')

        expect(stlNames).toEqual(['box_1_20x20x30mm_qty2.stl'])
        expectBinaryStlToBeWatertight(stl)
        expect(await zip.file('README.txt')!.async('string')).toContain(
            'deduplicated by their generated mesh shape'
        )
    })

    it('keeps height, bounds, and filenames consistent for thin models', async () => {
        for (const wallHeight of [0.1, 2, 2.0001]) {
            const thinModel = model({ wallHeight, wallThickness: 2 })
            const stl = generateStl(thinModel)
            const geometry = new STLLoader().parse(stl)
            geometry.computeBoundingBox()
            expect(geometry.boundingBox!.max.z).toBeCloseTo(wallHeight, 4)

            const archive = await generateSeparateStlZip(thinModel)
            const zip = await JSZip.loadAsync(archive)
            const stlName = Object.keys(zip.files).find((name) =>
                name.endsWith('.stl')
            )!
            expect(stlName).toContain(`x${wallHeight}mm`)
            expect(await zip.file('README.txt')!.async('string')).toContain(
                `Box height: ${wallHeight} mm`
            )

            const threeMf = await generateThreeMf(thinModel)
            const threeMfZip = await JSZip.loadAsync(threeMf)
            const modelXml = await threeMfZip
                .file('3D/3dmodel.model')!
                .async('string')
            const exportedHeights = [
                ...modelXml.matchAll(
                    /<vertex x="[^"]+" y="[^"]+" z="([^"]+)"\/>/g
                ),
            ].map(([, z]) => Number(z))
            expect(Math.max(...exportedHeights)).toBeCloseTo(wallHeight, 4)
            expectBinaryStlToBeWatertight(stl)
        }
    })

    it('rejects all-hidden and over-limit exports deterministically', async () => {
        const hidden = model({
            grid: [[{ group: 0, width: 20, depth: 20, visibility: 'hidden' }]],
        })
        expect(() => generateStl(hidden)).toThrowError(
            new ExportModelError(
                'no-visible-parts',
                'There are no visible boxes to export.'
            )
        )
        await expect(generateThreeMf(hidden)).rejects.toMatchObject({
            code: 'no-visible-parts',
        })
        await expect(generateSeparateStlZip(hidden)).rejects.toMatchObject({
            code: 'no-visible-parts',
        })

        const tooManyParts = model({
            totalWidth: exportLimits.maxVisibleParts + 1,
            totalDepth: 1,
            cornerRadius: 0,
            wallThickness: 0.1,
            grid: [
                Array.from(
                    { length: exportLimits.maxVisibleParts + 1 },
                    () => ({
                        group: 0,
                        width: 1,
                        depth: 1,
                    })
                ),
            ],
        })
        expect(() => generateStl(tooManyParts)).toThrowError(
            expect.objectContaining({ code: 'part-limit' })
        )

        const tooManyCells = model({
            grid: [
                Array.from({ length: exportLimits.maxCells + 1 }, () => ({
                    group: 0,
                    width: 1,
                    depth: 1,
                    visibility: 'hidden' as const,
                })),
            ],
        })
        expect(() => generateStl(tooManyCells)).toThrowError(
            expect.objectContaining({ code: 'cell-limit' })
        )
    })

    it('meets the supported-limit stress latency and memory budgets', async () => {
        const rows = 10
        const columns = exportLimits.maxVisibleParts / rows
        const stressModel = model({
            totalWidth: columns * 10,
            totalDepth: rows * 10,
            cornerRadius: 0,
            grid: Array.from({ length: rows }, () =>
                Array.from({ length: columns }, () => ({
                    group: 0,
                    width: 10,
                    depth: 10,
                }))
            ),
        })
        const heapBefore = process.memoryUsage().heapUsed
        const startedAt = performance.now()
        const output = await generateThreeMf(stressModel)
        const elapsed = performance.now() - startedAt
        const heapGrowth = Math.max(
            0,
            process.memoryUsage().heapUsed - heapBefore
        )

        expect(elapsed).toBeLessThan(5_000)
        expect(heapGrowth).toBeLessThan(exportLimits.workerMemoryBudgetBytes)
        expect(output.byteLength).toBeLessThanOrEqual(
            exportLimits.maxOutputBytes
        )
    })
})
