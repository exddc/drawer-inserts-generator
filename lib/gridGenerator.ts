import * as THREE from 'three'
import { CombinedBoxInfo } from '@/lib/types'
import { BoxDimensions, generateBox } from '@/lib/boxGenerator'

/**
 * Basic box information for rendering in the grid
 */
interface BoxInfo {
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    x: number
    z: number
    index: number
    color: number
    visible: boolean
    isCombined: boolean
    combinedIndices?: number[]
    direction?: 'width' | 'depth'
}

/**
 * Calculate total width of all boxes
 */
function calculateTotalWidth(boxWidths: number[]): number {
    return boxWidths.reduce((sum, width) => sum + width, 0)
}

/**
 * Calculate total depth of all boxes
 */
function calculateTotalDepth(boxDepths: number[]): number {
    return boxDepths.reduce((sum, depth) => sum + depth, 0)
}

/**
 * Calculate sum of widths up to specific index
 */
function sumWidthsBeforeIndex(boxWidths: number[], index: number): number {
    return boxWidths.slice(0, index).reduce((sum, width) => sum + width, 0)
}

/**
 * Calculate sum of depths up to specific index
 */
function sumDepthsBeforeIndex(boxDepths: number[], index: number): number {
    return boxDepths.slice(0, index).reduce((sum, depth) => sum + depth, 0)
}

/**
 * Generate grid matrix of box information
 */
export function generateGridMatrix(
    boxWidths: number[],
    boxDepths: number[],
    params: {
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean,
        boxColor: number,
        highlightColor: number,
        selectedBoxIndices: Set<number>,
        hiddenBoxes: Set<number>,
        combinedBoxes: Map<number, CombinedBoxInfo>
    }
): BoxInfo[] {
    const {
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        boxColor,
        highlightColor,
        selectedBoxIndices,
        hiddenBoxes,
        combinedBoxes
    } = params;
    
    const numCols = boxWidths.length
    const numRows = boxDepths.length
    const totalWidth = calculateTotalWidth(boxWidths)
    const totalDepth = calculateTotalDepth(boxDepths)
    
    // Result array of all box information
    const boxInfoArray: BoxInfo[] = []
    
    // Track processed positions for combined boxes to avoid duplicates
    const processedIndices = new Set<number>()
    
    // First, handle combined boxes
    for (const [primaryIndex, combinedInfo] of combinedBoxes.entries()) {
        const primaryRow = Math.floor(primaryIndex / numCols)
        const primaryCol = primaryIndex % numCols
        const direction = combinedInfo.direction
        const secondaryIndices = combinedInfo.indices
        const startX = -totalWidth / 2 + sumWidthsBeforeIndex(boxWidths, primaryCol)
        const startZ = totalDepth / 2 - sumDepthsBeforeIndex(boxDepths, primaryRow)
        
        // Mark all indices as processed
        processedIndices.add(primaryIndex)
        secondaryIndices.forEach(index => processedIndices.add(index))
        
        let combinedWidth = boxWidths[primaryCol]
        let combinedDepth = boxDepths[primaryRow]
        
        if (direction === 'width') {
            // Combine horizontally - add widths
            secondaryIndices.forEach(index => {
                const col = index % numCols
                combinedWidth += boxWidths[col]
            })
        } else {
            // Combine vertically - add depths
            secondaryIndices.forEach(index => {
                const row = Math.floor(index / numCols)
                combinedDepth += boxDepths[row]
            })
        }
        
        // Create the combined box info
        boxInfoArray.push({
            width: combinedWidth,
            depth: combinedDepth,
            height,
            wallThickness,
            cornerRadius,
            hasBottom,
            x: startX,
            z: startZ,
            index: primaryIndex,
            color: selectedBoxIndices.has(primaryIndex) ? highlightColor : boxColor,
            visible: !hiddenBoxes.has(primaryIndex),
            isCombined: true,
            combinedIndices: [primaryIndex, ...secondaryIndices],
            direction
        })
    }
    
    // Then handle regular boxes
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col
            
            // Skip if this box was already processed as part of a combined box
            if (processedIndices.has(index)) {
                continue
            }
            
            // Calculate position for this box
            const startX = -totalWidth / 2 + sumWidthsBeforeIndex(boxWidths, col)
            const startZ = totalDepth / 2 - sumDepthsBeforeIndex(boxDepths, row)
            
            // Create the box info
            boxInfoArray.push({
                width: boxWidths[col],
                depth: boxDepths[row],
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                x: startX,
                z: startZ,
                index,
                color: selectedBoxIndices.has(index) ? highlightColor : boxColor,
                visible: !hiddenBoxes.has(index),
                isCombined: false
            })
        }
    }
    
    return boxInfoArray
}

/**
 * Create 3D boxes from box information and add them to the group
 */
export function createBoxesFromInfo(boxMeshGroup: THREE.Group, boxInfoArray: BoxInfo[]): void {
    // Clear existing boxes
    while (boxMeshGroup.children.length > 0) {
        boxMeshGroup.remove(boxMeshGroup.children[0])
    }
    
    // Sort boxes by index to ensure consistent ordering
    const sortedBoxInfo = [...boxInfoArray].sort((a, b) => a.index - b.index)
    
    // Create a box entry for every index, even if invisible
    const totalIndices = Math.max(...boxInfoArray.map(info => info.index)) + 1
    const boxObjects: (THREE.Object3D | null)[] = Array(totalIndices).fill(null)
    
    // Create and position all boxes
    for (const boxInfo of sortedBoxInfo) {
        // For invisible boxes, create a placeholder group
        if (!boxInfo.visible) {
            const placeholder = new THREE.Group()
            placeholder.visible = false
            placeholder.userData = {
                dimensions: {
                    width: boxInfo.width,
                    depth: boxInfo.depth,
                    height: boxInfo.height,
                    index: boxInfo.index,
                    isHidden: true,
                    isSelected: false,
                    isCombined: boxInfo.isCombined,
                    combinedIndices: boxInfo.combinedIndices,
                    direction: boxInfo.direction
                }
            }
            placeholder.position.set(boxInfo.x, 0, boxInfo.z)
            boxObjects[boxInfo.index] = placeholder
            continue
        }
        
        // Create visible box
        const box = generateBox({
            width: boxInfo.width,
            depth: boxInfo.depth,
            height: boxInfo.height,
            wallThickness: boxInfo.wallThickness,
            cornerRadius: boxInfo.cornerRadius,
            hasBottom: boxInfo.hasBottom,
            color: boxInfo.color
        })
        
        // Add metadata
        box.userData = {
            dimensions: {
                width: boxInfo.width,
                depth: boxInfo.depth,
                height: boxInfo.height,
                index: boxInfo.index,
                isHidden: false,
                isSelected: boxInfo.color === (boxInfo as any).highlightColor,
                isCombined: boxInfo.isCombined,
                combinedIndices: boxInfo.combinedIndices,
                direction: boxInfo.direction
            }
        }
        
        // Position the box
        box.position.set(boxInfo.x, 0, boxInfo.z)
        
        // Store in our array
        boxObjects[boxInfo.index] = box
    }
    
    // Add all boxes to the group in index order
    boxObjects.forEach(obj => {
        if (obj) {
            boxMeshGroup.add(obj)
        }
    })
}

/**
 * Generate box models and add them to the scene
 * Main entry point for the grid generator
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
        boxColor = 0x7a9cbf,
        highlightColor = 0xf59e0b,
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
        
        // Generate box information
        const boxInfoArray = generateGridMatrix(
            boxWidths,
            boxDepths,
            {
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                boxColor,
                highlightColor,
                selectedBoxIndices,
                hiddenBoxes,
                combinedBoxes
            }
        )
        
        // Create boxes from info
        createBoxesFromInfo(boxMeshGroup, boxInfoArray)
        
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