import {
    V1_DEFAULT_CONFIG,
    V1_MAX_LAYOUT_CELLS,
    v1GetMinimumBoxSize,
    v1ResizeGrid,
    v1SanitizeModelParameters,
} from '@/lib/layoutCodecV1'
import { validatePersistedGridTopology } from '@/lib/layoutTopology'
import type { ModelSnapshot } from '@/lib/modelSnapshot'
import type { Grid, ModelConfig } from '@/lib/types'

export const LAYOUT_VERSION = 1
export { V1_DEFAULT_CONFIG, V1_MAX_LAYOUT_CELLS }

/**
 * Shared ceiling for local save and decode. URL hash uses a lower limit.
 * Anything accepted by local save must still load.
 */
export const MAX_LAYOUT_STORAGE_CHARS = 100_000
export const MAX_LAYOUT_DECODE_CHARS = MAX_LAYOUT_STORAGE_CHARS

export type LayoutDecodeFailureReason =
    'empty' | 'oversized' | 'corrupt' | 'unsupported' | 'invalid-topology'

export type LayoutDecodeResult =
    | { ok: true; snapshot: ModelSnapshot }
    | { ok: false; reason: LayoutDecodeFailureReason }

export type LayoutEncodeResult =
    | { ok: true; encoded: string }
    | { ok: false; reason: 'oversized' | 'invalid-topology' }

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

const WIRE_CONFIG_KEY_MAP = {
    w: 'totalWidth',
    d: 'totalDepth',
    t: 'wallThickness',
    r: 'cornerRadius',
    h: 'wallHeight',
    b: 'generateBottom',
    mw: 'maxBoxWidth',
    md: 'maxBoxDepth',
} as const satisfies Record<keyof WireConfig, keyof ModelConfig>

const KNOWN_WIRE_KEYS = new Set(['v', 'c', 'g', 'z'])

export function encodeLayout(snapshot: ModelSnapshot): string {
    const result = tryEncodeLayout(snapshot)
    if (!result.ok) {
        throw new LayoutCodecError(
            result.reason === 'invalid-topology'
                ? 'invalid-topology'
                : 'corrupt',
            `Cannot encode layout: ${result.reason}`
        )
    }
    return result.encoded
}

export function tryEncodeLayout(snapshot: ModelSnapshot): LayoutEncodeResult {
    const cellCount =
        snapshot.grid.length === 0
            ? 0
            : snapshot.grid.length * snapshot.grid[0].length
    if (cellCount > V1_MAX_LAYOUT_CELLS) {
        return { ok: false, reason: 'oversized' }
    }

    try {
        validatePersistedGridTopology(snapshot.grid)
    } catch {
        return { ok: false, reason: 'invalid-topology' }
    }

    const wire: WireLayout = { v: LAYOUT_VERSION }
    const configDiff = encodeConfigDiff(snapshot.config)
    if (Object.keys(configDiff).length > 0) wire.c = configDiff

    const groups = encodeGroups(snapshot.grid)
    if (groups !== undefined) wire.g = groups

    const hidden = encodeHiddenCells(snapshot.grid)
    if (hidden.length > 0) wire.z = hidden

    const encoded = toBase64Url(JSON.stringify(wire))
    if (encoded.length > MAX_LAYOUT_STORAGE_CHARS) {
        return { ok: false, reason: 'oversized' }
    }

    return { ok: true, encoded }
}

export function decodeLayout(encoded: string): LayoutDecodeResult {
    if (!encoded) return { ok: false, reason: 'empty' }
    if (encoded.length > MAX_LAYOUT_DECODE_CHARS) {
        return { ok: false, reason: 'oversized' }
    }

    try {
        const wire = JSON.parse(fromBase64Url(encoded)) as WireLayout
        if (!wire || typeof wire !== 'object' || Array.isArray(wire)) {
            return { ok: false, reason: 'corrupt' }
        }
        for (const key of Object.keys(wire)) {
            if (!KNOWN_WIRE_KEYS.has(key)) {
                return { ok: false, reason: 'corrupt' }
            }
        }
        if (wire.v !== LAYOUT_VERSION) {
            return { ok: false, reason: 'unsupported' }
        }

        const config = decodeConfig(wire.c)
        const minBoxSize = v1GetMinimumBoxSize(
            config.wallThickness,
            config.cornerRadius
        )
        const grid = v1ResizeGrid(
            [],
            config.totalWidth,
            config.totalDepth,
            config.maxBoxWidth,
            config.maxBoxDepth,
            minBoxSize
        )

        const cellCount = grid.length === 0 ? 0 : grid.length * grid[0].length
        if (cellCount > V1_MAX_LAYOUT_CELLS) {
            return { ok: false, reason: 'oversized' }
        }

        if (grid.length === 0) {
            return { ok: true, snapshot: { config, grid } }
        }

        const groups = decodeGroups(wire.g, cellCount)
        applyGroups(grid, groups)

        const hidden = decodeHiddenCells(wire.z, cellCount)
        applyHiddenCells(grid, hidden)

        validatePersistedGridTopology(grid)

        return { ok: true, snapshot: { config, grid } }
    } catch (error) {
        if (error instanceof LayoutCodecError) {
            return {
                ok: false,
                reason:
                    error.code === 'invalid-topology'
                        ? 'invalid-topology'
                        : 'corrupt',
            }
        }
        if (
            error instanceof Error &&
            /disconnected|hole/i.test(error.message)
        ) {
            return { ok: false, reason: 'invalid-topology' }
        }
        return { ok: false, reason: 'corrupt' }
    }
}

class LayoutCodecError extends Error {
    constructor(
        readonly code: 'corrupt' | 'invalid-topology',
        message: string
    ) {
        super(message)
        this.name = 'LayoutCodecError'
    }
}

function encodeConfigDiff(config: ModelConfig): WireConfig {
    const wire: WireConfig = {}

    if (config.totalWidth !== V1_DEFAULT_CONFIG.totalWidth) {
        wire.w = config.totalWidth
    }
    if (config.totalDepth !== V1_DEFAULT_CONFIG.totalDepth) {
        wire.d = config.totalDepth
    }
    if (config.wallThickness !== V1_DEFAULT_CONFIG.wallThickness) {
        wire.t = config.wallThickness
    }
    if (config.cornerRadius !== V1_DEFAULT_CONFIG.cornerRadius) {
        wire.r = config.cornerRadius
    }
    if (config.wallHeight !== V1_DEFAULT_CONFIG.wallHeight) {
        wire.h = config.wallHeight
    }
    if (config.generateBottom !== V1_DEFAULT_CONFIG.generateBottom) {
        wire.b = config.generateBottom ? 1 : 0
    }
    if (config.maxBoxWidth !== V1_DEFAULT_CONFIG.maxBoxWidth) {
        wire.mw = config.maxBoxWidth
    }
    if (config.maxBoxDepth !== V1_DEFAULT_CONFIG.maxBoxDepth) {
        wire.md = config.maxBoxDepth
    }

    return wire
}

function decodeConfig(wire?: WireConfig): ModelConfig {
    if (wire === undefined) {
        return { ...V1_DEFAULT_CONFIG }
    }

    if (wire === null || typeof wire !== 'object' || Array.isArray(wire)) {
        throw new LayoutCodecError('corrupt', 'Config must be an object')
    }

    const partial: Partial<ModelConfig> = {}

    for (const key of Object.keys(wire)) {
        if (!(key in WIRE_CONFIG_KEY_MAP)) {
            throw new LayoutCodecError('corrupt', `Unknown config key ${key}`)
        }
    }

    for (const [wireKey, modelKey] of Object.entries(WIRE_CONFIG_KEY_MAP)) {
        const value = wire[wireKey as keyof WireConfig]
        if (value === undefined) continue

        if (modelKey === 'generateBottom') {
            if (value !== 0 && value !== 1) {
                throw new LayoutCodecError(
                    'corrupt',
                    'Invalid generateBottom flag'
                )
            }
            partial.generateBottom = value === 1
        } else if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new LayoutCodecError('corrupt', 'Invalid config number')
        } else {
            partial[modelKey] = value
        }
    }

    const sanitized = v1SanitizeModelParameters({
        ...V1_DEFAULT_CONFIG,
        ...partial,
    })

    return {
        ...sanitized,
        generateBottom:
            partial.generateBottom ?? V1_DEFAULT_CONFIG.generateBottom,
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
    cellCount: number
): number[] {
    if (encoded === undefined) {
        return Array.from({ length: cellCount }, () => 0)
    }

    if (typeof encoded === 'string') {
        return fromRunLengthString(encoded, cellCount)
    }

    if (!Array.isArray(encoded)) {
        throw new LayoutCodecError('corrupt', 'Groups must be an array or RLE')
    }
    if (encoded.length !== cellCount) {
        throw new LayoutCodecError(
            'corrupt',
            'Group count does not match grid size'
        )
    }

    return encoded.map((group, index) => {
        if (!Number.isInteger(group) || group < 0) {
            throw new LayoutCodecError(
                'corrupt',
                `Invalid group id at index ${index}`
            )
        }
        return group
    })
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

function decodeHiddenCells(
    hidden: number[] | undefined,
    cellCount: number
): number[] {
    if (hidden === undefined) return []
    if (!Array.isArray(hidden)) {
        throw new LayoutCodecError('corrupt', 'Hidden cells must be an array')
    }

    return hidden.map((index, position) => {
        if (!Number.isInteger(index) || index < 0 || index >= cellCount) {
            throw new LayoutCodecError(
                'corrupt',
                `Invalid hidden cell index at position ${position}`
            )
        }
        return index
    })
}

function applyGroups(grid: Grid, groups: number[]): void {
    let index = 0
    for (const row of grid) {
        for (const cell of row) {
            cell.group = groups[index]!
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
    let current = groups[0]!
    let count = 1

    for (let index = 1; index < groups.length; index++) {
        if (groups[index] === current) {
            count++
            continue
        }

        runs.push(`${current}:${count}`)
        current = groups[index]!
        count = 1
    }

    runs.push(`${current}:${count}`)
    return runs.join('|')
}

function fromRunLengthString(encoded: string, cellCount: number): number[] {
    if (encoded.length > MAX_LAYOUT_DECODE_CHARS) {
        throw new LayoutCodecError('corrupt', 'RLE payload too large')
    }

    const groups = new Array<number>(cellCount)
    let offset = 0

    for (const run of encoded.split('|')) {
        if (!run) {
            throw new LayoutCodecError('corrupt', 'Empty RLE run')
        }

        const separator = run.indexOf(':')
        if (separator <= 0 || separator === run.length - 1) {
            throw new LayoutCodecError('corrupt', 'Malformed RLE run')
        }

        const groupText = run.slice(0, separator)
        const countText = run.slice(separator + 1)
        if (!/^-?\d+$/.test(groupText) || !/^\d+$/.test(countText)) {
            throw new LayoutCodecError('corrupt', 'Non-integer RLE values')
        }

        const group = Number(groupText)
        const count = Number(countText)

        if (!Number.isInteger(group) || group < 0) {
            throw new LayoutCodecError('corrupt', 'Invalid RLE group id')
        }
        if (!Number.isInteger(count) || count < 1) {
            throw new LayoutCodecError('corrupt', 'Invalid RLE count')
        }
        if (offset + count > cellCount) {
            throw new LayoutCodecError(
                'corrupt',
                'RLE expansion exceeds grid size'
            )
        }

        for (let index = 0; index < count; index++) {
            groups[offset++] = group
        }
    }

    if (offset !== cellCount) {
        throw new LayoutCodecError(
            'corrupt',
            'Group count does not match grid size'
        )
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
    if (!/^[A-Za-z0-9_-]*$/.test(value)) {
        throw new LayoutCodecError('corrupt', 'Invalid base64url characters')
    }

    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = (4 - (base64.length % 4)) % 4
    const bytes = Uint8Array.from(atob(base64 + '='.repeat(padding)), (char) =>
        char.charCodeAt(0)
    )
    return new TextDecoder().decode(bytes)
}
