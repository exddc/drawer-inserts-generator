// src/hooks/useInteractions.ts
import { createRaycastManager } from '@/lib/RaycastManager'
import { GridCell, useGridStore } from '@/lib/store'
import { RefObject, useCallback, useEffect } from 'react'
import * as THREE from 'three'

/**
 * Helper function to get logical X (width segment) and Z (depth segment)
 * coordinates from a grid index, based on how generateGrid works.
 * @param index The flat index of the cell.
 * @param depthCells The number of cells along the depth (Z) axis (grid[0].length).
 * @returns Object with { x: number, z: number } or null if invalid.
 */
const getGridXZ = (
    index: number,
    depthCells: number
): { x: number; z: number } | null => {
    if (depthCells <= 0) return null
    // 'x' corresponds to the outer loop index (widthCells) in generateGrid
    const x = Math.floor(index / depthCells)
    // 'z' corresponds to the inner loop index (depthCells) in generateGrid
    const z = index % depthCells
    return { x, z }
}

/**
 * Custom hook to handle all user interactions with the 3D scene:
 * - Mouse and keyboard events
 * - Box selection and manipulation
 * - Raycast operations
 */
export function useInteractions(
    containerRef: RefObject<HTMLDivElement>,
    cameraRef: RefObject<THREE.PerspectiveCamera>,
    boxMeshGroupRef: RefObject<THREE.Group>,
    mouseRef: RefObject<THREE.Vector2>
) {
    // const { getHighlightHexColor } = useBoxStore(); // Keep if needed elsewhere
    const { setSelectedIndices, selectedIndices, grid, setGrid } =
        useGridStore()

    // --- Combination Logic (Corrected Adjacency) ---
    const combineAdjacentBoxes = useCallback(() => {
        console.log('Attempting to combine boxes for indices:', selectedIndices)
        if (selectedIndices.length < 2) {
            console.log('Need at least two boxes selected to combine.')
            return
        }

        const currentGrid = useGridStore.getState().grid
        // Ensure grid and grid[0] exist before accessing length
        if (
            !currentGrid ||
            currentGrid.length === 0 ||
            !currentGrid[0] ||
            currentGrid[0].length === 0
        ) {
            console.error('Grid is not initialized or empty.')
            return
        }

        // Number of cells along the Z axis (inner loop of generateGrid)
        const depthCells = currentGrid[0].length
        // Number of cells along the X axis (outer loop of generateGrid)
        const widthCells = currentGrid.length // Added for accessing grid cells by x, z

        const newGrid: GridCell[][] = JSON.parse(JSON.stringify(currentGrid))
        let changesMade = false

        for (let i = 0; i < selectedIndices.length; i++) {
            for (let j = i + 1; j < selectedIndices.length; j++) {
                const index1 = selectedIndices[i]
                const index2 = selectedIndices[j]

                // Use the corrected coordinate function
                const pos1 = getGridXZ(index1, depthCells)
                const pos2 = getGridXZ(index2, depthCells)

                if (!pos1 || !pos2) {
                    console.error(
                        'Could not find grid XZ positions for indices:',
                        index1,
                        index2
                    )
                    continue
                }

                // --- Check for Vertical Adjacency (along Z axis) ---
                // Same X segment (pos.x), adjacent Z segments (pos.z)
                if (pos1.x === pos2.x && Math.abs(pos1.z - pos2.z) === 1) {
                    // Determine which cell is front (smaller z) and back (larger z)
                    const frontCellIndex = pos1.z < pos2.z ? index1 : index2
                    const backCellIndex = pos1.z < pos2.z ? index2 : index1
                    const frontPos = pos1.z < pos2.z ? pos1 : pos2
                    const backPos = pos1.z < pos2.z ? pos2 : pos1

                    // Get the actual cell objects from the newGrid using calculated x, z
                    const frontCell = newGrid[frontPos.x][frontPos.z]
                    const backCell = newGrid[backPos.x][backPos.z]

                    console.log(
                        `Found vertical adjacency between index ${frontCell.index} (z=${frontPos.z}) and ${backCell.index} (z=${backPos.z})`
                    )

                    // Add 'back' exclusion to the front cell
                    if (!frontCell.excludeWalls.includes('back')) {
                        frontCell.excludeWalls.push('back')
                        changesMade = true
                        console.log(
                            `  - Added 'back' exclusion to index ${frontCell.index}`
                        )
                    }
                    // Add 'front' exclusion to the back cell
                    if (!backCell.excludeWalls.includes('front')) {
                        backCell.excludeWalls.push('front')
                        changesMade = true
                        console.log(
                            `  - Added 'front' exclusion to index ${backCell.index}`
                        )
                    }
                }
                // --- Check for Horizontal Adjacency (along X axis) ---
                // Same Z segment (pos.z), adjacent X segments (pos.x)
                else if (pos1.z === pos2.z && Math.abs(pos1.x - pos2.x) === 1) {
                    // Determine which cell is left (smaller x) and right (larger x)
                    const leftCellIndex = pos1.x < pos2.x ? index1 : index2
                    const rightCellIndex = pos1.x < pos2.x ? index2 : index1
                    const leftPos = pos1.x < pos2.x ? pos1 : pos2
                    const rightPos = pos1.x < pos2.x ? pos2 : pos1

                    // Get the actual cell objects from the newGrid using calculated x, z
                    const leftCell = newGrid[leftPos.x][leftPos.z]
                    const rightCell = newGrid[rightPos.x][rightPos.z]

                    console.log(
                        `Found horizontal adjacency between index ${leftCell.index} (x=${leftPos.x}) and ${rightCell.index} (x=${rightPos.x})`
                    )

                    // Add 'right' exclusion to the left cell
                    if (!leftCell.excludeWalls.includes('right')) {
                        leftCell.excludeWalls.push('right')
                        changesMade = true
                        console.log(
                            `  - Added 'right' exclusion to index ${leftCell.index}`
                        )
                    }
                    // Add 'left' exclusion to the right cell
                    if (!rightCell.excludeWalls.includes('left')) {
                        rightCell.excludeWalls.push('left')
                        changesMade = true
                        console.log(
                            `  - Added 'left' exclusion to index ${rightCell.index}`
                        )
                    }
                }
            }
        }

        if (changesMade) {
            console.log('Updating grid state with combined walls.')
            setGrid(newGrid)
            // setSelectedIndices([]); // Optional: Clear selection
        } else {
            console.log('No adjacent selected boxes found to combine.')
        }
    }, [selectedIndices, grid, setGrid]) // Added grid dependency as we read its structure

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleMouseMove = (event: MouseEvent) => {
            // ... mouse move logic remains the same ...
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

        // --- Reverted handleClick (Keep as is) ---
        const handleClick = (event: MouseEvent) => {
            // Skip processing if context menu is open
            if (window.contextMenuOpen) return

            if (!containerRef.current || !boxMeshGroupRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const mouseX =
                ((event.clientX - rect.left) /
                    containerRef.current.clientWidth) *
                    2 -
                1
            const mouseY =
                -(
                    (event.clientY - rect.top) /
                    containerRef.current.clientHeight
                ) *
                    2 +
                1

            const isMultiSelect = event.metaKey || event.ctrlKey
            // console.log('isMultiSelect', isMultiSelect) // Keep original log if needed

            if (window.raycastManager) {
                try {
                    const boxIndex =
                        window.raycastManager.getBoxIndexAtPosition(
                            mouseX,
                            mouseY
                        )

                    if (boxIndex !== null && typeof boxIndex === 'number') {
                        const boxMeshGroup = boxMeshGroupRef.current
                        if (boxMeshGroup && boxMeshGroup.children[boxIndex]) {
                            const boxObject = boxMeshGroup.children[boxIndex]
                            if (
                                boxObject.userData &&
                                boxObject.userData.dimensions &&
                                typeof boxObject.userData.dimensions.index ===
                                    'number'
                            ) {
                                const index =
                                    boxObject.userData.dimensions.index

                                const currentSelectedIndices =
                                    useGridStore.getState().selectedIndices
                                let newSelectedIndices: number[]

                                if (isMultiSelect) {
                                    newSelectedIndices =
                                        currentSelectedIndices.includes(index)
                                            ? currentSelectedIndices.filter(
                                                  (i) => i !== index
                                              )
                                            : [...currentSelectedIndices, index]
                                    // console.log('newSelectedIndices (multi)', newSelectedIndices)
                                } else {
                                    newSelectedIndices = [index]
                                    // console.log('single selection', index)
                                }
                                setSelectedIndices(newSelectedIndices)
                            } else {
                                console.warn(
                                    `Box at mesh index ${boxIndex} has missing or invalid userData/dimensions/index.`
                                )
                            }
                        } else {
                            console.warn(
                                `Box mesh group or child at index ${boxIndex} not found.`
                            )
                        }
                    }
                } catch (e) {
                    console.error('Error during raycasting or selection:', e)
                }
            } else {
                console.error(
                    'Raycast Manager not initialized or available for click handling!'
                )
            }
        }
        // --- End of reverted handleClick ---

        // Handle keyboard shortcuts (Keep Escape and 'c' logic)
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                console.log('Escape pressed, clearing selection.')
                setSelectedIndices([])
            }
            if (
                event.key === 'c' &&
                !event.shiftKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
            ) {
                combineAdjacentBoxes()
            }
        }

        container.addEventListener('mousemove', handleMouseMove)
        container.addEventListener('click', handleClick)
        window.addEventListener('keydown', handleKeyDown)

        // --- Raycast Manager Setup (Keep as is) ---
        const camera = cameraRef.current
        const boxMeshGroup = boxMeshGroupRef.current

        if (camera && boxMeshGroup) {
            let needsInit = false
            if (!window.raycastManager) {
                window.raycastManager = createRaycastManager()
                console.log('Raycast Manager created.')
                needsInit = true
            } else {
                try {
                    if (
                        window.raycastManager.getCamera() !== camera ||
                        window.raycastManager.getTargetGroup() !== boxMeshGroup
                    ) {
                        console.log(
                            'Raycast Manager config changed (camera or target group).'
                        )
                        needsInit = true
                    }
                } catch (e) {
                    console.warn(
                        "Could not check raycast manager's current config, assuming re-init needed.",
                        e
                    )
                    needsInit = true
                }
            }

            if (needsInit) {
                try {
                    window.raycastManager.init(camera, boxMeshGroup)
                    console.log('Raycast Manager initialized/re-initialized.')
                } catch (e) {
                    console.error('Error initializing Raycast Manager:', e)
                }
            }
        }

        return () => {
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove)
                container.removeEventListener('click', handleClick)
            }
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [
        containerRef,
        cameraRef,
        boxMeshGroupRef,
        mouseRef,
        setSelectedIndices,
        combineAdjacentBoxes, // combineAdjacentBoxes now depends on grid
        grid, // Add grid as dependency because combineAdjacentBoxes reads its structure
        setGrid, // Add setGrid as dependency because combineAdjacentBoxes calls it
    ])

    return null
}
