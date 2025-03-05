// src/utils/validationUtils.ts

export interface InputConstraint {
    min: number;
    max: number;
  }
  
  export interface InputConstraints {
    width: InputConstraint;
    depth: InputConstraint;
    height: InputConstraint;
    wallThickness: InputConstraint;
    cornerRadius: InputConstraint;
  }
  
  // Default constraints for the drawer insert
  export const defaultConstraints: InputConstraints = {
    width: { min: 10, max: 500 },
    depth: { min: 10, max: 500 },
    height: { min: 5, max: 300 },
    wallThickness: { min: 0.5, max: 10 },
    cornerRadius: { min: 0, max: 50 },
  };
  
  /**
   * Validate and adjust a numeric input value based on constraints
   */
  export function validateNumericInput(
    name: string,
    value: number,
    constraints: InputConstraints,
    currentValues: {
      width: number;
      depth: number;
      height: number;
      wallThickness: number;
      cornerRadius: number;
      hasBottom: boolean;
    }
  ): number {
    const { min, max } = constraints[name as keyof InputConstraints];
    let validatedValue = value;
    
    // Apply basic min/max constraints
    if (name === 'height' && currentValues.hasBottom) {
      // If we have a bottom, ensure height is at least wallThickness + 1mm
      const minHeight = Math.max(min, currentValues.wallThickness + 1);
      validatedValue = Math.max(minHeight, Math.min(validatedValue, max));
    } else {
      validatedValue = Math.max(min, Math.min(validatedValue, max));
    }
    
    // Additional validation for corner radius
    if (name === 'cornerRadius') {
      const maxCornerX = (currentValues.width - 2 * currentValues.wallThickness) / 2;
      const maxCornerY = (currentValues.depth - 2 * currentValues.wallThickness) / 2;
      const maxCorner = Math.min(maxCornerX, maxCornerY, max);
      validatedValue = Math.min(validatedValue, maxCorner);
    }
    
    return validatedValue;
  }
  
  /**
   * Calculate the maximum allowed corner radius based on current dimensions
   */
  export function calculateMaxCornerRadius(
    width: number,
    depth: number,
    wallThickness: number,
    maxConstraint: number
  ): number {
    const maxCornerX = (width - 2 * wallThickness) / 2;
    const maxCornerY = (depth - 2 * wallThickness) / 2;
    return Math.min(maxCornerX, maxCornerY, maxConstraint);
  }