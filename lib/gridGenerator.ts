import * as THREE from 'three'
import { BoxParameters, CombinedBoxInfo } from '@/lib/types'
import { GridBoxDefinition } from '@/lib/types'
import { generateBox } from '@/lib/boxGenerator'

/**
 * Generate grid matrix of box definitions from input parameters
 * This creates a data structure that represents the grid without creating 3D objects yet
 */
export function generateGridMatrix(
    boxWidths: number[],
    boxDepths: number[],
    defaultParams: Omit<BoxParameters, 'width' | 'depth'>,
    selectedBoxIndices: Set<number>,
    hiddenBoxes: Set<number>,
    combinedBoxes: Map<number, CombinedBoxInfo>
): GridBoxDefinition[][] {
    const numCols = boxWidths.length
    const numRows = boxDepths.length
    
    // Initialize matrix with empty rows
    const matrix: GridBoxDefinition[][] = Array(numRows).fill(null).map(() => 
        Array(numCols).fill(null)
    )
    
    // Track processed positions for combined boxes
    const processedPositions = new Set<string>()
    
    // First pass - create regular boxes and identify positions occupied by combined boxes
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col
            const posKey = `${row}-${col}`
            
            // Skip processing if this position is part of a processed combined box
            if (processedPositions.has(posKey)) {
                continue
            }
            
            // If this is a primary index of a combined box
            if (combinedBoxes.has(index)) {
                const combinedInfo = combinedBoxes.get(index)!
                const direction = combinedInfo.direction
                const secondaryIndices = combinedInfo.indices
                
                // Calculate combined dimensions and positions
                if (direction === 'width') {
                    // Width combination (horizontal)
                    let combinedWidth = boxWidths[col]
                    let currentCol = col
                    
                    // Calculate total width and mark positions as processed
                    for (const secondaryIndex of secondaryIndices) {
                        const secondaryCol = secondaryIndex % numCols
                        currentCol = Math.max(currentCol, secondaryCol)
                        combinedWidth += boxWidths[secondaryCol]
                        
                        // Mark all positions in the combined box as processed
                        processedPositions.add(`${row}-${secondaryCol}`)
                    }
                    
                    // Create a single box definition for the combined box
                    matrix[row][col] = {
                        width: combinedWidth,
                        depth: boxDepths[row],
                        index,
                        isSelected: selectedBoxIndices.has(index),
                        isHidden: hiddenBoxes.has(index),
                        isCombined: true,
                        combinedIndices: [index, ...secondaryIndices],
                        direction,
                        // Calculate position based on spanning columns
                        // Position from leftmost box
                        x: -calculateTotalWidth(boxWidths) / 2 + sumWidthsBeforeIndex(boxWidths, col),
                        z: calculateTotalDepth(boxDepths) / 2 - sumDepthsBeforeIndex(boxDepths, row),
                        ...defaultParams
                    }
                } else {
                    // Depth combination (vertical)
                    let combinedDepth = boxDepths[row]
                    let currentRow = row
                    
                    // Calculate total depth and mark positions as processed
                    for (const secondaryIndex of secondaryIndices) {
                        const secondaryRow = Math.floor(secondaryIndex / numCols)
                        currentRow = Math.max(currentRow, secondaryRow)
                        combinedDepth += boxDepths[secondaryRow]
                        
                        // Mark all positions in the combined box as processed
                        processedPositions.add(`${secondaryRow}-${col}`)
                    }
                    
                    // Create a single box definition for the combined box
                    matrix[row][col] = {
                        width: boxWidths[col],
                        depth: combinedDepth,
                        index,
                        isSelected: selectedBoxIndices.has(index),
                        isHidden: hiddenBoxes.has(index),
                        isCombined: true,
                        combinedIndices: [index, ...secondaryIndices],
                        direction,
                        // Calculate position based on spanning rows
                        x: -calculateTotalWidth(boxWidths) / 2 + sumWidthsBeforeIndex(boxWidths, col),
                        z: calculateTotalDepth(boxDepths) / 2 - sumDepthsBeforeIndex(boxDepths, row),
                        ...defaultParams
                    }
                }
            } else {
                // Handle secondary boxes of combined boxes
                let isSecondaryBox = false
                
                for (const [primaryIndex, combinedInfo] of combinedBoxes.entries()) {
                    if (combinedInfo.indices.includes(index)) {
                        isSecondaryBox = true
                        processedPositions.add(posKey)
                        
                        // Create a placeholder for secondary box that won't be rendered
                        matrix[row][col] = {
                            width: boxWidths[col],
                            depth: boxDepths[row],
                            index,
                            isSelected: false,
                            isHidden: true,
                            isCombined: true,
                            isSecondaryBox: true,
                            primaryBoxIndex: primaryIndex,
                            combinedIndices: [primaryIndex, ...combinedInfo.indices],
                            direction: combinedInfo.direction,
                            x: 0,
                            z: 0,
                            ...defaultParams
                        }
                        break
                    }
                }

                // Regular box
                if (!isSecondaryBox && !processedPositions.has(posKey)) {
                    matrix[row][col] = {
                        width: boxWidths[col],
                        depth: boxDepths[row],
                        index,
                        isSelected: selectedBoxIndices.has(index),
                        isHidden: hiddenBoxes.has(index),
                        isCombined: false,
                        // Calculate position
                        x: -calculateTotalWidth(boxWidths) / 2 + sumWidthsBeforeIndex(boxWidths, col),
                        z: calculateTotalDepth(boxDepths) / 2 - sumDepthsBeforeIndex(boxDepths, row),
                        ...defaultParams
                    }
                }
            }
        }
    }
    
    return matrix
}

/**
 * Creates 3D box objects from a grid matrix and adds them to a group
 */
export function createBoxesFromMatrix(
    boxMeshGroup: THREE.Group,
    matrix: GridBoxDefinition[][]
): void {
    // Clear existing boxes
    while (boxMeshGroup.children.length > 0) {
        boxMeshGroup.remove(boxMeshGroup.children[0])
    }
    
    // Keep track of box indices for proper ordering
    const boxMap = new Map<number, THREE.Object3D>();
    
    // Create 3D objects from matrix
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            const boxDef = matrix[row][col]
            
            if (!boxDef) continue
            
            if (boxDef.isSecondaryBox) {
                // Create a placeholder for secondary boxes that won't be rendered
                const placeholder = new THREE.Group()
                placeholder.visible = false
                placeholder.userData = {
                    dimensions: {
                        width: boxDef.width,
                        depth: boxDef.depth,
                        height: boxDef.height,
                        index: boxDef.index,
                        isHidden: true,
                        isSelected: false,
                        isCombined: true,
                        isSecondaryBox: true,
                        primaryBoxIndex: boxDef.primaryBoxIndex,
                    },
                }
                boxMap.set(boxDef.index, placeholder)
                continue
            }
            
            // Skip hidden boxes but create placeholder for proper indexing
            if (boxDef.isHidden) {
                const placeholder = new THREE.Group()
                placeholder.visible = false
                placeholder.userData = {
                    dimensions: {
                        width: boxDef.width,
                        depth: boxDef.depth,
                        height: boxDef.height,
                        index: boxDef.index,
                        isHidden: true,
                        isSelected: false,
                        isCombined: boxDef.isCombined,
                        combinedIndices: boxDef.combinedIndices,
                        direction: boxDef.direction
                    },
                }
                placeholder.position.set(boxDef.x, 0, boxDef.z)
                boxMap.set(boxDef.index, placeholder)
                continue
            }
            
            // Create a visible box
            const box = generateBox(boxDef)
            
            // Position the box
            if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
                box.position.set(boxDef.x, 0, boxDef.z)
            }
            
            boxMap.set(boxDef.index, box)
        }
    }
    
    // Add boxes to the group in the correct order
    const sortedIndices = Array.from(boxMap.keys()).sort((a, b) => a - b)
    for (const index of sortedIndices) {
        const box = boxMap.get(index)
        if (box) {
            boxMeshGroup.add(box)
        }
    }
}

/**
 * Generate box models based on current parameters and add them to the scene
 * This is a wrapper around the matrix-based generation functions 
 * for backward compatibility
 */
export function createBoxModelFromGrid(
    boxMeshGroup: THREE.Group | null,
    params: {
        boxWidths: number[],
        boxDepths: number[],
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean,
        selectedBoxIndices?: Set<number>,
        hiddenBoxes?: Set<number>,
        boxColor?: number,
        highlightColor?: number,
        combinedBoxes?: Map<number, CombinedBoxInfo>
    }
): void {
    if (!boxMeshGroup) return
    
    const {
        boxWidths,
        boxDepths,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        selectedBoxIndices = new Set<number>(),
        hiddenBoxes = new Set<number>(),
        boxColor,
        highlightColor,
        combinedBoxes = new Map<number, CombinedBoxInfo>(),
    } = params
    
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
        
        // Generate grid matrix
        const matrix = generateGridMatrix(
            boxWidths,
            boxDepths,
            {
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                boxColor,
                highlightColor
            },
            selectedBoxIndices,
            hiddenBoxes,
            combinedBoxes
        )

        console.log('Generated grid matrix:', matrix)
        
        // Create boxes from matrix
        createBoxesFromMatrix(boxMeshGroup, matrix)
        
    } catch (error) {
        console.error('Error creating box models:', error)
    }
}

/**
 * Helper function to calculate total width of all boxes
 */
function calculateTotalWidth(boxWidths: number[]): number {
    return boxWidths.reduce((sum, width) => sum + width, 0)
}

/**
 * Helper function to calculate total depth of all boxes
 */
function calculateTotalDepth(boxDepths: number[]): number {
    return boxDepths.reduce((sum, depth) => sum + depth, 0)
}

/**
 * Helper function to sum widths of boxes before a certain index
 */
function sumWidthsBeforeIndex(boxWidths: number[], index: number): number {
    return boxWidths.slice(0, index).reduce((sum, width) => sum + width, 0)
}

/**
 * Helper function to sum depths of boxes before a certain index
 */
function sumDepthsBeforeIndex(boxDepths: number[], index: number): number {
    return boxDepths.slice(0, index).reduce((sum, depth) => sum + depth, 0)
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