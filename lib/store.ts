import { create } from 'zustand'
import { calculateBoxWidths } from '@/lib/boxUtils'
import { defaultConstraints } from '@/lib/validationUtils'
import { getConfigFromUrl, shareConfiguration } from '@/lib/urlUtils'

export interface BoxState {
    // Core dimensions
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean

    // Multi-box settings
    minBoxWidth: number
    maxBoxWidth: number
    minBoxDepth: number
    maxBoxDepth: number
    useMultipleBoxes: boolean
    boxWidths: number[]
    boxDepths: number[]

    // UI settings
    debugMode: boolean
    showGrid: boolean
    showAxes: boolean
    selectedBoxIndex: number | null

    // Export options
    uniqueBoxesExport: boolean

    // Actions
    setWidth: (width: number) => void
    setDepth: (depth: number) => void
    setHeight: (height: number) => void
    setWallThickness: (thickness: number) => void
    setCornerRadius: (radius: number) => void
    setHasBottom: (hasBottom: boolean) => void
    setMinBoxWidth: (width: number) => void
    setMaxBoxWidth: (width: number) => void
    setMinBoxDepth: (depth: number) => void
    setMaxBoxDepth: (depth: number) => void
    setUseMultipleBoxes: (useMultiple: boolean) => void
    setDebugMode: (debug: boolean) => void
    setShowGrid: (show: boolean) => void
    setShowAxes: (show: boolean) => void
    setUniqueBoxesExport: (uniqueExport: boolean) => void
    setSelectedBoxIndex: (index: number | null) => void
    updateInput: (name: string, value: number | boolean) => void
    loadFromUrl: () => void
    shareConfiguration: () => Promise<boolean>
}

const recalculateBoxWidths = (
    totalWidth: number,
    minWidth: number,
    maxWidth: number,
    useMultiple: boolean
): number[] => {
    if (!useMultiple) {
        return [totalWidth]
    }
    return calculateBoxWidths(totalWidth, minWidth, maxWidth)
}

const recalculateBoxDepths = (
    totalDepth: number,
    minDepth: number,
    maxDepth: number,
    useMultiple: boolean
): number[] => {
    if (!useMultiple) {
        return [totalDepth]
    }
    return calculateBoxWidths(totalDepth, minDepth, maxDepth)
}

const validateMaxWidth = (
    maxWidth: number,
    minWidth: number,
    totalWidth: number
): number => {
    return Math.min(Math.max(minWidth, maxWidth), totalWidth)
}

const validateMinWidth = (minWidth: number, maxWidth: number): number => {
    return Math.min(
        Math.max(defaultConstraints.minBoxWidth?.min || 10, minWidth),
        maxWidth
    )
}

const defaultValues = {
    width: 150,
    depth: 150,
    height: 30,
    wallThickness: 2,
    cornerRadius: 5,
    hasBottom: true,
    minBoxWidth: 10,
    maxBoxWidth: 100,
    minBoxDepth: 10,
    maxBoxDepth: 100,
    useMultipleBoxes: true,
    debugMode: false,
    uniqueBoxesExport: true,
    showGrid: true,
    showAxes: false,
    selectedBoxIndex: null,
}

export const useBoxStore = create<BoxState>((set, get) => ({
    ...defaultValues,
    boxWidths: recalculateBoxWidths(
        defaultValues.width,
        defaultValues.minBoxWidth,
        defaultValues.maxBoxWidth,
        defaultValues.useMultipleBoxes
    ),
    boxDepths: recalculateBoxDepths(
        defaultValues.depth,
        defaultValues.minBoxDepth,
        defaultValues.maxBoxDepth,
        defaultValues.useMultipleBoxes
    ),

    setWidth: (width: number) => {
        const { minBoxWidth, maxBoxWidth, useMultipleBoxes } = get()
        const newMaxWidth = validateMaxWidth(maxBoxWidth, minBoxWidth, width)

        set({
            width,
            maxBoxWidth: newMaxWidth,
            boxWidths: recalculateBoxWidths(
                width,
                minBoxWidth,
                newMaxWidth,
                useMultipleBoxes
            ),
        })
    },

    setDepth: (depth: number) => {
        const { minBoxDepth, maxBoxDepth, useMultipleBoxes } = get()
        const newMaxDepth = validateMaxWidth(maxBoxDepth, minBoxDepth, depth)

        set({
            depth,
            maxBoxDepth: newMaxDepth,
            boxDepths: recalculateBoxDepths(
                depth,
                minBoxDepth,
                newMaxDepth,
                useMultipleBoxes
            ),
        })
    },

    setHeight: (height: number) => set({ height }),

    setWallThickness: (wallThickness: number) => set({ wallThickness }),

    setCornerRadius: (cornerRadius: number) => set({ cornerRadius }),

    setHasBottom: (hasBottom: boolean) => {
        const { wallThickness, height } = get()
        let newHeight = height

        if (hasBottom && height <= wallThickness) {
            newHeight = wallThickness + 1
        }

        set({ hasBottom, height: newHeight })
    },

    setMinBoxWidth: (minBoxWidth: number) => {
        const { maxBoxWidth, width, useMultipleBoxes } = get()
        const newMinWidth = validateMinWidth(minBoxWidth, maxBoxWidth)

        set({
            minBoxWidth: newMinWidth,
            boxWidths: recalculateBoxWidths(
                width,
                newMinWidth,
                maxBoxWidth,
                useMultipleBoxes
            ),
        })
    },

    setMaxBoxWidth: (maxBoxWidth: number) => {
        const { minBoxWidth, width, useMultipleBoxes } = get()
        const newMaxWidth = validateMaxWidth(maxBoxWidth, minBoxWidth, width)

        set({
            maxBoxWidth: newMaxWidth,
            boxWidths: recalculateBoxWidths(
                width,
                minBoxWidth,
                newMaxWidth,
                useMultipleBoxes
            ),
        })
    },

    setMinBoxDepth: (minBoxDepth: number) => {
        const { maxBoxDepth, depth, useMultipleBoxes } = get()
        const newMinDepth = validateMinWidth(minBoxDepth, maxBoxDepth)

        set({
            minBoxDepth: newMinDepth,
            boxDepths: recalculateBoxDepths(
                depth,
                newMinDepth,
                maxBoxDepth,
                useMultipleBoxes
            ),
        })
    },

    setMaxBoxDepth: (maxBoxDepth: number) => {
        const { minBoxDepth, depth, useMultipleBoxes } = get()
        const newMaxDepth = validateMaxWidth(maxBoxDepth, minBoxDepth, depth)

        set({
            maxBoxDepth: newMaxDepth,
            boxDepths: recalculateBoxDepths(
                depth,
                minBoxDepth,
                newMaxDepth,
                useMultipleBoxes
            ),
        })
    },

    setUseMultipleBoxes: (useMultipleBoxes: boolean) => {
        const {
            width,
            minBoxWidth,
            maxBoxWidth,
            depth,
            minBoxDepth,
            maxBoxDepth,
        } = get()

        set({
            useMultipleBoxes,
            boxWidths: recalculateBoxWidths(
                width,
                minBoxWidth,
                maxBoxWidth,
                useMultipleBoxes
            ),
            boxDepths: recalculateBoxDepths(
                depth,
                minBoxDepth,
                maxBoxDepth,
                useMultipleBoxes
            ),
            selectedBoxIndex: null,
        })
    },

    setDebugMode: (debugMode: boolean) => set({ 
        debugMode,
        // Reset selected box when debug mode is turned off
        selectedBoxIndex: debugMode ? get().selectedBoxIndex : null
    }),

    setShowGrid: (showGrid: boolean) => set({ showGrid }),

    setShowAxes: (showAxes: boolean) => set({ showAxes }),

    setUniqueBoxesExport: (uniqueBoxesExport: boolean) =>
        set({ uniqueBoxesExport }),
        
    setSelectedBoxIndex: (selectedBoxIndex: number | null) => set({ selectedBoxIndex }),

    updateInput: (name: string, value: number | boolean) => {
        const state = get()

        switch (name) {
            case 'width':
                state.setWidth(value as number)
                break
            case 'depth':
                state.setDepth(value as number)
                break
            case 'height':
                state.setHeight(value as number)
                break
            case 'wallThickness':
                state.setWallThickness(value as number)
                break
            case 'cornerRadius':
                state.setCornerRadius(value as number)
                break
            case 'hasBottom':
                state.setHasBottom(value as boolean)
                break
            case 'minBoxWidth':
                state.setMinBoxWidth(value as number)
                break
            case 'maxBoxWidth':
                state.setMaxBoxWidth(value as number)
                break
            case 'minBoxDepth':
                state.setMinBoxDepth(value as number)
                break
            case 'maxBoxDepth':
                state.setMaxBoxDepth(value as number)
                break
            case 'useMultipleBoxes':
                state.setUseMultipleBoxes(value as boolean)
                break
            case 'debugMode':
                state.setDebugMode(value as boolean)
                break
            case 'uniqueBoxesExport':
                state.setUniqueBoxesExport(value as boolean)
                break
            case 'showGrid':
                state.setShowGrid(value as boolean)
                break
            case 'showAxes':
                state.setShowAxes(value as boolean)
                break
            default:
                set({ [name]: value } as any)
        }
    },

    loadFromUrl: () => {
        const urlConfig = getConfigFromUrl()
        if (!urlConfig) return

        const state = get()
        Object.entries(urlConfig).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (typeof value === 'number' || typeof value === 'boolean') {
                    state.updateInput(key, value)
                } else {
                    console.warn(
                        `Skipping update for key "${key}": value is not a number or boolean`,
                        value
                    )
                }
            }
        })
    },

    shareConfiguration: async () => {
        return shareConfiguration(get())
    },
}))

if (typeof window !== 'undefined') {
    setTimeout(() => {
        useBoxStore.getState().loadFromUrl()
    }, 0)
}