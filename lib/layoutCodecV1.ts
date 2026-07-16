import type { Grid, ModelConfig } from '@/lib/types'

/**
 * Frozen layout codec v1 reconstruction rules.
 * Do not import live app defaults, ranges, or sizing helpers here —
 * historical v1 payloads must keep decoding the same way forever.
 */

export const V1_DEFAULT_CONFIG: Readonly<ModelConfig> = {
    totalWidth: 150,
    totalDepth: 150,
    wallThickness: 2,
    cornerRadius: 4,
    wallHeight: 30,
    generateBottom: true,
    maxBoxWidth: 100,
    maxBoxDepth: 100,
}

export const V1_PARAMETER_RANGES = {
    totalWidth: { min: 1, max: 500 },
    totalDepth: { min: 1, max: 500 },
    wallThickness: { min: 0.1, max: 15 },
    cornerRadius: { min: 0, max: 30 },
    wallHeight: { min: 0.1, max: 100 },
    maxBoxWidth: { min: 1, max: 500 },
    maxBoxDepth: { min: 1, max: 500 },
} as const

export const V1_MIN_BOX_CLEARANCE = 1
export const V1_DIMENSION_TOLERANCE = 1e-9

/** Soft cap on reconstructed cells for decode/encode workload. */
export const V1_MAX_LAYOUT_CELLS = 2500

type V1ModelParameters = Omit<ModelConfig, 'generateBottom'>

export function v1GetMinimumBoxSize(
    wallThickness: number,
    cornerRadius: number
): number {
    const safeWallThickness =
        Number.isFinite(wallThickness) && wallThickness > 0 ? wallThickness : 0
    const safeCornerRadius =
        Number.isFinite(cornerRadius) && cornerRadius > 0 ? cornerRadius : 0

    return roundDimension(
        safeWallThickness * 2 + safeCornerRadius * 2 + V1_MIN_BOX_CLEARANCE
    )
}

export function v1SanitizeModelParameters(
    values: Partial<V1ModelParameters>,
    fallback: V1ModelParameters = V1_DEFAULT_CONFIG
): V1ModelParameters {
    const wallThickness = clampFinite(
        values.wallThickness,
        fallback.wallThickness,
        V1_PARAMETER_RANGES.wallThickness.min,
        V1_PARAMETER_RANGES.wallThickness.max
    )
    const cornerRadius = clampFinite(
        values.cornerRadius,
        fallback.cornerRadius,
        V1_PARAMETER_RANGES.cornerRadius.min,
        V1_PARAMETER_RANGES.cornerRadius.max
    )
    const minBoxSize = v1GetMinimumBoxSize(wallThickness, cornerRadius)
    const totalWidth = clampFinite(
        values.totalWidth,
        fallback.totalWidth,
        Math.max(V1_PARAMETER_RANGES.totalWidth.min, minBoxSize),
        V1_PARAMETER_RANGES.totalWidth.max
    )
    const totalDepth = clampFinite(
        values.totalDepth,
        fallback.totalDepth,
        Math.max(V1_PARAMETER_RANGES.totalDepth.min, minBoxSize),
        V1_PARAMETER_RANGES.totalDepth.max
    )
    const maxBoxWidth = extendMaxBoxSize(
        totalWidth,
        clampFinite(
            values.maxBoxWidth,
            fallback.maxBoxWidth,
            Math.max(V1_PARAMETER_RANGES.maxBoxWidth.min, minBoxSize),
            V1_PARAMETER_RANGES.maxBoxWidth.max
        ),
        minBoxSize
    )
    const maxBoxDepth = extendMaxBoxSize(
        totalDepth,
        clampFinite(
            values.maxBoxDepth,
            fallback.maxBoxDepth,
            Math.max(V1_PARAMETER_RANGES.maxBoxDepth.min, minBoxSize),
            V1_PARAMETER_RANGES.maxBoxDepth.max
        ),
        minBoxSize
    )
    const wallHeight = clampFinite(
        values.wallHeight,
        fallback.wallHeight,
        V1_PARAMETER_RANGES.wallHeight.min,
        V1_PARAMETER_RANGES.wallHeight.max
    )

    return {
        totalWidth,
        totalDepth,
        wallThickness,
        cornerRadius,
        wallHeight,
        maxBoxWidth,
        maxBoxDepth,
    }
}

export function v1SegmentSizes(
    total: number,
    maxSize: number,
    minSize = 0
): number[] {
    if (!Number.isFinite(total) || !Number.isFinite(maxSize)) return [1]
    if (total <= 0 || maxSize <= 0) return [1]

    const segmentCount = Math.max(
        1,
        Math.ceil((total - V1_DIMENSION_TOLERANCE / 2) / maxSize)
    )
    const segments = Array(Math.max(0, segmentCount - 1)).fill(maxSize)
    segments.push(total - maxSize * (segmentCount - 1))

    const lastSegment = segments[segments.length - 1]
    if (lastSegment >= minSize) return segments

    const balancedSize = total / segmentCount
    const balancedSegments = Array(Math.max(0, segmentCount - 1)).fill(
        balancedSize
    )
    balancedSegments.push(total - balancedSize * (segmentCount - 1))
    return balancedSegments
}

export function v1ResizeGrid(
    oldGrid: Grid,
    totalWidth: number,
    totalDepth: number,
    maxBoxWidth: number,
    maxBoxDepth: number,
    minBoxSize = 0
): Grid {
    const widths = v1SegmentSizes(totalWidth, maxBoxWidth, minBoxSize)
    const depths = v1SegmentSizes(totalDepth, maxBoxDepth, minBoxSize)

    return depths.map((depth, rowIdx) =>
        widths.map((width, colIdx) => {
            const oldRow = oldGrid[rowIdx]
            const hasOld = oldRow !== undefined && colIdx < oldRow.length
            const oldCell = hasOld ? oldGrid[rowIdx][colIdx] : undefined
            return {
                group: oldCell?.group ?? 0,
                visibility: oldCell?.visibility ?? 'visible',
                width,
                depth,
            }
        })
    )
}

function extendMaxBoxSize(
    total: number,
    maxBoxSize: number,
    minBoxSize: number
): number {
    const segments = v1SegmentSizes(total, maxBoxSize, minBoxSize)
    const hasUndersizedSegment = segments.some((size) => size < minBoxSize)
    if (!hasUndersizedSegment) return maxBoxSize

    let maxValidSegmentCount = Math.max(1, Math.floor(total / minBoxSize))
    while (
        maxValidSegmentCount > 1 &&
        total / maxValidSegmentCount < minBoxSize
    ) {
        maxValidSegmentCount--
    }

    return roundDimensionUp(total / maxValidSegmentCount)
}

function clampFinite(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number
): number {
    const finiteValue =
        typeof value === 'number' && Number.isFinite(value) ? value : fallback
    return Math.min(Math.max(finiteValue, min), max)
}

function roundDimension(value: number): number {
    return Math.round(value * 1e10) / 1e10
}

function roundDimensionUp(value: number): number {
    return Math.ceil(value * 1e10) / 1e10
}
