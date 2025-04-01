import { createRaycastManager } from '@/lib/RaycastManager'
import { useBoxStore } from '@/lib/store'
import { RefObject, useEffect } from 'react'
import * as THREE from 'three'

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
    const {
        toggleBoxSelection,
        clearSelectedBoxes,
        toggleSelectedBoxesVisibility,
        selectedBoxIndices,
        canCombineSelectedBoxes,
        combineSelectedBoxes,
        isPrimaryBox,
        resetCombinedBoxes,
    } = useBoxStore()

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

            if (
                !containerRef.current ||
                !raycasterRef.current ||
                !cameraRef.current ||
                !boxMeshGroupRef.current
            )
                return

            raycasterRef.current.setFromCamera(
                mouseRef.current,
                cameraRef.current
            )

            const intersects = raycasterRef.current.intersectObjects(
                boxMeshGroupRef.current.children || [],
                true
            )

            // metaKey is Cmd on Mac, Ctrl on Windows
            const isMultiSelect = event.metaKey || event.ctrlKey

            if (intersects.length > 0) {
                const object = intersects[0].object

                let boxObject = object
                while (
                    boxObject.parent &&
                    boxObject.parent !== boxMeshGroupRef.current
                ) {
                    boxObject = boxObject.parent
                }

                // Find box index in the group
                const boxIndex =
                    boxMeshGroupRef.current.children.indexOf(boxObject)

                if (boxIndex !== -1) {
                    // Get the actual index from userData
                    const actualIndex = boxObject.userData?.dimensions?.index

                    if (actualIndex !== undefined) {
                        // Handle selection with multi-select capability
                        toggleBoxSelection(actualIndex, isMultiSelect)
                    }
                }
            }
            // We don't clear selection when clicking on empty space anymore
        }

        // Handle keyboard shortcuts for selection
        const handleKeyDown = (event: KeyboardEvent) => {
            // Escape key to clear selection
            if (event.key === 'Escape') {
                clearSelectedBoxes()
            }

            // 'h' key to toggle visibility of selected boxes
            if (event.key === 'h' || event.key === 'H') {
                if (selectedBoxIndices.size > 0) {
                    toggleSelectedBoxesVisibility()
                }
            }

            // 'c' key to combine selected boxes
            if (event.key === 'c' && !event.shiftKey) {
                if (canCombineSelectedBoxes()) {
                    combineSelectedBoxes()
                }
            }

            // 's' key to split a combined box
            if (event.key === 's' || event.key === 'S') {
                if (selectedBoxIndices.size === 1) {
                    const index = Array.from(selectedBoxIndices)[0]
                    if (isPrimaryBox(index)) {
                        resetCombinedBoxes()
                    }
                }
            }
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
        toggleBoxSelection,
        clearSelectedBoxes,
        toggleSelectedBoxesVisibility,
        selectedBoxIndices,
        canCombineSelectedBoxes,
        combineSelectedBoxes,
        isPrimaryBox,
        resetCombinedBoxes,
    ])

    return null
}
