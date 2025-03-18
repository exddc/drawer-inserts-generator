import { StateCreator } from 'zustand'
import { StoreState } from './index'

// Default values for UI state
export const uiDefaults = {
  debugMode: false,
  showGrid: true,
  showAxes: false,
  selectedBoxIndex: null,
  boxColor: '#7a9cbf',
  highlightColor: '#f59e0b',
  actionsBarPosition: 'bottom',
}

// UI state interface
export interface UIState {
  // UI settings
  debugMode: boolean
  showGrid: boolean
  showAxes: boolean
  actionsBarPosition: string
  
  // Selection and visibility state
  selectedBoxIndex: number | null
  selectedBoxIndices: Set<number>
  hiddenBoxes: Set<number>
  
  // Color settings
  boxColor: string
  highlightColor: string

  // UI actions
  setDebugMode: (debug: boolean) => void
  setShowGrid: (show: boolean) => void
  setShowAxes: (show: boolean) => void
  setActionsBarPosition: (position: 'top' | 'bottom') => void
  setSelectedBoxIndex: (index: number | null) => void
  toggleBoxSelection: (index: number, isMultiSelect: boolean) => void
  clearSelectedBoxes: () => void
  toggleBoxVisibility: (index: number) => void
  toggleSelectedBoxesVisibility: () => void
  isBoxVisible: (index: number) => boolean
  isBoxSelected: (index: number) => boolean
  setBoxColor: (color: string) => void
  setHighlightColor: (color: string) => void
  getBoxHexColor: () => number
  getHighlightHexColor: () => number
  updateUIInput: (name: string, value: number | boolean | string) => void
}

// Create UI store slice
export const createUISlice: StateCreator<
  StoreState, 
  [], 
  [], 
  UIState
> = (set, get, store) => ({
  // Initial state
  ...uiDefaults,
  hiddenBoxes: new Set<number>(),
  selectedBoxIndices: new Set<number>(),

  // UI setting actions
  setDebugMode: (debugMode: boolean) => set({ 
    debugMode,
    // Reset selected box when debug mode is turned off
    selectedBoxIndex: debugMode ? get().selectedBoxIndex : null,
    selectedBoxIndices: debugMode ? get().selectedBoxIndices : new Set<number>(),
  }),

  setShowGrid: (showGrid: boolean) => set({ showGrid }),

  setShowAxes: (showAxes: boolean) => set({ showAxes }),

  setActionsBarPosition: (position: 'top' | 'bottom') => 
    set({ actionsBarPosition: position }),

  // Color actions
  setBoxColor: (color: string) => {
    set({ boxColor: color })
  },
  
  setHighlightColor: (color: string) => {
    set({ highlightColor: color })
  },
  
  // Convert hex color string to THREE.js hex format (number)
  getBoxHexColor: () => {
    const color = get().boxColor.replace('#', '0x')
    return parseInt(color, 16)
  },
  
  // Convert highlight hex color string to THREE.js hex format (number)
  getHighlightHexColor: () => {
    const color = get().highlightColor.replace('#', '0x')
    return parseInt(color, 16)
  },

  // Selection actions
  setSelectedBoxIndex: (selectedBoxIndex: number | null) => set({ 
    selectedBoxIndex,
    selectedBoxIndices: selectedBoxIndex !== null 
      ? new Set([selectedBoxIndex]) 
      : new Set<number>()
  }),
  
  toggleBoxSelection: (index: number, isMultiSelect: boolean) => {
    const selectedBoxIndices = new Set(get().selectedBoxIndices);
    
    if (!isMultiSelect) {
      selectedBoxIndices.clear();
      selectedBoxIndices.add(index);
      set({ 
        selectedBoxIndices,
        selectedBoxIndex: index
      });
    } else {
      if (selectedBoxIndices.has(index)) {
        selectedBoxIndices.delete(index);
        
        if (get().selectedBoxIndex === index) {
          const nextSelected = selectedBoxIndices.size > 0 
            ? selectedBoxIndices.values().next().value 
            : null;
          set({
            selectedBoxIndices,
            selectedBoxIndex: nextSelected
          });
        } else {
          set({ selectedBoxIndices });
        }
      } else {
        selectedBoxIndices.add(index);
        if (get().selectedBoxIndex === null) {
          set({
            selectedBoxIndices,
            selectedBoxIndex: index
          });
        } else {
          set({ selectedBoxIndices });
        }
      }
    }
  },
  
  clearSelectedBoxes: () => {
    set({ 
      selectedBoxIndices: new Set<number>(),
      selectedBoxIndex: null
    });
  },
  
  // Visibility actions
  toggleBoxVisibility: (index: number) => {
    const hiddenBoxes = new Set(get().hiddenBoxes);
    
    if (hiddenBoxes.has(index)) {
      hiddenBoxes.delete(index);
    } else {
      hiddenBoxes.add(index);
    }
    
    set({ hiddenBoxes });
  },

  toggleSelectedBoxesVisibility: () => {
    const { selectedBoxIndices, hiddenBoxes } = get();
    const newHiddenBoxes = new Set(hiddenBoxes);
    const anyVisible = Array.from(selectedBoxIndices).some(idx => !hiddenBoxes.has(idx));
    
    if (anyVisible) {
      // Hide all selected boxes
      selectedBoxIndices.forEach(idx => {
        newHiddenBoxes.add(idx);
      });
    } else {
      // Show all selected boxes
      selectedBoxIndices.forEach(idx => {
        newHiddenBoxes.delete(idx);
      });
    }
    
    set({ hiddenBoxes: newHiddenBoxes });
  },
  
  isBoxVisible: (index: number) => {
    return !get().hiddenBoxes.has(index);
  },
  
  isBoxSelected: (index: number) => {
    return get().selectedBoxIndices.has(index);
  },

  // UI-specific input handler
  updateUIInput: (name: string, value: number | boolean | string) => {
    const state = get()

    switch (name) {
      case 'debugMode':
        state.setDebugMode(value as boolean)
        break
      case 'showGrid':
        state.setShowGrid(value as boolean)
        break
      case 'showAxes':
        state.setShowAxes(value as boolean)
        break
      case 'boxColor':
        state.setBoxColor(value as string)
        break
      case 'highlightColor':
        state.setHighlightColor(value as string)
        break
      default:
        set({ [name]: value } as any)
    }
  },
})