import * as THREE from 'three';

/**
 * Calculate box widths that fit within total width
 */
export function calculateBoxWidths(
    totalWidth: number,
    minWidth: number,
    maxWidth: number
): number[] {
    // Ensure constraints make sense
    if (minWidth <= 0 || maxWidth <= 0 || minWidth > maxWidth || totalWidth <= 0) {
        return [totalWidth];
    }

    // Special case: if total width is less than minWidth, return one box of totalWidth
    if (totalWidth < minWidth) {
        return [totalWidth];
    }
    
    // Special case for two boxes: if totalWidth <= minWidth+maxWidth, create exactly two boxes
    if (totalWidth > maxWidth && totalWidth <= minWidth + maxWidth) {
        // When exactly two boxes can fit, but one would be smaller than minWidth:
        // Adjust to make both boxes equal size if possible, or make one box minWidth and the other the remainder
        if (totalWidth / 2 >= minWidth) {
            // If we can make equal boxes larger than minWidth, do that
            return [totalWidth / 2, totalWidth / 2];
        } else {
            // Otherwise make one box minWidth and one box the remainder
            return [minWidth, totalWidth - minWidth];
        }
    }
    
    // Calculate how many boxes at max width would fit
    const maxWidthBoxCount = Math.floor(totalWidth / maxWidth);
    
    // Calculate remaining width after placing max width boxes
    let remainingWidth = totalWidth - (maxWidthBoxCount * maxWidth);
    
    // Initialize the array with max width boxes
    const widths: number[] = Array(maxWidthBoxCount).fill(maxWidth);
    
    // If there's remaining width that can fit at least one min width box
    if (remainingWidth >= minWidth) {
        widths.push(remainingWidth);
    } else if (remainingWidth > 0) {
        if (widths.length > 0) {
            // Distribute remaining width among existing boxes
            const extraPerBox = remainingWidth / widths.length;
            for (let i = 0; i < widths.length; i++) {
                widths[i] += extraPerBox;
            }
        } else {
            // If no boxes at max width fit and remaining width is less than min width,
            // create a single box with the total width
            widths.push(totalWidth);
        }
    } else if (widths.length === 0) {
        // If nothing fits, create a single box with total width
        widths.push(totalWidth);
    }
    
    return widths;
}

/**
 * Extract box information from a THREE.Object3D
 */
export function getBoxInfoFromObject(obj: THREE.Object3D): { 
    position: THREE.Vector3, 
    width: number, 
    depth: number, 
    height: number 
} {
    const position = new THREE.Vector3();
    obj.getWorldPosition(position);
    
    // Try to get dimensions from userData if available
    if (obj.userData && obj.userData.dimensions) {
        return {
            position,
            width: obj.userData.dimensions.width,
            depth: obj.userData.dimensions.depth,
            height: obj.userData.dimensions.height
        };
    }
    
    // Otherwise estimate from bounding box
    const boundingBox = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    return {
        position,
        width: size.x,
        depth: size.z,
        height: size.y
    };
}