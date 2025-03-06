// src/lib/validationUtils.ts

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
  minBoxWidth?: InputConstraint;
  maxBoxWidth?: InputConstraint;
}

// Default constraints for the drawer insert
export const defaultConstraints: InputConstraints = {
  width: { min: 10, max: 500 },
  depth: { min: 10, max: 500 },
  height: { min: 5, max: 300 },
  wallThickness: { min: 0.5, max: 10 },
  cornerRadius: { min: 0, max: 50 },
  minBoxWidth: { min: 10, max: 500 },
  maxBoxWidth: { min: 10, max: 500 },
};

/**
 * Validate and adjust a numeric input value based on constraints
 */
export function validateNumericInput(
  name: string,
  value: number,
  currentValues: any
): number {
  // Standard constraints when values exist in the constraints object
  if (defaultConstraints[name as keyof InputConstraints]) {
    const { min, max } = defaultConstraints[name as keyof InputConstraints];
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
      // For multiple boxes, we need to consider the smallest box width for max corner radius
      let effectiveWidth = currentValues.width;
      if (currentValues.useMultipleBoxes && currentValues.minBoxWidth) {
        effectiveWidth = currentValues.minBoxWidth;
      }
      
      const maxCornerX = (effectiveWidth - 2 * currentValues.wallThickness) / 2;
      const maxCornerY = (currentValues.depth - 2 * currentValues.wallThickness) / 2;
      const maxCorner = Math.min(maxCornerX, maxCornerY, max);
      validatedValue = Math.min(validatedValue, maxCorner);
    }
    
    return validatedValue;
  }
  
  // If we don't have constraints for this field, just return the value
  return value;
}

/**
 * Calculate the maximum allowed corner radius based on current dimensions
 * Takes into account multiple boxes if enabled
 */
export function calculateMaxCornerRadius(
  width: number,
  depth: number,
  wallThickness: number,
  maxConstraint: number,
  useMultipleBoxes: boolean = false,
  minBoxWidth: number | null = null
): number {
  // For multiple boxes, use the smallest box width instead of the total width
  const effectiveWidth = useMultipleBoxes && minBoxWidth ? minBoxWidth : width;
  
  // Guard against negative or invalid values
  if (effectiveWidth <= 0 || depth <= 0 || wallThickness <= 0 || 
      effectiveWidth <= 2 * wallThickness || depth <= 2 * wallThickness) {
    return 0;
  }
  
  const maxCornerX = (effectiveWidth - 2 * wallThickness) / 2;
  const maxCornerY = (depth - 2 * wallThickness) / 2;
  return Math.max(0, Math.min(maxCornerX, maxCornerY, maxConstraint));
}