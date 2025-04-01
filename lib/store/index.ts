// lib/store/index.ts
import { create } from 'zustand'
import { StoreState } from '../types'
import { createBoxSlice } from './boxStore'
import { createSharingSlice } from './sharingStore'
import { createUISlice } from './uiStore'

// The createBoxSlice, createUISlice, and createSharingSlice functions should each
// return an object with their respective state and methods

export const useBoxStore = create<StoreState>()((set, get) => ({
    // First, combine all the slices
    ...createBoxSlice(set, get, {}),
    ...createUISlice(set, get, {}),
    ...createSharingSlice(set, get, {}),

    // Then add the unified updateInput function
    updateInput: (name: string, value: number | boolean | string) => {
        // Now we can safely access the methods from the slices
        const state = get()

        // Box-related inputs
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
                'uniqueBoxesExport',
            ].includes(name)
        ) {
            state.updateBoxInput(name, value)
        }
        // UI-related inputs
        else if (
            [
                'debugMode',
                'showGrid',
                'showAxes',
                'boxColor',
                'highlightColor',
            ].includes(name)
        ) {
            state.updateUIInput(name, value)
        }
        // Default case
        else {
            set({ [name]: value } as any)
        }
    },
}))
