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
        highlightColor
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

        boxGrid.forEach((boxInfo, index) => {
            const { width, depth, x, z } = boxInfo

            if (
                width <= 0 ||
                depth <= 0 ||
                wallThickness * 2 >= width ||
                wallThickness * 2 >= depth
            ) {
                console.warn(`Invalid dimensions for box ${index}, skipping`)
                return
            }

            // Skip hidden boxes in debug mode
            if (hiddenBoxes.has(index)) {
                // Still create a placeholder with userData so indexes remain consistent
                const placeholder = new THREE.Group();
                placeholder.visible = false;
                placeholder.userData = {
                    dimensions: {
                        width,
                        depth,
                        height,
                        index,
                        isHidden: true,
                        isSelected: false
                    },
                };
                placeholder.position.set(x + width / 2, 0, z + depth / 2);
                boxMeshGroup?.add(placeholder);
                return;
            }

            const isSelected = selectedBoxIndices.has(index);

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
                    isSelected
                },
            }

            if (box instanceof THREE.Group || box instanceof THREE.Mesh) {
                box.position.set(x + width / 2, 0, z + depth / 2)
            }

            boxMeshGroup?.add(box)
        })
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