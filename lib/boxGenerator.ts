import * as THREE from 'three';
import { createBoxWalls } from './boxGeneratorUtils';

/**
 * Core box definition with only the essential dimensions
 */
export interface BoxDimensions {
    width: number;
    depth: number;
    height: number;
    wallThickness: number;
    cornerRadius: number;
    hasBottom: boolean;
    color?: number;
    index?: number;
    isHidden?: boolean;
    excludeWalls?: string[]; // Walls to exclude
}

/**
 * Create a box with individual walls and optional bottom
 */
export function generateBasicBox(
    dimensions: BoxDimensions,
    positionX: number,
    positionZ: number
): THREE.Group {
    const {
        width,
        depth,
        height,
        wallThickness,
        index,
        isHidden = false,
        excludeWalls = [], // Default to empty array if not provided
    } = dimensions;

    // Create a group to hold all the meshes
    const meshGroup = new THREE.Group();
    meshGroup.visible = !isHidden;
    
    // Set userData for dimensions
    meshGroup.userData = {
        dimensions: {
            width,
            depth,
            height,
            index,
            isHidden,
        },
    };
    
    // Create walls using the simplified approach
    const walls = createBoxWalls(dimensions, excludeWalls);
    meshGroup.add(walls);
    
    
    // Position the mesh group
    meshGroup.position.x = positionX;
    meshGroup.position.z = positionZ;
    
    return meshGroup;
}