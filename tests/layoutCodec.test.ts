import { resizeGrid } from '@/lib/gridHelper'
import {
    decodeLayout,
    encodeLayout,
    MAX_LAYOUT_DECODE_CHARS,
    V1_DEFAULT_CONFIG,
} from '@/lib/layoutCodec'
import {
    applyModelSnapshot,
    createModelSnapshot,
    defaultModelConfig,
} from '@/lib/modelSnapshot'
import {
    defaultModelParameters,
    getMinimumBoxSize,
} from '@/lib/parameterValidation'
import type { Grid, ModelConfig } from '@/lib/types'
import { describe, expect, it } from 'vitest'

function createGridWithTopology(
    config: Partial<ModelConfig> = {},
    mutate?: (grid: Grid) => void
): Grid {
    const fullConfig = { ...V1_DEFAULT_CONFIG, ...config }
    const minBoxSize = getMinimumBoxSize(
        fullConfig.wallThickness,
        fullConfig.cornerRadius
    )
    const grid = resizeGrid(
        [],
        fullConfig.totalWidth,
        fullConfig.totalDepth,
        fullConfig.maxBoxWidth,
        fullConfig.maxBoxDepth,
        minBoxSize
    )

    mutate?.(grid)
    return grid
}

function createCombinedGrid(config: Partial<ModelConfig> = {}): Grid {
    return createGridWithTopology(config, (grid) => {
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                if (row < 2 && col < 2) {
                    grid[row][col].group = 3
                }
                if (row === 0 && col === grid[0].length - 1) {
                    grid[row][col].visibility = 'hidden'
                }
            }
        }
    })
}

function snapshot(config: Partial<ModelConfig> = {}, grid?: Grid) {
    const fullConfig = { ...V1_DEFAULT_CONFIG, ...config }
    return createModelSnapshot({
        ...fullConfig,
        grid: grid ?? createGridWithTopology(fullConfig),
    })
}

function encodeWire(wire: unknown): string {
    return Buffer.from(JSON.stringify(wire), 'utf8').toString('base64url')
}

describe('layoutCodec', () => {
    it('roundtrips the default layout with a tiny payload', () => {
        const original = snapshot()
        const encoded = encodeLayout(original)
        const decoded = decodeLayout(encoded)

        expect(encoded.length).toBeLessThan(32)
        expect(decoded).toEqual({ ok: true, snapshot: original })
    })

    it('roundtrips combined groups and hidden cells', () => {
        const original = snapshot(
            {
                totalWidth: 200,
                totalDepth: 180,
            },
            createCombinedGrid({
                totalWidth: 200,
                totalDepth: 180,
            })
        )
        const decoded = decodeLayout(encodeLayout(original))

        expect(decoded).toEqual({ ok: true, snapshot: original })
    })

    it('omits recomputable cell width and depth from the payload', () => {
        const original = snapshot(
            {
                totalWidth: 200,
            },
            createCombinedGrid({ totalWidth: 200 })
        )
        const encoded = encodeLayout(original)
        const decodedString = Buffer.from(
            encoded.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
        ).toString('utf8')

        expect(decodedString).not.toContain('width')
        expect(decodedString).not.toContain('depth')
        expect(decodeLayout(encoded)).toEqual({
            ok: true,
            snapshot: original,
        })
    })

    it('is shorter than naive JSON of the full drawer insert', () => {
        const original = snapshot(
            {
                totalWidth: 200,
                wallHeight: 40,
            },
            createCombinedGrid({ totalWidth: 200 })
        )
        const encoded = encodeLayout(original)
        const naive = JSON.stringify({
            config: original.config,
            grid: original.grid,
            selectedBoxIds: ['group:3', 'cell:1:2'],
        })

        expect(encoded.length).toBeLessThan(naive.length)
    })

    it('only encodes config values that differ from frozen v1 defaults', () => {
        const encoded = encodeLayout(
            snapshot({
                totalWidth: 200,
            })
        )
        const wire = JSON.parse(
            Buffer.from(
                encoded.replace(/-/g, '+').replace(/_/g, '/'),
                'base64'
            ).toString('utf8')
        )

        expect(wire.c).toEqual({ w: 200 })
        expect(wire.c.d).toBeUndefined()
        expect(wire.c.t).toBeUndefined()
        expect(V1_DEFAULT_CONFIG.totalWidth).toBe(150)
        expect(defaultModelConfig.totalWidth).toBe(
            defaultModelParameters.totalWidth
        )
    })

    it('keeps historical v1 fixtures stable if app defaults diverge', () => {
        // Fixture encoded when omitted fields meant V1_DEFAULT_CONFIG values.
        const fixture = encodeWire({ v: 1, c: { w: 200 } })
        const decoded = decodeLayout(fixture)

        expect(decoded.ok).toBe(true)
        if (!decoded.ok) return

        expect(decoded.snapshot.config.totalWidth).toBe(200)
        expect(decoded.snapshot.config.totalDepth).toBe(
            V1_DEFAULT_CONFIG.totalDepth
        )
        expect(decoded.snapshot.config.wallThickness).toBe(
            V1_DEFAULT_CONFIG.wallThickness
        )
        expect(decoded.snapshot.config.maxBoxWidth).toBe(
            V1_DEFAULT_CONFIG.maxBoxWidth
        )
    })

    it('returns structured failures for corrupt or unsupported payloads', () => {
        expect(decodeLayout('not-valid')).toEqual({
            ok: false,
            reason: 'corrupt',
        })
        expect(decodeLayout('')).toEqual({ ok: false, reason: 'empty' })
        expect(decodeLayout('x'.repeat(MAX_LAYOUT_DECODE_CHARS + 1))).toEqual({
            ok: false,
            reason: 'oversized',
        })

        const unsupportedVersion = encodeWire({ v: 99, c: { w: 200 } })
        expect(decodeLayout(unsupportedVersion)).toEqual({
            ok: false,
            reason: 'unsupported',
        })
    })

    it('rejects malicious RLE counts without allocating huge arrays', () => {
        const started = Date.now()
        const result = decodeLayout(
            encodeWire({
                v: 1,
                g: '0:1000000000',
            })
        )
        const elapsed = Date.now() - started

        expect(result).toEqual({ ok: false, reason: 'corrupt' })
        expect(elapsed).toBeLessThan(50)
    })

    it('rejects fractional and negative RLE values', () => {
        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    g: '0:1.5|0:1',
                })
            )
        ).toEqual({ ok: false, reason: 'corrupt' })

        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    g: '-1:1|0:3',
                })
            )
        ).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects raw group arrays with wrong length or invalid ids', () => {
        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    g: [0, 0, 0],
                })
            )
        ).toEqual({ ok: false, reason: 'corrupt' })

        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    g: [0, -1, 0, 0],
                })
            )
        ).toEqual({ ok: false, reason: 'corrupt' })

        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    g: [0, 1.5, 0, 0],
                })
            )
        ).toEqual({ ok: false, reason: 'corrupt' })
    })

    it('rejects disconnected and hole-containing group topology', () => {
        // Default 150/100 grid is 2x2. Groups 1 on diagonal is disconnected.
        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    g: [1, 0, 0, 1],
                })
            )
        ).toEqual({ ok: false, reason: 'invalid-topology' })

        // 2x2 outer ring would need larger grid; hole in 3x3:
        // Use custom dimensions that yield 3x3 (300 / 100).
        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    c: { w: 300, d: 300 },
                    g: [1, 1, 1, 1, 0, 1, 1, 1, 1],
                })
            )
        ).toEqual({ ok: false, reason: 'invalid-topology' })
    })

    it('applies decoded layouts back into store-shaped model state', () => {
        const original = snapshot(
            {
                totalWidth: 220,
                generateBottom: false,
            },
            createCombinedGrid({ totalWidth: 220 })
        )
        const decoded = decodeLayout(encodeLayout(original))
        expect(decoded.ok).toBe(true)
        if (!decoded.ok) return

        const applied = applyModelSnapshot(decoded.snapshot)

        expect(applied.totalWidth).toBe(220)
        expect(applied.generateBottom).toBe(false)
        expect(applied.grid).toEqual(original.grid)
        expect(applied.maxBoxWidth).toBe(defaultModelParameters.maxBoxWidth)
    })
})
