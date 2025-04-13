// src/hooks/useParameterChange.ts
import { generateBasicBox } from '@/lib/boxGenerator'
import { useBoxStore, useGridStore } from '@/lib/store'
import { setupGrid } from '@/lib/utils'
import { RefObject, useEffect } from 'react'
import * as THREE from 'three'
import { generateGrid } from '@/lib/gridGenerator'

/**
 * Custom hook to update the model and grid when parameters change
 */
export function useParameterChange(
    sceneRef: RefObject<THREE.Scene>,
    boxMeshGroupRef: RefObject<THREE.Group>,
    gridHelperRef: RefObject<THREE.GridHelper>,
    cameraRef: RefObject<THREE.PerspectiveCamera>
): void {
    // Box dimensions from useBoxStore
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        getBoxHexColor,
        maxBoxDepth,
        maxBoxWidth,
    } = useBoxStore()

    // Grid state and setter from useGridStore
    const { grid, setGrid } = useGridStore()

    // Effect for handling dimension changes (regenerates grid)
    useEffect(() => {
        console.log('Dimension change detected, regenerating grid.')
        const scene = sceneRef.current;
        if (!scene) return; // Ensure scene exists

        // Update grid helper based on new dimensions
        const newGridHelper = setupGrid(scene, width, depth)
        if (gridHelperRef.current) {
             scene.remove(gridHelperRef.current); // Remove old grid helper
        }
        // @ts-ignore - To be fixed (Assigning to ref.current directly)
        gridHelperRef.current = newGridHelper // Assign new helper

        // Generate new Grid based on dimensions
        const newGrid = generateGrid(width, depth, maxBoxWidth, maxBoxDepth)
        setGrid(newGrid) // Update the grid state in the store

    }, [
        width, depth, maxBoxWidth, maxBoxDepth, // Dependencies that trigger grid regeneration
        sceneRef, gridHelperRef, setGrid // Other necessary dependencies
    ]);


    // Effect for handling grid state changes (regenerates boxes)
    useEffect(() => {
        console.log('Grid state change detected, regenerating boxes.')

        const boxMeshGroup = boxMeshGroupRef.current;
        const camera = cameraRef.current;

        if (!boxMeshGroup || !camera || !grid) {
             console.log('Skipping box regeneration (refs or grid not ready).')
             return; // Exit if refs or grid are not ready
        }

        // Clear the existing box mesh group
        while (boxMeshGroup.children.length > 0) {
            // Properly dispose of geometry and materials if needed to prevent memory leaks
            const child = boxMeshGroup.children[0];
            if (child instanceof THREE.Group) {
                child.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }
            boxMeshGroup.remove(child);
        }
        console.log('Cleared existing boxes.');


        // Generate boxes based on the CURRENT grid state
        grid.forEach((row) => {
            row.forEach((cell) => {
                const box = generateBasicBox(
                    {
                        width: cell.width,
                        depth: cell.depth,
                        height: height,
                        wallThickness: wallThickness,
                        cornerRadius: cornerRadius,
                        hasBottom: hasBottom,
                        color: getBoxHexColor(),
                        index: cell.index,
                        isHidden: false,
                        excludeWalls: cell.excludeWalls,
                    },
                    // Calculate center position based on cell start and dimensions
                    cell.startX - width / 2,
                    cell.startZ + depth / 2,
                )
                boxMeshGroup.add(box)
            })
        })
        console.log('Generated new boxes based on grid state.');


        // --- Update Raycast Manager ---
        // Check if manager exists and if its config needs update
        if (window.raycastManager) {
            let needsInit = false;
             try {
                // Check if the camera or target group stored in the manager differs
                if (window.raycastManager.getCamera() !== camera || window.raycastManager.getTargetGroup() !== boxMeshGroup) {
                    console.log('Raycast Manager config changed (camera or target group) after box regeneration.');
                    needsInit = true;
                }
            } catch (e) {
                // If getCamera/getTargetGroup don't exist or throw error, assume re-init is needed
                console.warn("Could not check raycast manager's current config after box regeneration, assuming re-init needed.", e);
                needsInit = true;
            }

            // Re-initialize if needed
            if (needsInit) {
                 try {
                    window.raycastManager.init(camera, boxMeshGroup);
                    console.log('Raycast Manager re-initialized after box regeneration.');
                } catch (e) {
                     console.error("Error re-initializing Raycast Manager after box regeneration:", e);
                }
            }
        } else {
            // This case should ideally not happen if useInteractions runs first,
            // but log it just in case.
            console.warn("Raycast Manager not found during box regeneration.");
        }

    }, [
        grid, // Main dependency: regenerate boxes when grid state changes
        boxMeshGroupRef, cameraRef, // Refs
        height, wallThickness, cornerRadius, hasBottom, getBoxHexColor, // Box properties needed for generation
        width, depth // Needed for positioning calculations
    ]);
}
