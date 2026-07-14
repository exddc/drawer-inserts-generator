import { parameters } from '@/lib/defaults'
import { segmentSizes } from '@/lib/gridSizing'
import type { StoreState } from '@/lib/types'

export type ModelParameters = Pick<
    StoreState,
    | 'totalWidth'
    | 'totalDepth'
    | 'wallThickness'
    | 'cornerRadius'
    | 'wallHeight'
    | 'maxBoxWidth'
    | 'maxBoxDepth'
>

export const minBoxClearance = 1

export function sanitizeModelParameters(
    values: Partial<ModelParameters>,
    fallback: ModelParameters = defaultModelParameters
): ModelParameters {
    const wallThickness = clampFinite(
        values.wallThickness,
        fallback.wallThickness,
        parameters.wallThickness.min,
        parameters.wallThickness.max
    )
    const cornerRadius = clampFinite(
        values.cornerRadius,
        fallback.cornerRadius,
        parameters.cornerRadius.min,
        parameters.cornerRadius.max
    )
    const minBoxSize = getMinimumBoxSize(wallThickness, cornerRadius)
    const totalWidth = clampFinite(
        values.totalWidth,
        fallback.totalWidth,
        Math.max(parameters.totalWidth.min, minBoxSize),
        parameters.totalWidth.max
    )
    const totalDepth = clampFinite(
        values.totalDepth,
        fallback.totalDepth,
        Math.max(parameters.totalDepth.min, minBoxSize),
        parameters.totalDepth.max
    )
    const maxBoxWidth = extendMaxBoxSize(
        totalWidth,
        clampFinite(
            values.maxBoxWidth,
            fallback.maxBoxWidth,
            Math.max(parameters.maxBoxWidth.min, minBoxSize),
            parameters.maxBoxWidth.max
        ),
        minBoxSize
    )
    const maxBoxDepth = extendMaxBoxSize(
        totalDepth,
        clampFinite(
            values.maxBoxDepth,
            fallback.maxBoxDepth,
            Math.max(parameters.maxBoxDepth.min, minBoxSize),
            parameters.maxBoxDepth.max
        ),
        minBoxSize
    )
    const wallHeight = clampFinite(
        values.wallHeight,
        fallback.wallHeight,
        parameters.wallHeight.min,
        parameters.wallHeight.max
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

export function getMinimumBoxSize(
    wallThickness: number,
    cornerRadius: number
): number {
    const safeWallThickness =
        Number.isFinite(wallThickness) && wallThickness > 0 ? wallThickness : 0
    const safeCornerRadius =
        Number.isFinite(cornerRadius) && cornerRadius > 0 ? cornerRadius : 0

    return roundDimension(
        safeWallThickness * 2 + safeCornerRadius * 2 + minBoxClearance
    )
}

export const defaultModelParameters: ModelParameters = {
    totalWidth: parameters.totalWidth.default,
    totalDepth: parameters.totalDepth.default,
    wallThickness: parameters.wallThickness.default,
    cornerRadius: parameters.cornerRadius.default,
    wallHeight: parameters.wallHeight.default,
    maxBoxWidth: parameters.maxBoxWidth.default,
    maxBoxDepth: parameters.maxBoxDepth.default,
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

function extendMaxBoxSize(
    total: number,
    maxBoxSize: number,
    minBoxSize: number
): number {
    const segments = segmentSizes(total, maxBoxSize, minBoxSize)
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

function roundDimension(value: number): number {
    return Math.round(value * 1e10) / 1e10
}

function roundDimensionUp(value: number): number {
    return Math.ceil(value * 1e10) / 1e10
}
