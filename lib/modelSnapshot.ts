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

export function applyModelSnapshot(
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
