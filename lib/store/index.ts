import { create } from 'zustand'
import { createBoxSlice } from '@/lib/store/boxStore'
import { createUISlice } from '@/lib/store/uiStore'
import { StoreState } from '@/lib/types'

// Create the combined store with all slices
export const useBoxStore = create<StoreState>((set, get, store) => ({
    ...createBoxSlice(set, get, store),
    ...createUISlice(set, get, store),

    // Shared functionality that needs both slices
    loadFromUrl: () => {
        const { getConfigFromUrl } = require('../urlUtils')
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
        const { shareConfiguration } = require('../urlUtils')
        return shareConfiguration(get())
    },

    // Shared update function that can update both box and UI state
    updateInput: (name: string, value: number | boolean | string) => {
        const state = get()

        // Box dimension properties
        if (
            [
                'width',
                'depth',
                'height',
                'wallThickness',
                'cornerRadius',
                'hasBottom',
                'minBoxWidth',
                'maxBoxWidth',
                'minBoxDepth',
                'maxBoxDepth',
                'useMultipleBoxes',
            ].includes(name)
        ) {
            return state.updateBoxInput(name, value)
        }

        // UI properties
        if (
            [
                'debugMode',
                'uniqueBoxesExport',
                'showGrid',
                'showAxes',
                'boxColor',
                'highlightColor',
            ].includes(name)
        ) {
            return state.updateUIInput(name, value)
        }

        // Default case - just set the property
        set({ [name]: value } as any)
    },

    // When reset combined boxes, ensure we also reset selection
    resetCombinedBoxes: () => {
        const { combinedBoxes, selectedBoxIndices } = get()

        // If nothing is selected, no need to do anything
        if (selectedBoxIndices.size === 0) {
            set({ combinedBoxes: new Map() })
            return
        }

        // If a combined box is selected, clear selection
        const newCombinedBoxes = new Map()
        set({
            combinedBoxes: newCombinedBoxes,
            selectedBoxIndices: new Set(),
            selectedBoxIndex: null,
        })
    },
}))

// Initialize the store when in browser environment
if (typeof window !== 'undefined') {
    setTimeout(() => {
        useBoxStore.getState().loadFromUrl()
    }, 0)
}

// Re-export all types
export * from './boxStore'
export * from './uiStore'
