import * as THREE from 'three'

/**
 * Calculate box widths that fit within total width
 */
export function calculateBoxWidths(
    totalWidth: number,
    minWidth: number,
    maxWidth: number
): number[] {
    if (
        minWidth <= 0 ||
        maxWidth <= 0 ||
        minWidth > maxWidth ||
        totalWidth <= 0
    ) {
        return [totalWidth]
    }

    if (totalWidth > maxWidth && totalWidth <= minWidth + maxWidth) {
        if (totalWidth / 2 >= minWidth) {
            return [totalWidth / 2, totalWidth / 2]
        } else {
            return [minWidth, totalWidth - minWidth]
        }
    }

    const maxWidthBoxCount = Math.floor(totalWidth / maxWidth)

    let remainingWidth = totalWidth - maxWidthBoxCount * maxWidth

    const widths: number[] = Array(maxWidthBoxCount).fill(maxWidth)

    if (remainingWidth >= minWidth) {
        widths.push(remainingWidth)
    } else if (remainingWidth > 0) {
        if (widths.length > 0) {
            const extraPerBox = remainingWidth / widths.length
            for (let i = 0; i < widths.length; i++) {
                widths[i] += extraPerBox
            }
        } else {
            widths.push(totalWidth)
        }
    } else if (widths.length === 0) {
        widths.push(totalWidth)
    }

    return widths
}

/**
 * Calculate box depths that fit within total depth
 * Uses the same logic as calculateBoxWidths
 */
export function calculateBoxDepths(
    totalDepth: number,
    minDepth: number,
    maxDepth: number
): number[] {
    return calculateBoxWidths(totalDepth, minDepth, maxDepth)
}

/**
 * Generate a grid of box dimensions based on width and depth distributions
 */
export function generateBoxGrid(
    boxWidths: number[],
    boxDepths: number[]
): { width: number; depth: number; x: number; z: number }[] {
    const grid: { width: number; depth: number; x: number; z: number }[] = []

    const totalWidth = boxWidths.reduce((sum, w) => sum + w, 0)
    const totalDepth = boxDepths.reduce((sum, d) => sum + d, 0)

    let startX = -totalWidth / 2
    let startZ = -totalDepth / 2

    let currentDepthPos = startZ

    for (const depth of boxDepths) {
        let currentWidthPos = startX

        for (const width of boxWidths) {
            grid.push({
                width,
                depth,
                x: currentWidthPos - width / 2,
                z: currentDepthPos + depth / 2,
            })

            currentWidthPos += width
        }

        currentDepthPos += depth
    }

    return grid
}

/**
 * Extract box information from a THREE.Object3D
 */
export function getBoxInfoFromObject(obj: THREE.Object3D): {
    position: THREE.Vector3
    width: number
    depth: number
    height: number
} {
    const position = new THREE.Vector3()
    obj.getWorldPosition(position)

    if (obj.userData && obj.userData.dimensions) {
        return {
            position,
            width: obj.userData.dimensions.width,
            depth: obj.userData.dimensions.depth,
            height: obj.userData.dimensions.height,
        }
    }

    const boundingBox = new THREE.Box3().setFromObject(obj)
    const size = new THREE.Vector3()
    boundingBox.getSize(size)

    return {
        position,
        width: size.x,
        depth: size.z,
        height: size.y,
    }
}
