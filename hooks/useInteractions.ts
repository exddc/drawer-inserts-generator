import { createRaycastManager } from '@/lib/RaycastManager'
import { useBoxStore, useGridStore } from '@/lib/store'
import { RefObject, useEffect } from 'react'
import * as THREE from 'three'
import { generateBasicBox } from '@/lib/boxGenerator'
import { getCellInfo } from '@/lib/gridGenerator'

/**
 * Custom hook to handle all user interactions with the 3D scene:
 * - Mouse and keyboard events
 * - Box selection and manipulation
 * - Raycast operations
 */
export function useInteractions(
    containerRef: RefObject<HTMLDivElement>,
    raycasterRef: RefObject<THREE.Raycaster>,
    cameraRef: RefObject<THREE.PerspectiveCamera>,
    boxMeshGroupRef: RefObject<THREE.Group>,
    mouseRef: RefObject<THREE.Vector2>
) {
    const { getHighlightHexColor } = useBoxStore()
    const { grid } = useGridStore()


    useEffect(() => {
        if (!containerRef.current) return

        const handleMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            mouseRef.current.x =
                ((event.clientX - rect.left) /
                    containerRef.current.clientWidth) *
                    2 -
                1
            mouseRef.current.y =
                -(
                    (event.clientY - rect.top) /
                    containerRef.current.clientHeight
                ) *
                    2 +
                1
        }

        const handleClick = (event: MouseEvent) => {
            // Skip processing if context menu is open
            if (window.contextMenuOpen) return
        
            if (!containerRef.current) return
        
            const rect = containerRef.current.getBoundingClientRect()
            const mouseX =
                ((event.clientX - rect.left) / containerRef.current.clientWidth) * 2 - 1
            const mouseY =
                -((event.clientY - rect.top) / containerRef.current.clientHeight) * 2 + 1
        
            // metaKey is Cmd on Mac, Ctrl on Windows
            const isMultiSelect = event.metaKey || event.ctrlKey
        
            if (window.raycastManager) {
                const boxIndex = window.raycastManager.getBoxIndexAtPosition(mouseX, mouseY)
        
                if (boxIndex !== null) {
                    const boxMeshGroup = boxMeshGroupRef.current;
                    if (boxMeshGroup) {
                        // Get the mesh from the group
                        const boxToRemove = boxMeshGroup.children[boxIndex]
                        const mesh = boxToRemove.children[0];
        
                        if (mesh) {
                            const index = (boxToRemove.userData as any).dimensions.index;

                            // Get the cell info
                            const cell = getCellInfo(grid, index);
                            if (cell) {
                                // Remove the box
                                boxMeshGroup.remove(boxToRemove);
        
                                // Rebuild the box with the selection color
                                const newBox = generateBasicBox({
                                    width: cell.width,
                                    depth: cell.depth,
                                    height: boxToRemove.userData.dimensions.height,
                                    wallThickness: boxToRemove.userData.dimensions.wallThickness,
                                    cornerRadius: boxToRemove.userData.dimensions.cornerRadius,
                                    hasBottom: boxToRemove.userData.dimensions.hasBottom,
                                    color: getHighlightHexColor(),
                                    index: cell.index,
                                    isHidden: false,
                                    excludeWalls: cell.excludeWalls,
                                }, boxToRemove.position.x, boxToRemove.position.z);

                                boxMeshGroupRef.current.add(newBox);
                            }
                        }
                    }
                }
            }
        }
        

        // Handle keyboard shortcuts for selection
        const handleKeyDown = (event: KeyboardEvent) => {
            // Escape key to clear selection
            if (event.key === 'Escape') {
                //clearSelectedBoxes()
            }

            // 'h' key to toggle visibility of selected boxes
           /*  if (event.key === 'h' || event.key === 'H') {
                if (selectedBoxIndices.size > 0) {
                    toggleSelectedBoxesVisibility()
                }
            } */

            // 'c' key to combine selected boxes
            /* if (event.key === 'c' && !event.shiftKey) {
                combineSelectedBoxes()
            } */

            // 's' key to split a combined box
            /* if (event.key === 's' || event.key === 'S') {
                if (selectedBoxIndices.size === 1) {
                    const index = Array.from(selectedBoxIndices)[0]
                    if (isPrimaryBox(index)) {
                        resetCombinedBoxes()
                    }
                }
            } */
        }

        containerRef.current.addEventListener('mousemove', handleMouseMove)
        containerRef.current.addEventListener('click', handleClick)
        window.addEventListener('keydown', handleKeyDown)

        // Initialize the raycast manager for right-click context menu
        if (cameraRef.current && boxMeshGroupRef.current) {
            if (!window.raycastManager) {
                window.raycastManager = createRaycastManager()
            }
            window.raycastManager.init(
                cameraRef.current,
                boxMeshGroupRef.current
            )
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener(
                    'mousemove',
                    handleMouseMove
                )
                containerRef.current.removeEventListener('click', handleClick)
            }
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [
        containerRef,
    cameraRef,
    boxMeshGroupRef,
    mouseRef,
    grid,
    getHighlightHexColor,
    ])

    return null
}
