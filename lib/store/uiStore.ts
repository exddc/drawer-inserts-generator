import { StateCreator } from 'zustand'
import { StoreState } from '@/lib/store/index'
import { CombinedBoxInfo } from '@/lib/types';

// Default values for UI state
export const uiDefaults = {
  debugMode: false,
  showGrid: true,
  showAxes: false,
  selectedBoxIndex: null,
  boxColor: '#7a9cbf',
  highlightColor: '#f59e0b',
  actionsBarPosition: 'bottom',
  combinedBoxes: new Map<number, CombinedBoxInfo>(),
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
  
  // Combined boxes tracking (primary box index -> array of secondary box indexes)
  combinedBoxes: Map<number, CombinedBoxInfo>
  
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
  
  // Box combining actions
  canCombineSelectedBoxes: () => boolean
  combineSelectedBoxes: () => void
  isCombinedBox: (index: number) => boolean
  isPrimaryBox: (index: number) => boolean
  getCombinedBoxIndices: (index: number) => number[]
  resetCombinedBoxes: () => void
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
  combinedBoxes: new Map<number, CombinedBoxInfo>(),

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
    const { hiddenBoxes, combinedBoxes } = get();
    const newHiddenBoxes = new Set(hiddenBoxes);
    
    // If this is a primary box in a combined group, toggle visibility for all boxes in the group
    if (combinedBoxes.has(index)) {
        const combinedInfo = combinedBoxes.get(index);
        
        if (combinedInfo && Array.isArray(combinedInfo.indices)) {
            const allIndices = [index, ...combinedInfo.indices];
            
            const currentlyHidden = hiddenBoxes.has(index);
            
            if (currentlyHidden) {
                // Show all boxes in the group
                allIndices.forEach(idx => newHiddenBoxes.delete(idx));
            } else {
                // Hide all boxes in the group
                allIndices.forEach(idx => newHiddenBoxes.add(idx));
            }
        }
    } else {
        // Check if this box is part of a combined group (as a secondary box)
        let isSecondary = false;
        let primaryIndex = -1;
        
        for (const [primary, combinedInfo] of combinedBoxes.entries()) {
            if (combinedInfo && Array.isArray(combinedInfo.indices) && combinedInfo.indices.includes(index)) {
                isSecondary = true;
                primaryIndex = primary;
                break;
            }
        }
        
        if (isSecondary && primaryIndex !== -1) {
            // Toggle visibility for the entire combined group
            const combinedInfo = combinedBoxes.get(primaryIndex);
            
            if (combinedInfo && Array.isArray(combinedInfo.indices)) {
                const allIndices = [primaryIndex, ...combinedInfo.indices];
                
                const currentlyHidden = hiddenBoxes.has(primaryIndex);
                
                if (currentlyHidden) {
                    // Show all boxes in the group
                    allIndices.forEach(idx => newHiddenBoxes.delete(idx));
                } else {
                    // Hide all boxes in the group
                    allIndices.forEach(idx => newHiddenBoxes.add(idx));
                }
            }
        } else {
            // Regular box, just toggle its visibility
            if (hiddenBoxes.has(index)) {
                newHiddenBoxes.delete(index);
            } else {
                newHiddenBoxes.add(index);
            }
        }
    }
    
    set({ hiddenBoxes: newHiddenBoxes });
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
  
  // Box combining methods
  canCombineSelectedBoxes: () => {
    const { selectedBoxIndices, boxWidths, boxDepths } = get();
    const indices = Array.from(selectedBoxIndices);
    
    // Need at least 2 boxes to combine
    if (indices.length < 2) return false;
    
    // Convert indices to grid positions (row, column)
    const boxGrid = [];
    const numCols = boxWidths.length;
    
    for (const index of indices) {
      const row = Math.floor(index / numCols);
      const col = index % numCols;
      boxGrid.push({ index, row, col });
    }
    
    // First check if boxes are in the same row (width combination)
    const firstRow = boxGrid[0].row;
    const sameRow = boxGrid.every(box => box.row === firstRow);
    
    if (sameRow) {
      // Sort by column for horizontal adjacency check
      boxGrid.sort((a, b) => a.col - b.col);
      
      // Check if boxes are adjacent horizontally
      for (let i = 1; i < boxGrid.length; i++) {
        if (boxGrid[i].col !== boxGrid[i-1].col + 1) {
          return false;
        }
      }
      
      return true;
    }
    
    // If not same row, check if they're in the same column (depth combination)
    const firstCol = boxGrid[0].col;
    const sameCol = boxGrid.every(box => box.col === firstCol);
    
    if (sameCol) {
      // Sort by row for vertical adjacency check
      boxGrid.sort((a, b) => a.row - b.row);
      
      // Check if boxes are adjacent vertically
      for (let i = 1; i < boxGrid.length; i++) {
        if (boxGrid[i].row !== boxGrid[i-1].row + 1) {
          return false;
        }
      }
      
      return true;
    }
    
    // Neither in same row nor same column
    return false;
  },
  
  
  combineSelectedBoxes: () => {
    const { selectedBoxIndices, canCombineSelectedBoxes, combinedBoxes, boxWidths } = get();
    
    if (!canCombineSelectedBoxes()) return;
    
    const indices = Array.from(selectedBoxIndices);
    const numCols = boxWidths.length;
    
    // Convert indices to grid positions
    const boxGrid = indices.map(index => ({
      index,
      row: Math.floor(index / numCols),
      col: index % numCols
    }));
    
    // Check if boxes are in same row (width combination) or same column (depth combination)
    const firstRow = boxGrid[0].row;
    const sameRow = boxGrid.every(box => box.row === firstRow);
    
    const firstCol = boxGrid[0].col;
    const sameCol = boxGrid.every(box => box.col === firstCol);
    
    if (sameRow) {
      // Width combination - sort by column (left to right)
      boxGrid.sort((a, b) => a.col - b.col);
    } else if (sameCol) {
      // Depth combination - sort by row (top to bottom)
      boxGrid.sort((a, b) => a.row - b.row);
    }
    
    // Use the first (topmost or leftmost) box as primary
    const primaryBoxIndex = boxGrid[0].index;
    const secondaryIndices = boxGrid.slice(1).map(box => box.index);
    
    // Create a new map to avoid mutation issues
    const newCombinedBoxes = new Map(combinedBoxes);
    
    // Add the new combined box info
    newCombinedBoxes.set(primaryBoxIndex, {
      indices: secondaryIndices,
      direction: sameRow ? 'width' : 'depth'
    });
    
    // Update the state
    set({ 
      combinedBoxes: newCombinedBoxes,
      selectedBoxIndices: new Set([primaryBoxIndex]),
      selectedBoxIndex: primaryBoxIndex
    });
  },
  
  isCombinedBox: (index: number) => {
    const { combinedBoxes } = get();
    
    for (const [_, combinedInfo] of combinedBoxes.entries()) {
      if (combinedInfo.indices.includes(index)) {
        return true;
      }
    }
    
    return false;
  },
  
  isPrimaryBox: (index: number) => {
    const { combinedBoxes } = get();
    return combinedBoxes.has(index);
  },
  
  getCombinedBoxIndices: (primaryIndex: number) => {
    const { combinedBoxes } = get();
    const combined = combinedBoxes.get(primaryIndex);
    return combined ? [primaryIndex, ...combined.indices] : [primaryIndex];
  },
  
  resetCombinedBoxes: () => {
    set({ combinedBoxes: new Map<number, CombinedBoxInfo>() });
  },
})