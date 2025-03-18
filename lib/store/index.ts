import { create } from 'zustand'
import { type StoreApi } from 'zustand'
import { BoxState, createBoxSlice } from './boxStore'
import { UIState, createUISlice } from './uiStore'

// Combine the BoxState and UIState interfaces
export interface StoreState extends BoxState, UIState {
  loadFromUrl: () => void
  shareConfiguration: () => Promise<boolean>
  updateInput: (name: string, value: number | boolean | string) => void
}

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
    if (['width', 'depth', 'height', 'wallThickness', 'cornerRadius', 'hasBottom',
         'minBoxWidth', 'maxBoxWidth', 'minBoxDepth', 'maxBoxDepth', 'useMultipleBoxes'].includes(name)) {
      return state.updateBoxInput(name, value)
    }
    
    // UI properties
    if (['debugMode', 'uniqueBoxesExport', 'showGrid', 'showAxes', 
         'boxColor', 'highlightColor'].includes(name)) {
      return state.updateUIInput(name, value)
    }
    
    // Default case - just set the property
    set({ [name]: value } as any)
  }
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