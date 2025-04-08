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
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        boxWidths,
        boxDepths,
        getBoxHexColor,
        maxBoxDepth,
        maxBoxWidth,
    } = useBoxStore()

    const {
        setGrid
    } = useGridStore()

    // Update the model when parameters change
    useEffect(() => {
        // Update grid based on new dimensions
        const gridHelper = setupGrid(sceneRef.current, width, depth)
        // @ts-ignore - To be fixed
        gridHelperRef.current = gridHelper

        // Clear the box mesh group
        boxMeshGroupRef.current.clear()

        // Generate new Grid
        const newGrid = generateGrid(width, depth, maxBoxWidth, maxBoxDepth)
        setGrid(newGrid)

        // Generate boxes based on grid
        newGrid.forEach((row, i) => {
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
                    isHidden: false,
                    excludeWalls: cell.excludeWalls,
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
    ])
}
