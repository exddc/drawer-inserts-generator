import * as THREE from 'three'

/**
 * Manages raycasting operations for the 3D scene
 */
export class RaycastManager {
    private raycaster: THREE.Raycaster
    private camera: THREE.PerspectiveCamera | null = null
    private boxGroup: THREE.Group | null = null

    constructor() {
        this.raycaster = new THREE.Raycaster()
    }

    /**
     * Initialize the raycast manager with scene objects
     */
    init(camera: THREE.PerspectiveCamera, boxGroup: THREE.Group) {
        this.camera = camera
        this.boxGroup = boxGroup
    }

    /**
     * Get the box index at a specific mouse position
     * @param x Normalized mouse X coordinate (-1 to 1)
     * @param y Normalized mouse Y coordinate (-1 to 1)
     * @returns The index of the intersected box or null if no intersection
     */
    getBoxIndexAtPosition(x: number, y: number): number | null {
        if (!this.camera || !this.boxGroup) {
            console.warn('RaycastManager not initialized')
            return null
        }

        // Set the raycaster from the camera and mouse position
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)

        // Calculate intersections with all objects in the box group
        const intersects = this.raycaster.intersectObjects(this.boxGroup.children, true)

        if (intersects.length > 0) {
            // Get the first intersected object
            const object = intersects[0].object

            // Traverse up the parent chain to find the direct child of the box group
            let boxObject = object
            while (boxObject.parent && boxObject.parent !== this.boxGroup) {
                boxObject = boxObject.parent
            }

            // Find box index in the group
            const boxIndex = this.boxGroup.children.indexOf(boxObject)

            if (boxIndex !== -1) {
                // Get the actual index from userData (which might be different from array index)
                const actualIndex = boxObject.userData?.dimensions?.index
                
                if (actualIndex !== undefined) {
                    return actualIndex
                }
                return boxIndex
            }
        }

        return null
    }
}

// Extend the Window interface to include our raycast manager
declare global {
    interface Window {
        raycastManager: RaycastManager;
        contextMenuOpen?: boolean;
    }
}

// Create a singleton instance
export const createRaycastManager = (): RaycastManager => {
    return new RaycastManager()
}