import { decodeLayout, encodeLayout } from '@/lib/layoutCodec'
import {
    applyModelSnapshot,
    createModelSnapshot,
    defaultModelConfig,
} from '@/lib/modelSnapshot'
import { defaultModelParameters } from '@/lib/parameterValidation'
import { resizeGrid } from '@/lib/gridHelper'
import { getMinimumBoxSize } from '@/lib/parameterValidation'
import type { Grid, ModelConfig } from '@/lib/types'
import { describe, expect, it } from 'vitest'

function createGridWithTopology(
    config: Partial<ModelConfig> = {},
    mutate?: (grid: Grid) => void
): Grid {
    const fullConfig = { ...defaultModelConfig, ...config }
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
    const fullConfig = { ...defaultModelConfig, ...config }
    return createModelSnapshot({
        ...fullConfig,
        grid: grid ?? createGridWithTopology(fullConfig),
    })
}

describe('layoutCodec', () => {
    it('roundtrips the default layout with a tiny payload', () => {
        const original = snapshot()
        const encoded = encodeLayout(original)

        expect(encoded.length).toBeLessThan(32)
        expect(decodeLayout(encoded)).toEqual(original)
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

        expect(decoded).toEqual(original)
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
        expect(decodeLayout(encoded)).toEqual(original)
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

    it('only encodes config values that differ from defaults', () => {
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
    })

    it('returns null for corrupt or unsupported payloads', () => {
        expect(decodeLayout('not-valid')).toBeNull()
        expect(decodeLayout('')).toBeNull()

        const unsupportedVersion = Buffer.from(
            JSON.stringify({ v: 99, c: { w: 200 } }),
            'utf8'
        ).toString('base64url')

        expect(decodeLayout(unsupportedVersion)).toBeNull()
    })

    it('applies decoded layouts back into store-shaped model state', () => {
        const original = snapshot(
            {
                totalWidth: 220,
                generateBottom: false,
            },
            createCombinedGrid({ totalWidth: 220 })
        )
        const applied = applyModelSnapshot(decodeLayout(encodeLayout(original))!)

        expect(applied.totalWidth).toBe(220)
        expect(applied.generateBottom).toBe(false)
        expect(applied.grid).toEqual(original.grid)
        expect(applied.maxBoxWidth).toBe(defaultModelParameters.maxBoxWidth)
    })
})
