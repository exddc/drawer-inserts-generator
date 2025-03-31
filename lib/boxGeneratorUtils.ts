import * as THREE from 'three'

/**
 * Helper function to create the outer shape with rounded corners
 */
export function createOuterShape(width: number, depth: number, cornerRadius: number): THREE.Shape {
    const shape = new THREE.Shape()
    
    shape.moveTo(cornerRadius, 0)
    shape.lineTo(width - cornerRadius, 0)
    shape.quadraticCurveTo(width, 0, width, cornerRadius)
    shape.lineTo(width, depth - cornerRadius)
    shape.quadraticCurveTo(width, depth, width - cornerRadius, depth)
    shape.lineTo(cornerRadius, depth)
    shape.quadraticCurveTo(0, depth, 0, depth - cornerRadius)
    shape.lineTo(0, cornerRadius)
    shape.quadraticCurveTo(0, 0, cornerRadius, 0)
    
    return shape
}

/**
 * Helper function to create the inner shape with rounded corners
 */
export function createInnerShape(width: number, depth: number, wallThickness: number, cornerRadius: number): THREE.Path {
    const innerPath = new THREE.Path()
    
    innerPath.moveTo(wallThickness + cornerRadius, wallThickness)
    innerPath.lineTo(width - wallThickness - cornerRadius, wallThickness)
    innerPath.quadraticCurveTo(
        width - wallThickness,
        wallThickness,
        width - wallThickness,
        wallThickness + cornerRadius
    )
    innerPath.lineTo(
        width - wallThickness,
        depth - wallThickness - cornerRadius
    )
    innerPath.quadraticCurveTo(
        width - wallThickness,
        depth - wallThickness,
        width - wallThickness - cornerRadius,
        depth - wallThickness
    )
    innerPath.lineTo(wallThickness + cornerRadius, depth - wallThickness)
    innerPath.quadraticCurveTo(
        wallThickness,
        depth - wallThickness,
        wallThickness,
        depth - wallThickness - cornerRadius
    )
    innerPath.lineTo(wallThickness, wallThickness + cornerRadius)
    innerPath.quadraticCurveTo(
        wallThickness,
        wallThickness,
        wallThickness + cornerRadius,
        wallThickness
    )
    
    return innerPath
}
