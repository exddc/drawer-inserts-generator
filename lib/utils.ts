import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import * as THREE from 'three'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Set up the grid helper based on total dimensions
 * Creates a new grid helper and adds it to the scene
 */
export function setupGrid(
    scene: THREE.Scene,
    width: number,
    depth: number
): THREE.GridHelper {
    // Remove any existing grid helpers
    scene.children.forEach((child) => {
        if (child instanceof THREE.GridHelper) {
            scene.remove(child)
        }
    })

    // Calculate grid size based on dimensions
    const gridSize = Math.max(width, depth) + 50

    // Create new grid helper with appropriate divisions
    const gridHelper = new THREE.GridHelper(gridSize, Math.ceil(gridSize / 10))

    // Add to scene
    scene.add(gridHelper)

    return gridHelper
}
