import { useEffect, RefObject } from 'react'
import * as THREE from 'three'
import { useBoxStore } from '@/lib/store'
import { CombinedBoxInfo } from '@/lib/types'
import { generateBasicBox } from '@/lib/boxGenerator'
import { setupGrid } from '@/lib/utils'
import { generateGrid, getCellInfo } from '@/lib/gridGenerator'

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

        // Testing
        // Generate the horizontal box 
        const Box = generateBasicBox({
            width: width,
            depth: depth,
            height: height,
            wallThickness: wallThickness,
            cornerRadius: cornerRadius,
            hasBottom: hasBottom,
            color: getBoxHexColor(),
            isHidden: false,
            excludeWalls: ['front']
        }, -width / 2, depth / 2)

        boxMeshGroupRef.current.add(Box);

        /* // Generate Grid
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
                    isHidden: false
                }, cell.startX - width / 2, cell.startZ + depth / 2)
                boxMeshGroupRef.current.add(box)
            })
        }) */

        // TODO - Move to separate hook and only trigger when selectedBoxIndex changes
        // TODO - remove selectedBoxIndex
        // Update selected box
        if (selectedBoxIndices.size > 0) {
            // TODO - Move to separate hook and only trigger when selectedBoxIndex changes
            // Update selected boxes
            selectedBoxIndices.forEach((index) => {
                const box = getCellInfo(grid, index)

                if (box){
                    // Generate new box with updated color
                    const newBox = generateBasicBox({
                        width: box.width,
                        depth: box.depth,
                        height: height,
                        wallThickness: wallThickness,
                        cornerRadius: cornerRadius,
                        hasBottom: hasBottom,
                        color: getHighlightHexColor(),
                        index: box.index,
                        isHidden: false
                    }, box.startX - width / 2, box.startZ + depth / 2)

                    // Add new box to group
                    boxMeshGroupRef.current.add(newBox)
                }
            })
        }

        // Hide boxes
        // TODO - Move to separate hook and only trigger when hiddenBoxes changes
        // TODO - Get working
        if (hiddenBoxes.size > 0) {
            hiddenBoxes.forEach((index) => {
                const box = getCellInfo(grid, index)

                if (box){
                    // Generate new box with updated color
                    const newBox = generateBasicBox({
                        width: box.width,
                        depth: box.depth,
                        height: height,
                        wallThickness: wallThickness,
                        cornerRadius: cornerRadius,
                        hasBottom: hasBottom,
                        color: getBoxHexColor(),
                        index: box.index,
                        isHidden: true
                    }, box.startX - width / 2, box.startZ + depth / 2)

                    // Add new box to group
                    boxMeshGroupRef.current.add(newBox)
                }
            })
        }

        

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