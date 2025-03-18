import { StateCreator } from 'zustand'
import { calculateBoxWidths } from '../boxUtils'
import { defaultConstraints } from '../validationUtils'
import { StoreState } from './index'

// Utility functions for the box store
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

// Default values for box dimensions
export const boxDefaults = {
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
  uniqueBoxesExport: true,
}

// Box state interface
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

  // Export options
  uniqueBoxesExport: boolean

  // Box actions
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
  setUniqueBoxesExport: (uniqueExport: boolean) => void
  updateBoxInput: (name: string, value: number | boolean | string) => void
}

// Create box store slice
export const createBoxSlice: StateCreator<
  StoreState, 
  [], 
  [], 
  BoxState
> = (set, get, store) => ({
  // Initial state
  ...boxDefaults,
  boxWidths: recalculateBoxWidths(
    boxDefaults.width,
    boxDefaults.minBoxWidth,
    boxDefaults.maxBoxWidth,
    boxDefaults.useMultipleBoxes
  ),
  boxDepths: recalculateBoxDepths(
    boxDefaults.depth,
    boxDefaults.minBoxDepth,
    boxDefaults.maxBoxDepth,
    boxDefaults.useMultipleBoxes
  ),

  // Dimension-related actions
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

  // Multi-box settings
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
      selectedBoxIndices: new Set<number>(),
      hiddenBoxes: new Set<number>(),
    })
  },

  setUniqueBoxesExport: (uniqueBoxesExport: boolean) =>
    set({ uniqueBoxesExport }),

  // Box-specific input handler
  updateBoxInput: (name: string, value: number | boolean | string) => {
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
      case 'uniqueBoxesExport':
        state.setUniqueBoxesExport(value as boolean)
        break
      default:
        set({ [name]: value } as any)
    }
  },
})