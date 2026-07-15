import {
    generateSeparateStlZip,
    generateStl,
    generateThreeMf,
} from '@/lib/exportUtils'
import {
    buildPrintableParts,
    groupPrintableParts,
    type PrintableModel,
} from '@/lib/printableModel'
import JSZip from 'jszip'
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
    })

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
})
