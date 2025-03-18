import * as THREE from 'three'
import { createBoxWithRoundedEdges } from '@/lib/boxModelGenerator'
import { generateBoxGrid } from '@/lib/boxUtils'

interface BoxModelParams {
    boxWidths: number[]
    boxDepths: number[]
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    selectedBoxIndex?: number | null
    selectedBoxIndices?: Set<number>
    hiddenBoxes?: Set<number>
    boxColor?: number
    highlightColor?: number
    combinedBoxes?: Map<number, number[]> // Added parameter for tracking combined boxes
}

/**
 * Create box models based on current parameters and add them to the scene
 */
export function createBoxModel(
    boxMeshGroup: THREE.Group | null,
    params: BoxModelParams
): void {
    if (!boxMeshGroup) return

    const {
        boxWidths,
        boxDepths,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        selectedBoxIndex,
        selectedBoxIndices = new Set<number>(),
        hiddenBoxes = new Set<number>(),
        boxColor,
        highlightColor,
        combinedBoxes = new Map<number, number[]>()
    } = params

    while (boxMeshGroup.children.length > 0) {
        boxMeshGroup.remove(boxMeshGroup.children[0])
    }

    try {
        if (
            height <= 0 ||
            wallThickness <= 0 ||
            cornerRadius < 0 ||
            boxWidths.length === 0 ||
            boxDepths.length === 0
        ) {
            console.warn('Invalid dimensions, skipping box creation')
            return
        }

        const boxGrid = generateBoxGrid(boxWidths, boxDepths)
        const numCols = boxWidths.length
        
        // Track which boxes are part of a combined box (either as primary or secondary)
        const processedBoxes = new Set<number>()
        
        // First pass - create combined boxes
        for (const [primaryIndex, secondaryIndices] of combinedBoxes.entries()) {
            // Add all indices to processed set
            processedBoxes.add(primaryIndex)
            secondaryIndices.forEach(idx => processedBoxes.add(idx))
            
            // Get row and column for primary box
            const primaryRow = Math.floor(primaryIndex / numCols)
            const primaryCol = primaryIndex % numCols
            
            // Get info for primary box
            const primaryBox = boxGrid[primaryIndex]
            
            // For correct positioning, we need to use the leftmost box's x position
            // Convert all indices to row/col positions
            const allBoxPositions = [primaryIndex, ...secondaryIndices].map(idx => ({
                index: idx,
                row: Math.floor(idx / numCols),
                col: idx % numCols,
                box: boxGrid[idx]
            }));
            
            // Sort by column to find leftmost box
            allBoxPositions.sort((a, b) => a.col - b.col);
            
            // Get the leftmost box
            const leftmostBox = allBoxPositions[0].box;
            
            // Calculate total width by summing all box widths
            let totalWidth = 0;
            for (const position of allBoxPositions) {
                totalWidth += position.box.width;
            }
            
            // Check if dimensions are valid
            if (
                totalWidth <= 0 ||
                primaryBox.depth <= 0 ||
                wallThickness * 2 >= totalWidth ||
                wallThickness * 2 >= primaryBox.depth
            ) {
                console.warn(`Invalid dimensions for combined box ${primaryIndex}, skipping`)
                continue
            }
            
            // Skip if hidden
            if (hiddenBoxes.has(primaryIndex)) {
                // Create a placeholder to keep indices consistent
                const placeholder = new THREE.Group()
                placeholder.visible = false
                placeholder.userData = {
                    dimensions: {
                        width: totalWidth,
                        depth: primaryBox.depth,
                        height,
                        index: primaryIndex,
                        isHidden: true,
                        isSelected: false,
                        isCombined: true,
                        combinedIndices: [primaryIndex, ...secondaryIndices]
                    }
                }
                // Position using the leftmost box's x coordinate 
                placeholder.position.set(leftmostBox.x + totalWidth / 2, 0, primaryBox.z + primaryBox.depth / 2)
                boxMeshGroup.add(placeholder)
                continue
            }
            
            // Create the combined box
            const isSelected = selectedBoxIndices.has(primaryIndex)
            
            const box = createBoxWithRoundedEdges({
                width: totalWidth,
                depth: primaryBox.depth,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                isSelected,
                boxColor,
                highlightColor
            })
            
            box.userData = {
                dimensions: {
                    width: totalWidth,
                    depth: primaryBox.depth,
                    height,
                    index: primaryIndex,
                    isHidden: false,
                    isSelected,
                    isCombined: true,
                    combinedIndices: [primaryIndex, ...secondaryIndices]
                }
            }
            
            // Position using the leftmost box's x coordinate
            if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
                box.position.set(leftmostBox.x  + leftmostBox.width / 2, 0, primaryBox.z + primaryBox.depth / 2)
            }
            
            boxMeshGroup.add(box)
        }

        // Second pass - create regular boxes (unchanged from before)
        for (let index = 0; index < boxGrid.length; index++) {
            // Skip already processed boxes (combined ones)
            if (processedBoxes.has(index)) {
                // Add a placeholder object to maintain correct index order
                const placeholder = new THREE.Group()
                placeholder.visible = false
                placeholder.userData = {
                    dimensions: {
                        index,
                        isHidden: true,
                        isPlaceholder: true
                    }
                }
                boxMeshGroup.add(placeholder)
                continue
            }
            
            const { width, depth, x, z } = boxGrid[index]

            if (
                width <= 0 ||
                depth <= 0 ||
                wallThickness * 2 >= width ||
                wallThickness * 2 >= depth
            ) {
                console.warn(`Invalid dimensions for box ${index}, skipping`)
                continue
            }

            // Skip hidden boxes
            if (hiddenBoxes.has(index)) {
                // Create a placeholder to keep indices consistent
                const placeholder = new THREE.Group()
                placeholder.visible = false
                placeholder.userData = {
                    dimensions: {
                        width,
                        depth,
                        height,
                        index,
                        isHidden: true,
                        isSelected: false,
                        isCombined: false
                    }
                }
                placeholder.position.set(x + width / 2, 0, z + depth / 2)
                boxMeshGroup.add(placeholder)
                continue
            }

            const isSelected = selectedBoxIndices.has(index)

            const box = createBoxWithRoundedEdges({
                width,
                depth,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                isSelected,
                boxColor,
                highlightColor
            })

            box.userData = {
                dimensions: {
                    width,
                    depth,
                    height,
                    index,
                    isHidden: false,
                    isSelected,
                    isCombined: false
                }
            }

            if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
                box.position.set(x + width / 2, 0, z + depth / 2)
            }

            boxMeshGroup.add(box)
        }
    } catch (error) {
        console.error('Error creating box models:', error)
    }
}

/**
 * Set up the grid helper based on total dimensions
 */
export function setupGrid(
    scene: THREE.Scene | null,
    width: number,
    depth: number
): THREE.GridHelper | null {
    if (!scene) return null

    scene.children.forEach((child) => {
        if (child instanceof THREE.GridHelper) {
            scene.remove(child)
        }
    })

    const gridSize = Math.max(width, depth) + 50
    const gridHelper = new THREE.GridHelper(gridSize, Math.ceil(gridSize / 10))
    scene.add(gridHelper)

    return gridHelper
}