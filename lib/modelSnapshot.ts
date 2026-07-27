import { resizeGrid } from '@/lib/gridHelper'
import {
    defaultModelParameters,
    getMinimumBoxSize,
    sanitizeModelParameters,
} from '@/lib/parameterValidation'
import type { DrawerInsert, ModelConfig, StoreState } from '@/lib/types'

export type ModelSnapshot = Pick<DrawerInsert, 'config' | 'grid'>

export function createModelSnapshot(
    state: Pick<StoreState, keyof ModelConfig | 'grid'>
): ModelSnapshot {
    return {
        config: {
            totalWidth: state.totalWidth,
            totalDepth: state.totalDepth,
            wallThickness: state.wallThickness,
            cornerRadius: state.cornerRadius,
            wallHeight: state.wallHeight,
            generateBottom: state.generateBottom,
            maxBoxWidth: state.maxBoxWidth,
            maxBoxDepth: state.maxBoxDepth,
        },
        grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
    }
}

/**
 * Re-run **live** sanitizers and grid resize on a snapshot.
 *
 * Not for loading share links or local saves — those must use
 * `hydrateStoreFromSnapshot`, which preserves frozen v1 cell geometry.
 * Use only when intentionally reinterpreting a layout under current app rules.
 */
export function reinterpretSnapshotWithLiveRules(
    snapshot: ModelSnapshot
): Pick<StoreState, keyof ModelConfig | 'grid'> {
    const sanitized = sanitizeModelParameters(snapshot.config)
    const minBoxSize = getMinimumBoxSize(
        sanitized.wallThickness,
        sanitized.cornerRadius
    )
    const grid = resizeGrid(
        snapshot.grid,
        sanitized.totalWidth,
        sanitized.totalDepth,
        sanitized.maxBoxWidth,
        sanitized.maxBoxDepth,
        minBoxSize
    )

    return {
        ...sanitized,
        generateBottom: snapshot.config.generateBottom,
        grid,
    }
}

export const defaultModelConfig: ModelConfig = {
    ...defaultModelParameters,
    generateBottom: true,
}
