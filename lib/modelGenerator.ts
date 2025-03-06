// lib/modelGenerator.ts
import * as THREE from 'three';
import { createBoxWithRoundedEdges } from '@/lib/boxModelGenerator';

interface BoxModelParams {
  boxWidths: number[];
  depth: number;
  height: number;
  wallThickness: number;
  cornerRadius: number;
  hasBottom: boolean;
}

/**
 * Create box models based on current parameters and add them to the scene
 */
export function createBoxModel(
  boxMeshGroup: THREE.Group | null,
  params: BoxModelParams
): void {
  if (!boxMeshGroup) return;

  const { boxWidths, depth, height, wallThickness, cornerRadius, hasBottom } = params;

  // Clear existing boxes
  while (boxMeshGroup.children.length > 0) {
    const child = boxMeshGroup.children[0];
    // Properly dispose of geometries and materials to prevent memory leaks
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    } else if (child instanceof THREE.Group) {
      // Also dispose all children of nested groups
      child.traverse(object => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    }
    boxMeshGroup.remove(child);
  }

  try {
    // Guard against invalid dimensions that might cause NaN errors
    if (
      depth <= 0 ||
      height <= 0 ||
      wallThickness <= 0 ||
      cornerRadius < 0
    ) {
      console.warn('Invalid dimensions, skipping box creation');
      return;
    }

    // Calculate total width of all boxes for positioning
    const totalWidth = boxWidths.reduce((sum, width) => sum + width, 0);

    // Start position (centered on the scene)
    let currentX = -totalWidth / 2;

    // Create boxes with calculated widths
    boxWidths.forEach((boxWidth, index) => {
      // Skip if box dimensions are invalid
      if (
        boxWidth <= 0 ||
        wallThickness * 2 >= boxWidth ||
        wallThickness * 2 >= depth
      ) {
        console.warn(
          `Invalid dimensions for box ${index}, skipping`
        );
        currentX += boxWidth;
        return;
      }

      const box = createBoxWithRoundedEdges({
        width: boxWidth,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
      });

      // Store box dimensions in userData for debug mode
      box.userData = {
        dimensions: {
          width: boxWidth,
          depth,
          height,
          index,
        },
      };

      // Position the box relative to others
      if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
        // Use the correct positioning as specified:
        // - currentX for the X position
        // - Y position at 0 (on the ground)
        // - Z position at depth/2 as required
        box.position.set(currentX, 0, depth / 2);
      }

      boxMeshGroup.add(box);

      // Update position for next box
      currentX += boxWidth;
    });
  } catch (error) {
    console.error('Error creating box models:', error);
  }
}

/**
 * Set up the grid helper based on total dimensions
 */
export function setupGrid(
  scene: THREE.Scene | null,
  width: number,
  depth: number
): THREE.GridHelper | null {
  if (!scene) return null;
  
  // Remove existing grid helper
  scene.children = scene.children.filter(child => {
    if (child instanceof THREE.GridHelper) {
      child.dispose();
      return false;
    }
    return true;
  });
  
  // Calculate grid size (50 units larger than the maximum of width or depth)
  const gridSize = Math.max(width, depth) + 50;
  
  // Create new grid helper
  const gridHelper = new THREE.GridHelper(gridSize, Math.ceil(gridSize / 10));
  scene.add(gridHelper);
  
  return gridHelper;
}