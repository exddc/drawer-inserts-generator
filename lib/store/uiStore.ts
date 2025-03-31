import { CombinedBoxInfo, StoreState, UIState, uiDefaults } from '@/lib/types'
import { StateCreator } from 'zustand'

// Create UI store slice
export const createUISlice: StateCreator<StoreState, [], [], UIState> = (
    set,
    get,
    store
) => ({
    // Initial state
    ...uiDefaults,
    hiddenBoxes: new Set<number>(),
    selectedBoxIndices: new Set<number>(),
    combinedBoxes: new Map<number, CombinedBoxInfo>(),

    // UI setting actions
    setDebugMode: (debugMode: boolean) =>
        set({
            debugMode,
            // Reset selected box when debug mode is turned off
            selectedBoxIndex: debugMode ? get().selectedBoxIndex : null,
            selectedBoxIndices: debugMode
                ? get().selectedBoxIndices
                : new Set<number>(),
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
    setSelectedBoxIndex: (selectedBoxIndex: number | null) =>
        set({
            selectedBoxIndex,
            selectedBoxIndices:
                selectedBoxIndex !== null
                    ? new Set([selectedBoxIndex])
                    : new Set<number>(),
        }),

    toggleBoxSelection: (index: number, isMultiSelect: boolean) => {
        const selectedBoxIndices = new Set(get().selectedBoxIndices)

        if (!isMultiSelect) {
            selectedBoxIndices.clear()
            selectedBoxIndices.add(index)
            set({
                selectedBoxIndices,
                selectedBoxIndex: index,
            })
        } else {
            if (selectedBoxIndices.has(index)) {
                selectedBoxIndices.delete(index)

                if (get().selectedBoxIndex === index) {
                    const nextSelected =
                        selectedBoxIndices.size > 0
                            ? selectedBoxIndices.values().next().value
                            : null
                    set({
                        selectedBoxIndices,
                        selectedBoxIndex: nextSelected,
                    })
                } else {
                    set({ selectedBoxIndices })
                }
            } else {
                selectedBoxIndices.add(index)
                if (get().selectedBoxIndex === null) {
                    set({
                        selectedBoxIndices,
                        selectedBoxIndex: index,
                    })
                } else {
                    set({ selectedBoxIndices })
                }
            }
        }
    },

    clearSelectedBoxes: () => {
        set({
            selectedBoxIndices: new Set<number>(),
            selectedBoxIndex: null,
        })
    },

    // Visibility actions
    toggleBoxVisibility: (index: number) => {
        const { hiddenBoxes, combinedBoxes } = get()
        const newHiddenBoxes = new Set(hiddenBoxes)

        // If this is a primary box in a combined group, toggle visibility for all boxes in the group
        if (combinedBoxes.has(index)) {
            const combinedInfo = combinedBoxes.get(index)

            if (combinedInfo && Array.isArray(combinedInfo.indices)) {
                const allIndices = [index, ...combinedInfo.indices]

                const currentlyHidden = hiddenBoxes.has(index)

                if (currentlyHidden) {
                    // Show all boxes in the group
                    allIndices.forEach((idx) => newHiddenBoxes.delete(idx))
                } else {
                    // Hide all boxes in the group
                    allIndices.forEach((idx) => newHiddenBoxes.add(idx))
                }
            }
        } else {
            // Check if this box is part of a combined group (as a secondary box)
            let isSecondary = false
            let primaryIndex = -1

            for (const [primary, combinedInfo] of combinedBoxes.entries()) {
                if (
                    combinedInfo &&
                    Array.isArray(combinedInfo.indices) &&
                    combinedInfo.indices.includes(index)
                ) {
                    isSecondary = true
                    primaryIndex = primary
                    break
                }
            }

            if (isSecondary && primaryIndex !== -1) {
                // Toggle visibility for the entire combined group
                const combinedInfo = combinedBoxes.get(primaryIndex)

                if (combinedInfo && Array.isArray(combinedInfo.indices)) {
                    const allIndices = [primaryIndex, ...combinedInfo.indices]

                    const currentlyHidden = hiddenBoxes.has(primaryIndex)

                    if (currentlyHidden) {
                        // Show all boxes in the group
                        allIndices.forEach((idx) => newHiddenBoxes.delete(idx))
                    } else {
                        // Hide all boxes in the group
                        allIndices.forEach((idx) => newHiddenBoxes.add(idx))
                    }
                }
            } else {
                // Regular box, just toggle its visibility
                if (hiddenBoxes.has(index)) {
                    newHiddenBoxes.delete(index)
                } else {
                    newHiddenBoxes.add(index)
                }
            }
        }

        set({ hiddenBoxes: newHiddenBoxes })
    },

    toggleSelectedBoxesVisibility: () => {
        const { selectedBoxIndices, hiddenBoxes } = get()
        const newHiddenBoxes = new Set(hiddenBoxes)
        const anyVisible = Array.from(selectedBoxIndices).some(
            (idx) => !hiddenBoxes.has(idx)
        )

        if (anyVisible) {
            // Hide all selected boxes
            selectedBoxIndices.forEach((idx) => {
                newHiddenBoxes.add(idx)
            })
        } else {
            // Show all selected boxes
            selectedBoxIndices.forEach((idx) => {
                newHiddenBoxes.delete(idx)
            })
        }

        set({ hiddenBoxes: newHiddenBoxes })
    },

    isBoxVisible: (index: number) => {
        return !get().hiddenBoxes.has(index)
    },

    isBoxSelected: (index: number) => {
        return get().selectedBoxIndices.has(index)
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

    isCombinedBox: (index: number) => {
        const { combinedBoxes } = get()

        for (const [_, combinedInfo] of combinedBoxes.entries()) {
            if (combinedInfo.indices.includes(index)) {
                return true
            }
        }

        return false
    },

    isPrimaryBox: (index: number) => {
        const { combinedBoxes } = get()
        return combinedBoxes.has(index)
    },

    getCombinedBoxIndices: (primaryIndex: number) => {
        const { combinedBoxes } = get()
        const combined = combinedBoxes.get(primaryIndex)
        return combined ? [primaryIndex, ...combined.indices] : [primaryIndex]
    },

    resetCombinedBoxes: () => {
        set({ combinedBoxes: new Map<number, CombinedBoxInfo>() })
    },

    // Box combining methods using the new connection-based approach
    canCombineSelectedBoxes: () => {
        const { selectedBoxIndices, boxWidths } = get()
        const indices = Array.from(selectedBoxIndices)
        
        return indices.length > 1 && indices.every(idx => idx < boxWidths.length)
    },

    combineSelectedBoxes: () => {
        const { selectedBoxIndices, canCombineSelectedBoxes, boxWidths, combinedBoxes } = get()
        
        if (!canCombineSelectedBoxes()) return
        
        const indices = Array.from(selectedBoxIndices)
        const numCols = boxWidths.length
        
        // Function to check if two boxes are adjacent
        const areAdjacent = (index1: number, index2: number): boolean => {
            const row1 = Math.floor(index1 / numCols)
            const col1 = index1 % numCols
            const row2 = Math.floor(index2 / numCols)
            const col2 = index2 % numCols
            
            // Horizontally adjacent
            if (row1 === row2 && Math.abs(col1 - col2) === 1) {
                return true
            }
            // Vertically adjacent
            if (col1 === col2 && Math.abs(row1 - row2) === 1) {
                return true
            }
            return false
        }
        
        // Create connections between adjacent boxes
        let connections = new Map<number, number[]>()
        
        // For each box, connect it to its adjacent boxes
        for (let i = 0; i < indices.length; i++) {
            for (let j = i + 1; j < indices.length; j++) {
                if (areAdjacent(indices[i], indices[j])) {
                    // Add bidirectional connections
                    if (!connections.has(indices[i])) {
                        connections.set(indices[i], [indices[j]])
                    } else {
                        connections.set(indices[i], [...connections.get(indices[i])!, indices[j]])
                    }
                    
                    if (!connections.has(indices[j])) {
                        connections.set(indices[j], [indices[i]])
                    } else {
                        connections.set(indices[j], [...connections.get(indices[j])!, indices[i]])
                    }
                }
            }
        }
        
        // Find the first box (top-left) to use as primary
        const primaryIndex = indices.reduce((minIndex, index) => {
            const row = Math.floor(index / numCols)
            const col = index % numCols
            const minRow = Math.floor(minIndex / numCols)
            const minCol = minIndex % numCols
            
            // Compare row first, then column
            if (row < minRow || (row === minRow && col < minCol)) {
                return index
            }
            return minIndex
        }, indices[0])
        
        // Determine direction for compatibility with existing code
        // For complex shapes, we'll use a fallback direction
        let direction: 'width' | 'depth' = 'width'
        
        // Check if boxes are in same row
        const rows = new Set(indices.map(index => Math.floor(index / numCols)))
        const cols = new Set(indices.map(index => index % numCols))
        
        if (rows.size === 1) {
            direction = 'width'
        } else if (cols.size === 1) {
            direction = 'depth'
        } else {
            // Complex shape - determine by comparing max distances
            const minRow = Math.min(...Array.from(rows))
            const maxRow = Math.max(...Array.from(rows))
            const minCol = Math.min(...Array.from(cols))
            const maxCol = Math.max(...Array.from(cols))
            
            // Use the longer dimension as primary direction
            direction = (maxCol - minCol) > (maxRow - minRow) ? 'width' : 'depth'
        }
        
        // For compatibility with the existing code, also update combinedBoxes
        const newCombinedBoxes = new Map(combinedBoxes)
        newCombinedBoxes.set(primaryIndex, {
            indices: indices.filter(idx => idx !== primaryIndex),
            direction,
            connections: Array.from(connections.entries()) // Store the connections
        })
        
        // Update the state
        set({
            combinedBoxes: newCombinedBoxes,
            selectedBoxIndices: new Set([primaryIndex]),
            selectedBoxIndex: primaryIndex,
        })
    }
    
})
