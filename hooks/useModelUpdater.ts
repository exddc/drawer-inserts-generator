import { useEffect, RefObject } from 'react'
import * as THREE from 'three'
import { setupGrid, createBoxModelFromGrid } from '@/lib/gridGenerator'
import { useBoxStore } from '@/lib/store'
import { CombinedBoxInfo } from '@/lib/types'

/**
 * Custom hook to update the model and grid when parameters change
 * Updated to use the grid-based box generation approach
 */
export function useModelUpdater(
    sceneRef: RefObject<THREE.Scene>,
    boxMeshGroupRef: RefObject<THREE.Group>,
    gridHelperRef: RefObject<THREE.GridHelper>,
    axesHelperRef: RefObject<THREE.AxesHelper>,
    cameraRef: RefObject<THREE.PerspectiveCamera>
) {
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        boxWidths,
        boxDepths,
        selectedBoxIndex,
        selectedBoxIndices,
        hiddenBoxes,
        getBoxHexColor,
        getHighlightHexColor,
        combinedBoxes,
        showGrid,
        showAxes
    } = useBoxStore()

    // Update the model when parameters change
    useEffect(() => {
        if (sceneRef.current) {
            const gridHelper = setupGrid(sceneRef.current, width, depth)
            // @ts-ignore - To be fixed
            gridHelperRef.current = gridHelper
        }

        if (boxMeshGroupRef.current) {
            // Use the new grid-based approach
            createBoxModelFromGrid(boxMeshGroupRef.current, {
                boxWidths,
                boxDepths,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                selectedBoxIndices,
                hiddenBoxes,
                boxColor: getBoxHexColor(),
                highlightColor: getHighlightHexColor(),
                combinedBoxes: combinedBoxes as Map<number, CombinedBoxInfo>,
            })

            // Update raycast manager when box mesh group changes
            if (window.raycastManager && cameraRef.current) {
                window.raycastManager.init(
                    cameraRef.current,
                    boxMeshGroupRef.current
                )
            }
        }
    }, [
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        boxWidths,
        boxDepths,
        selectedBoxIndex,
        selectedBoxIndices,
        hiddenBoxes,
        getBoxHexColor,
        getHighlightHexColor,
        combinedBoxes,
    ])

    // Toggle grid visibility
    useEffect(() => {
        if (gridHelperRef.current) {
            gridHelperRef.current.visible = showGrid
        }
    }, [showGrid])

    // Toggle axes visibility
    useEffect(() => {
        if (axesHelperRef.current) {
            axesHelperRef.current.visible = showAxes
        }
    }, [showAxes])

    return null
}