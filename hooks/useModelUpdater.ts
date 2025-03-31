import { useEffect, RefObject } from 'react'
import * as THREE from 'three'
import { useBoxStore } from '@/lib/store'
import { CombinedBoxInfo } from '@/lib/types'
import { generateBasicBox } from '@/lib/boxGenerator'
import { setupGrid } from '@/lib/utils'
import {generateGrid} from '@/lib/gridGenerator'

/**
 * Custom hook to update the model and grid when parameters change
 */
export function useModelUpdater(
    sceneRef: RefObject<THREE.Scene>,
    boxMeshGroupRef: RefObject<THREE.Group>,
    gridHelperRef: RefObject<THREE.GridHelper>,
    axesHelperRef: RefObject<THREE.AxesHelper>,
    cameraRef: RefObject<THREE.PerspectiveCamera>
): void {
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
        showGrid,
        showAxes,
        maxBoxDepth,
        maxBoxWidth,
    } = useBoxStore()

    // Update the model when parameters change
    useEffect(() => {
        // Update grid based on new dimensions
        const gridHelper = setupGrid(sceneRef.current, width, depth)
        // @ts-ignore - To be fixed
        gridHelperRef.current = gridHelper

        // Clear the box mesh group
        boxMeshGroupRef.current.clear()

        // Generate Grid
        const grid = generateGrid(width, depth, maxBoxWidth, maxBoxDepth)

        // Generate boxes based on grid
        grid.forEach((row, i) => {
            row.forEach((cell, j) => {
                const box = generateBasicBox({
                    width: cell.width,
                    depth: cell.depth,
                    height: height,
                    wallThickness: wallThickness,
                    cornerRadius: cornerRadius,
                    hasBottom: hasBottom,
                    color: getBoxHexColor(),
                    index: cell.index,
                    isSelected: false,
                    isHidden: false
                }, cell.startX - width / 2, cell.startZ + depth / 2)
                boxMeshGroupRef.current.add(box)
            })
        })

        // Update raycast manager when box mesh group changes
        if (window.raycastManager && cameraRef.current) {
            window.raycastManager.init(
                cameraRef.current,
                boxMeshGroupRef.current
            )
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
}