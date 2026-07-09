import { parameters } from '@/lib/defaults'
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

const minClearance = 0.1

export function sanitizeModelParameters(
    values: Partial<ModelParameters>,
    fallback: ModelParameters = defaultModelParameters
): ModelParameters {
    const totalWidth = clampFinite(
        values.totalWidth,
        fallback.totalWidth,
        parameters.totalWidth.min,
        parameters.totalWidth.max
    )
    const totalDepth = clampFinite(
        values.totalDepth,
        fallback.totalDepth,
        parameters.totalDepth.min,
        parameters.totalDepth.max
    )
    const maxBoxWidth = clampFinite(
        values.maxBoxWidth,
        fallback.maxBoxWidth,
        parameters.maxBoxWidth.min,
        parameters.maxBoxWidth.max
    )
    const maxBoxDepth = clampFinite(
        values.maxBoxDepth,
        fallback.maxBoxDepth,
        parameters.maxBoxDepth.min,
        parameters.maxBoxDepth.max
    )
    const wallHeight = clampFinite(
        values.wallHeight,
        fallback.wallHeight,
        parameters.wallHeight.min,
        parameters.wallHeight.max
    )

    const minBoxDimension = Math.min(
        minSegmentSize(totalWidth, maxBoxWidth),
        minSegmentSize(totalDepth, maxBoxDepth)
    )
    const maxWallThickness = Math.max(
        parameters.wallThickness.min,
        minBoxDimension / 2 - minClearance
    )
    const wallThickness = clampFinite(
        values.wallThickness,
        fallback.wallThickness,
        parameters.wallThickness.min,
        Math.min(parameters.wallThickness.max, maxWallThickness)
    )
    const cornerRadius = clampFinite(
        values.cornerRadius,
        fallback.cornerRadius,
        parameters.cornerRadius.min,
        Math.min(parameters.cornerRadius.max, minBoxDimension / 2)
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

function minSegmentSize(total: number, maxSize: number): number {
    const remainder = total % maxSize
    return remainder > 0 ? Math.min(maxSize, remainder) : maxSize
}
