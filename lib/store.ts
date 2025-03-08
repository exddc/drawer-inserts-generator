// lib/store.ts
import { create } from 'zustand';
import { calculateBoxWidths } from '@/lib/boxUtils';
import { defaultConstraints } from '@/lib/validationUtils';
import { getConfigFromUrl, shareConfiguration } from '@/lib/urlUtils';

export interface BoxState {
  // Core dimensions
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
  cornerRadius: number;
  hasBottom: boolean;
  
  // Multi-box settings
  minBoxWidth: number;
  maxBoxWidth: number;
  minBoxDepth: number;
  maxBoxDepth: number;
  useMultipleBoxes: boolean;
  boxWidths: number[];
  boxDepths: number[];
  
  // Debug mode
  debugMode: boolean;
  
  // Actions
  setWidth: (width: number) => void;
  setDepth: (depth: number) => void;
  setHeight: (height: number) => void;
  setWallThickness: (thickness: number) => void;
  setCornerRadius: (radius: number) => void;
  setHasBottom: (hasBottom: boolean) => void;
  setMinBoxWidth: (width: number) => void;
  setMaxBoxWidth: (width: number) => void;
  setMinBoxDepth: (depth: number) => void;
  setMaxBoxDepth: (depth: number) => void;
  setUseMultipleBoxes: (useMultiple: boolean) => void;
  setDebugMode: (debug: boolean) => void;
  
  // Helper method to update all settings at once (for form inputs)
  updateInput: (name: string, value: number | boolean) => void;
  
  // Load configuration from URL
  loadFromUrl: () => void;
  
  // Share configuration
  shareConfiguration: () => Promise<boolean>;
}

// Helper to recalculate box widths
const recalculateBoxWidths = (
  totalWidth: number,
  minWidth: number,
  maxWidth: number,
  useMultiple: boolean
): number[] => {
  if (!useMultiple) {
    return [totalWidth];
  }
  return calculateBoxWidths(totalWidth, minWidth, maxWidth);
};

// Helper to recalculate box depths
const recalculateBoxDepths = (
  totalDepth: number,
  minDepth: number,
  maxDepth: number,
  useMultiple: boolean
): number[] => {
  if (!useMultiple) {
    return [totalDepth];
  }
  return calculateBoxWidths(totalDepth, minDepth, maxDepth);
};

// Helper to ensure max width is valid
const validateMaxWidth = (maxWidth: number, minWidth: number, totalWidth: number): number => {
  return Math.min(Math.max(minWidth, maxWidth), totalWidth);
};

// Helper to ensure min width is valid
const validateMinWidth = (minWidth: number, maxWidth: number): number => {
  return Math.min(Math.max(defaultConstraints.minBoxWidth?.min || 10, minWidth), maxWidth);
};

// Default values
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
};

export const useBoxStore = create<BoxState>((set, get) => ({
  // Initial state
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
  
  // Actions
  setWidth: (width: number) => {
    const { minBoxWidth, maxBoxWidth, useMultipleBoxes } = get();
    
    // Ensure max width doesn't exceed total width
    const newMaxWidth = validateMaxWidth(maxBoxWidth, minBoxWidth, width);
    
    set({ 
      width,
      maxBoxWidth: newMaxWidth,
      boxWidths: recalculateBoxWidths(width, minBoxWidth, newMaxWidth, useMultipleBoxes)
    });
  },
  
  setDepth: (depth: number) => {
    const { minBoxDepth, maxBoxDepth, useMultipleBoxes } = get();
    
    // Ensure max depth doesn't exceed total depth
    const newMaxDepth = validateMaxWidth(maxBoxDepth, minBoxDepth, depth);
    
    set({ 
      depth,
      maxBoxDepth: newMaxDepth,
      boxDepths: recalculateBoxDepths(depth, minBoxDepth, newMaxDepth, useMultipleBoxes)
    });
  },
  
  setHeight: (height: number) => set({ height }),
  
  setWallThickness: (wallThickness: number) => set({ wallThickness }),
  
  setCornerRadius: (cornerRadius: number) => set({ cornerRadius }),
  
  setHasBottom: (hasBottom: boolean) => {
    const { wallThickness, height } = get();
    let newHeight = height;
    
    // If enabling bottom, ensure height is at least wallThickness + 1mm
    if (hasBottom && height <= wallThickness) {
      newHeight = wallThickness + 1;
    }
    
    set({ hasBottom, height: newHeight });
  },
  
  setMinBoxWidth: (minBoxWidth: number) => {
    const { maxBoxWidth, width, useMultipleBoxes } = get();
    
    // Validate min width
    const newMinWidth = validateMinWidth(minBoxWidth, maxBoxWidth);
    
    // Recalculate box widths
    set({ 
      minBoxWidth: newMinWidth,
      boxWidths: recalculateBoxWidths(width, newMinWidth, maxBoxWidth, useMultipleBoxes)
    });
  },
  
  setMaxBoxWidth: (maxBoxWidth: number) => {
    const { minBoxWidth, width, useMultipleBoxes } = get();
    
    // Validate max width
    const newMaxWidth = validateMaxWidth(maxBoxWidth, minBoxWidth, width);
    
    // Recalculate box widths
    set({ 
      maxBoxWidth: newMaxWidth,
      boxWidths: recalculateBoxWidths(width, minBoxWidth, newMaxWidth, useMultipleBoxes)
    });
  },
  
  setMinBoxDepth: (minBoxDepth: number) => {
    const { maxBoxDepth, depth, useMultipleBoxes } = get();
    
    // Validate min depth
    const newMinDepth = validateMinWidth(minBoxDepth, maxBoxDepth);
    
    // Recalculate box depths
    set({ 
      minBoxDepth: newMinDepth,
      boxDepths: recalculateBoxDepths(depth, newMinDepth, maxBoxDepth, useMultipleBoxes)
    });
  },
  
  setMaxBoxDepth: (maxBoxDepth: number) => {
    const { minBoxDepth, depth, useMultipleBoxes } = get();
    
    // Validate max depth
    const newMaxDepth = validateMaxWidth(maxBoxDepth, minBoxDepth, depth);
    
    // Recalculate box depths
    set({ 
      maxBoxDepth: newMaxDepth,
      boxDepths: recalculateBoxDepths(depth, minBoxDepth, newMaxDepth, useMultipleBoxes)
    });
  },
  
  setUseMultipleBoxes: (useMultipleBoxes: boolean) => {
    const { width, minBoxWidth, maxBoxWidth, depth, minBoxDepth, maxBoxDepth } = get();
    
    set({ 
      useMultipleBoxes,
      boxWidths: recalculateBoxWidths(width, minBoxWidth, maxBoxWidth, useMultipleBoxes),
      boxDepths: recalculateBoxDepths(depth, minBoxDepth, maxBoxDepth, useMultipleBoxes)
    });
  },
  
  setDebugMode: (debugMode: boolean) => set({ debugMode }),
  
  // Generic update method for form inputs
  updateInput: (name: string, value: number | boolean) => {
    const state = get();
    
    switch (name) {
      case 'width':
        state.setWidth(value as number);
        break;
      case 'depth':
        state.setDepth(value as number);
        break;
      case 'height':
        state.setHeight(value as number);
        break;
      case 'wallThickness':
        state.setWallThickness(value as number);
        break;
      case 'cornerRadius':
        state.setCornerRadius(value as number);
        break;
      case 'hasBottom':
        state.setHasBottom(value as boolean);
        break;
      case 'minBoxWidth':
        state.setMinBoxWidth(value as number);
        break;
      case 'maxBoxWidth':
        state.setMaxBoxWidth(value as number);
        break;
      case 'minBoxDepth':
        state.setMinBoxDepth(value as number);
        break;
      case 'maxBoxDepth':
        state.setMaxBoxDepth(value as number);
        break;
      case 'useMultipleBoxes':
        state.setUseMultipleBoxes(value as boolean);
        break;
      case 'debugMode':
        state.setDebugMode(value as boolean);
        break;
      default:
        // Just update the value directly if we don't have a specific handler
        set({ [name]: value } as any);
    }
  },
  
  // Load configuration from URL
  loadFromUrl: () => {
    const urlConfig = getConfigFromUrl();
    if (!urlConfig) return;
    
    const state = get();
    // Apply each valid property from the URL configuration
    Object.entries(urlConfig).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'number' || typeof value === 'boolean') {
          state.updateInput(key, value);
        } else {
          console.warn(`Skipping update for key "${key}": value is not a number or boolean`, value);
        }
      }
    });
  },
  
  // Share configuration 
  shareConfiguration: async () => {
    return shareConfiguration(get());
  }
}));

// Initialize URL configuration on first import (client-side only)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after component initialization
  setTimeout(() => {
    useBoxStore.getState().loadFromUrl();
  }, 0);
}