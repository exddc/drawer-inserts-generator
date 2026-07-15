import { resizeGrid } from '@/lib/gridHelper'
import { defaultModelConfig } from '@/lib/modelSnapshot'
import {
    getMinimumBoxSize,
    sanitizeModelParameters,
} from '@/lib/parameterValidation'
import type { Grid, ModelConfig } from '@/lib/types'
import type { ModelSnapshot } from '@/lib/modelSnapshot'

const LAYOUT_VERSION = 1

type WireConfig = Partial<{
    w: number
    d: number
    t: number
    r: number
    h: number
    b: 0 | 1
    mw: number
    md: number
}>

type WireLayout = {
    v: number
    c?: WireConfig
    g?: number[] | string
    z?: number[]
}

const CONFIG_KEY_MAP = {
    totalWidth: 'w',
    totalDepth: 'd',
    wallThickness: 't',
    cornerRadius: 'r',
    wallHeight: 'h',
    generateBottom: 'b',
    maxBoxWidth: 'mw',
    maxBoxDepth: 'md',
} as const satisfies Record<keyof ModelConfig, keyof WireConfig | 'b'>

const WIRE_CONFIG_KEY_MAP = Object.fromEntries(
    Object.entries(CONFIG_KEY_MAP).map(([modelKey, wireKey]) => [
        wireKey,
        modelKey,
    ])
) as Record<keyof WireConfig, keyof ModelConfig>

export function encodeLayout(snapshot: ModelSnapshot): string {
    const wire: WireLayout = { v: LAYOUT_VERSION }
    const configDiff = encodeConfigDiff(snapshot.config)
    if (Object.keys(configDiff).length > 0) wire.c = configDiff

    const groups = encodeGroups(snapshot.grid)
    if (groups !== undefined) wire.g = groups

    const hidden = encodeHiddenCells(snapshot.grid)
    if (hidden.length > 0) wire.z = hidden

    return toBase64Url(JSON.stringify(wire))
}

export function decodeLayout(encoded: string): ModelSnapshot | null {
    try {
        const wire = JSON.parse(fromBase64Url(encoded)) as WireLayout
        if (wire.v !== LAYOUT_VERSION) return null

        const config = decodeConfig(wire.c)
        const minBoxSize = getMinimumBoxSize(
            config.wallThickness,
            config.cornerRadius
        )
        const grid = resizeGrid(
            [],
            config.totalWidth,
            config.totalDepth,
            config.maxBoxWidth,
            config.maxBoxDepth,
            minBoxSize
        )
        if (grid.length === 0) {
            return { config, grid }
        }

        applyGroups(grid, decodeGroups(wire.g, grid))
        applyHiddenCells(grid, wire.z ?? [])

        return { config, grid }
    } catch {
        return null
    }
}

function encodeConfigDiff(config: ModelConfig): WireConfig {
    const wire: WireConfig = {}

    if (config.totalWidth !== defaultModelConfig.totalWidth) {
        wire.w = config.totalWidth
    }
    if (config.totalDepth !== defaultModelConfig.totalDepth) {
        wire.d = config.totalDepth
    }
    if (config.wallThickness !== defaultModelConfig.wallThickness) {
        wire.t = config.wallThickness
    }
    if (config.cornerRadius !== defaultModelConfig.cornerRadius) {
        wire.r = config.cornerRadius
    }
    if (config.wallHeight !== defaultModelConfig.wallHeight) {
        wire.h = config.wallHeight
    }
    if (config.generateBottom !== defaultModelConfig.generateBottom) {
        wire.b = config.generateBottom ? 1 : 0
    }
    if (config.maxBoxWidth !== defaultModelConfig.maxBoxWidth) {
        wire.mw = config.maxBoxWidth
    }
    if (config.maxBoxDepth !== defaultModelConfig.maxBoxDepth) {
        wire.md = config.maxBoxDepth
    }

    return wire
}

function decodeConfig(wire?: WireConfig): ModelConfig {
    const partial: Partial<ModelConfig> = {}

    if (wire) {
        for (const [wireKey, modelKey] of Object.entries(WIRE_CONFIG_KEY_MAP)) {
            const value = wire[wireKey as keyof WireConfig]
            if (value === undefined) continue

            if (modelKey === 'generateBottom') {
                partial.generateBottom = value === 1
            } else {
                partial[modelKey] = value as number
            }
        }
    }

    const sanitized = sanitizeModelParameters({
        ...defaultModelConfig,
        ...partial,
    })

    return {
        ...sanitized,
        generateBottom: partial.generateBottom ?? defaultModelConfig.generateBottom,
    }
}

function encodeGroups(grid: Grid): number[] | string | undefined {
    const flat = flattenGroups(grid)
    if (flat.every((group) => group === 0)) return undefined

    const rleString = toRunLengthString(flat)
    if (rleString.length < JSON.stringify(flat).length) return rleString

    return flat
}

function decodeGroups(
    encoded: number[] | string | undefined,
    grid: Grid
): number[] {
    const cellCount = grid.length * grid[0].length
    if (!encoded) return Array(cellCount).fill(0)
    if (typeof encoded === 'string') return fromRunLengthString(encoded, cellCount)
    return encoded
}

function encodeHiddenCells(grid: Grid): number[] {
    const hidden: number[] = []
    let index = 0

    for (const row of grid) {
        for (const cell of row) {
            if (cell.visibility === 'hidden') hidden.push(index)
            index++
        }
    }

    return hidden
}

function applyGroups(grid: Grid, groups: number[]): void {
    let index = 0
    for (const row of grid) {
        for (const cell of row) {
            cell.group = groups[index] ?? 0
            index++
        }
    }
}

function applyHiddenCells(grid: Grid, hidden: number[]): void {
    const hiddenSet = new Set(hidden)
    let index = 0

    for (const row of grid) {
        for (const cell of row) {
            if (hiddenSet.has(index)) cell.visibility = 'hidden'
            index++
        }
    }
}

function flattenGroups(grid: Grid): number[] {
    return grid.flatMap((row) => row.map((cell) => cell.group))
}

function toRunLengthString(groups: number[]): string {
    if (groups.length === 0) return ''

    const runs: string[] = []
    let current = groups[0]
    let count = 1

    for (let index = 1; index < groups.length; index++) {
        if (groups[index] === current) {
            count++
            continue
        }

        runs.push(`${current}:${count}`)
        current = groups[index]
        count = 1
    }

    runs.push(`${current}:${count}`)
    return runs.join('|')
}

function fromRunLengthString(encoded: string, cellCount: number): number[] {
    const groups: number[] = []

    for (const run of encoded.split('|')) {
        const [value, countValue] = run.split(':')
        const group = Number(value)
        const count = Number(countValue)
        if (!Number.isFinite(group) || !Number.isFinite(count) || count < 1) {
            throw new Error('Invalid run-length groups')
        }

        for (let index = 0; index < count; index++) {
            groups.push(group)
        }
    }

    if (groups.length !== cellCount) {
        throw new Error('Group count does not match grid size')
    }

    return groups
}

function toBase64Url(value: string): string {
    const bytes = new TextEncoder().encode(value)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = (4 - (base64.length % 4)) % 4
    const bytes = Uint8Array.from(atob(base64 + '='.repeat(padding)), (char) =>
        char.charCodeAt(0)
    )
    return new TextDecoder().decode(bytes)
}
