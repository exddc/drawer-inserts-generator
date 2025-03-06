// lib/modelGenerator.ts
import * as THREE from 'three';
import { createBoxWithRoundedEdges } from '@/lib/boxModelGenerator';
import { generateBoxGrid } from '@/lib/boxUtils';

interface BoxModelParams {
  boxWidths: number[];
  boxDepths: number[];
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

  const { boxWidths, boxDepths, height, wallThickness, cornerRadius, hasBottom } = params;

  // Clear existing boxes
  while (boxMeshGroup.children.length > 0) {
    boxMeshGroup.remove(boxMeshGroup.children[0]);
  }

  try {
    // Guard against invalid dimensions that might cause NaN errors
    if (
      height <= 0 ||
      wallThickness <= 0 ||
      cornerRadius < 0 ||
      boxWidths.length === 0 ||
      boxDepths.length === 0
    ) {
      console.warn('Invalid dimensions, skipping box creation');
      return;
    }

    // Generate the grid of box positions and dimensions
    const boxGrid = generateBoxGrid(boxWidths, boxDepths);
    
    // Create each box in the grid
    boxGrid.forEach((boxInfo, index) => {
      const { width, depth, x, z } = boxInfo;
      
      // Skip if box dimensions are invalid
      if (
        width <= 0 ||
        depth <= 0 ||
        wallThickness * 2 >= width ||
        wallThickness * 2 >= depth
      ) {
        console.warn(
          `Invalid dimensions for box ${index}, skipping`
        );
        return;
      }

      const box = createBoxWithRoundedEdges({
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
      });

      // Store box dimensions in userData for debug mode
      box.userData = {
        dimensions: {
          width,
          depth,
          height,
          index,
        },
      };

      // Position the box at its calculated position
      if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
        // Position the box with:
        // X: x position from grid plus half the width (to center it)
        // Y: 0 (flat on ground)
        // Z: z position from grid plus half the depth (to center it)
        box.position.set(x + width/2, 0, z + depth/2);
      }

      boxMeshGroup?.add(box);
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