import {
    decodeLayout,
    encodeLayout,
    MAX_LAYOUT_DECODE_CHARS,
    MAX_LAYOUT_STORAGE_CHARS,
    tryEncodeLayout,
    V1_DEFAULT_CONFIG,
    V1_MAX_LAYOUT_CELLS,
} from '@/lib/layoutCodec'
import {
    V1_PARAMETER_RANGES,
    v1GetMinimumBoxSize,
    v1ResizeGrid,
    v1SanitizeModelParameters,
} from '@/lib/layoutCodecV1'
import {
    applyModelSnapshot,
    createModelSnapshot,
    defaultModelConfig,
} from '@/lib/modelSnapshot'
import { defaultModelParameters } from '@/lib/parameterValidation'
import type { Grid, ModelConfig } from '@/lib/types'
import { describe, expect, it } from 'vitest'

function createGridWithTopology(
    config: Partial<ModelConfig> = {},
    mutate?: (grid: Grid) => void
): Grid {
    const sanitized = {
        ...V1_DEFAULT_CONFIG,
        ...v1SanitizeModelParameters({
            ...V1_DEFAULT_CONFIG,
            ...config,
        }),
        generateBottom:
            config.generateBottom ?? V1_DEFAULT_CONFIG.generateBottom,
    }
    const minBoxSize = v1GetMinimumBoxSize(
        sanitized.wallThickness,
        sanitized.cornerRadius
    )
    const grid = v1ResizeGrid(
        [],
        sanitized.totalWidth,
        sanitized.totalDepth,
        sanitized.maxBoxWidth,
        sanitized.maxBoxDepth,
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
        // Frozen ranges are independent of live app defaults.
        expect(V1_PARAMETER_RANGES.totalWidth.max).toBe(500)
    })

    it('rejects present-but-invalid config structures as corrupt', () => {
        expect(decodeLayout(encodeWire({ v: 1, c: 'corrupt' }))).toEqual({
            ok: false,
            reason: 'corrupt',
        })
        expect(decodeLayout(encodeWire({ v: 1, c: null }))).toEqual({
            ok: false,
            reason: 'corrupt',
        })
        expect(decodeLayout(encodeWire({ v: 1, c: [1, 2] }))).toEqual({
            ok: false,
            reason: 'corrupt',
        })
        expect(
            decodeLayout(encodeWire({ v: 1, c: { w: 200, nope: 1 } }))
        ).toEqual({
            ok: false,
            reason: 'corrupt',
        })
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
        expect(MAX_LAYOUT_DECODE_CHARS).toBe(MAX_LAYOUT_STORAGE_CHARS)

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
        expect(
            decodeLayout(
                encodeWire({
                    v: 1,
                    g: [1, 0, 0, 1],
                })
            )
        ).toEqual({ ok: false, reason: 'invalid-topology' })

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

    it('rejects encoding grids with invalid group ids', () => {
        const grid = createGridWithTopology()
        grid[0][0].group = -1
        expect(tryEncodeLayout(snapshot({}, grid))).toEqual({
            ok: false,
            reason: 'invalid',
        })
    })

    it('roundtrips every successful encode through decode equivalently', () => {
        const cases = [
            snapshot(),
            snapshot(
                { totalWidth: 200 },
                createCombinedGrid({ totalWidth: 200 })
            ),
            snapshot(
                {
                    totalWidth: 500,
                    totalDepth: 500,
                    maxBoxWidth: 5,
                    maxBoxDepth: 5,
                    wallThickness: 0.1,
                    cornerRadius: 0,
                },
                createGridWithTopology({
                    totalWidth: 500,
                    totalDepth: 500,
                    maxBoxWidth: 5,
                    maxBoxDepth: 5,
                    wallThickness: 0.1,
                    cornerRadius: 0,
                })
            ),
        ]

        for (const original of cases) {
            const encoded = tryEncodeLayout(original)
            expect(encoded.ok).toBe(true)
            if (!encoded.ok) continue
            const decoded = decodeLayout(encoded.encoded)
            expect(decoded).toEqual({ ok: true, snapshot: original })
        }
    })

    it('persists the largest application-supported 100×100 layout', () => {
        const config = {
            totalWidth: 500,
            totalDepth: 500,
            wallThickness: 0.1,
            cornerRadius: 0,
            maxBoxWidth: 5,
            maxBoxDepth: 5,
        }
        const grid = createGridWithTopology(config)
        expect(grid.length).toBe(100)
        expect(grid[0].length).toBe(100)
        expect(grid.length * grid[0].length).toBe(V1_MAX_LAYOUT_CELLS)

        const original = snapshot(
            {
                ...config,
                ...v1SanitizeModelParameters({
                    ...V1_DEFAULT_CONFIG,
                    ...config,
                }),
            },
            grid
        )
        const encoded = tryEncodeLayout(original)
        expect(encoded.ok).toBe(true)
        if (!encoded.ok) return
        expect(decodeLayout(encoded.encoded)).toEqual({
            ok: true,
            snapshot: original,
        })
    })

    it('rejects encoding grids above the shared cell capacity', () => {
        const grid = createGridWithTopology({
            totalWidth: 500,
            totalDepth: 500,
            wallThickness: 0.1,
            cornerRadius: 0,
            maxBoxWidth: 5,
            maxBoxDepth: 5,
        })
        grid.push(
            grid[0].map((cell) => ({
                ...cell,
                group: 0,
                visibility: 'visible' as const,
            }))
        )
        expect(grid.length * grid[0].length).toBeGreaterThan(
            V1_MAX_LAYOUT_CELLS
        )

        expect(
            tryEncodeLayout(
                snapshot(
                    {
                        totalWidth: 500,
                        totalDepth: 500,
                        wallThickness: 0.1,
                        cornerRadius: 0,
                        maxBoxWidth: 5,
                        maxBoxDepth: 5,
                    },
                    grid
                )
            )
        ).toEqual({ ok: false, reason: 'oversized' })
    })

    it('decodes the largest supported multi-group payload quickly', () => {
        const grid = createGridWithTopology({
            totalWidth: 500,
            totalDepth: 500,
            wallThickness: 0.1,
            cornerRadius: 0,
            maxBoxWidth: 10,
            maxBoxDepth: 10,
        })
        let groupId = 1
        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x + 1 < grid[0].length; x += 2) {
                grid[z][x].group = groupId
                grid[z][x + 1].group = groupId
                groupId++
            }
        }

        const original = snapshot(
            {
                totalWidth: 500,
                totalDepth: 500,
                wallThickness: 0.1,
                cornerRadius: 0,
                maxBoxWidth: 10,
                maxBoxDepth: 10,
            },
            grid
        )
        const encoded = encodeLayout(original)
        expect(encoded.length).toBeLessThanOrEqual(MAX_LAYOUT_STORAGE_CHARS)

        const started = Date.now()
        const decoded = decodeLayout(encoded)
        const elapsed = Date.now() - started

        expect(decoded.ok).toBe(true)
        expect(elapsed).toBeLessThan(100)
        if (decoded.ok) {
            expect(decoded.snapshot.grid).toEqual(original.grid)
        }
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
