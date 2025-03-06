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
    boxMeshGroup.remove(boxMeshGroup.children[0]);
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

      // Position the box relative to others - ensure no overlap
      // Important: each box is already modeled with its center at (0,0,0)
      if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
        // Position the box with:
        // X: starting point (currentX) plus half the width
        // Y: 0 (flat on ground)
        // Z: depth/2 as requested
        box.position.set(currentX, 0, depth / 2);
      }

      boxMeshGroup?.add(box);

      // Update position for next box - move by the full width
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
  scene.children.forEach(child => {
    if (child instanceof THREE.GridHelper) {
      scene.remove(child);
    }
  });
  
  // Calculate grid size (50 units larger than the maximum of width or depth)
  const gridSize = Math.max(width, depth) + 50;
  
  // Create new grid helper
  const gridHelper = new THREE.GridHelper(gridSize, Math.ceil(gridSize / 10));
  scene.add(gridHelper);
  
  return gridHelper;
}