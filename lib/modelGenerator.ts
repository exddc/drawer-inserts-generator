import { createBoxWithRoundedEdges } from '@/lib/boxModelGenerator'
import { generateBoxGrid } from '@/lib/boxUtils'
import { BoxModelParams, CombinedBoxInfo } from '@/lib/types'
import * as THREE from 'three'

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
        combinedBoxes = new Map<number, CombinedBoxInfo>(),
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

        // Track which boxes are part of a combined box
        const processedBoxes = new Set<number>()

        // First pass - create combined boxes
        for (const [primaryIndex, combinedInfo] of combinedBoxes.entries()) {
            // Safety check - make sure combinedInfo has the expected structure
            if (
                !combinedInfo ||
                !combinedInfo.indices ||
                !combinedInfo.direction
            ) {
                console.error('Invalid combined box info:', combinedInfo)
                continue
            }

            const direction = combinedInfo.direction
            const secondaryIndices = combinedInfo.indices

            // Add all indices to processed set
            processedBoxes.add(primaryIndex)
            secondaryIndices.forEach((idx: number) => processedBoxes.add(idx))

            // Convert all indices to row/col positions
            const allBoxPositions = [primaryIndex, ...secondaryIndices].map(
                (idx) => ({
                    index: idx,
                    row: Math.floor(idx / numCols),
                    col: idx % numCols,
                    box: boxGrid[idx],
                })
            )

            // Primary box info
            const primaryBox = boxGrid[primaryIndex]

            // Set the dimensions and position based on direction of combination
            let combinedWidth, combinedDepth
            let anchorBox, posX, posZ

            if (direction === 'width') {
                // Width combination (horizontal)

                // Sort by column to find leftmost box
                allBoxPositions.sort((a, b) => a.col - b.col)

                // Get the leftmost box
                anchorBox = allBoxPositions[0].box

                // Calculate total width by summing all box widths
                combinedWidth = allBoxPositions.reduce(
                    (sum, pos) => sum + pos.box.width,
                    0
                )
                combinedDepth = primaryBox.depth

                // Position from leftmost box
                posX = anchorBox.x + anchorBox.width / 2
                posZ = primaryBox.z + primaryBox.depth / 2
            } else {
                // Depth combination (vertical)

                // Sort by row to find topmost box
                allBoxPositions.sort((a, b) => a.row - b.row)

                // Get the topmost box
                anchorBox = allBoxPositions[1].box

                // Calculate total depth by summing all box depths
                combinedDepth = allBoxPositions.reduce(
                    (sum, pos) => sum + pos.box.depth,
                    0
                )
                combinedWidth = primaryBox.width

                // Position from topmost box
                posX = primaryBox.x + primaryBox.width / 2
                posZ = anchorBox.z + anchorBox.depth / 2
            }

            // Check if dimensions are valid
            if (
                combinedWidth <= 0 ||
                combinedDepth <= 0 ||
                wallThickness * 2 >= combinedWidth ||
                wallThickness * 2 >= combinedDepth
            ) {
                console.warn(
                    `Invalid dimensions for combined box ${primaryIndex}, skipping`
                )
                continue
            }

            // Skip if hidden
            if (hiddenBoxes.has(primaryIndex)) {
                // Create a placeholder to keep indices consistent
                const placeholder = new THREE.Group()
                placeholder.visible = false
                placeholder.userData = {
                    dimensions: {
                        width: combinedWidth,
                        depth: combinedDepth,
                        height,
                        index: primaryIndex,
                        isHidden: true,
                        isSelected: false,
                        isCombined: true,
                        combinedIndices: [primaryIndex, ...secondaryIndices],
                        direction,
                    },
                }

                placeholder.position.set(posX, 0, posZ)
                boxMeshGroup.add(placeholder)
                continue
            }

            // Create the combined box
            const isSelected = selectedBoxIndices.has(primaryIndex)

            const box = createBoxWithRoundedEdges({
                width: combinedWidth,
                depth: combinedDepth,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                isSelected,
                boxColor,
                highlightColor,
            })

            box.userData = {
                dimensions: {
                    width: combinedWidth,
                    depth: combinedDepth,
                    height,
                    index: primaryIndex,
                    isHidden: false,
                    isSelected,
                    isCombined: true,
                    combinedIndices: [primaryIndex, ...secondaryIndices],
                    direction,
                },
            }

            if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
                box.position.set(posX, 0, posZ)
            }

            boxMeshGroup.add(box)
        }

        // Second pass - create regular boxes
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
                        isPlaceholder: true,
                    },
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
                        isCombined: false,
                    },
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
                highlightColor,
            })

            box.userData = {
                dimensions: {
                    width,
                    depth,
                    height,
                    index,
                    isHidden: false,
                    isSelected,
                    isCombined: false,
                },
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
