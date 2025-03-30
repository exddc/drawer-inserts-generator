import * as THREE from 'three'

/**
 * Core box definition with only the essential dimensions
 */
export interface BoxDimensions {
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    color?: number
    index?: number
    isSelected?: boolean
    isHidden?: boolean
}

/**
 * Create a box with rounded edges and optional bottom
 */
export function generateBox(dimensions: BoxDimensions): THREE.Mesh | THREE.Group {
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        color = 0x7a9cbf,
        index,
        isSelected = false,
        isHidden = false
    } = dimensions
    
    const meshGroup = new THREE.Group()
    meshGroup.visible = !isHidden

    // Set userData for dimensions
    meshGroup.userData = {
        dimensions: {
            width,
            depth,
            height,
            index,
            isSelected,
            isHidden
        },
    }

    // Generate the box geometry based on whether it has a bottom
    if (hasBottom) {
        addBoxWithBottom(meshGroup, width, depth, height, wallThickness, cornerRadius, color)
    } else {
        addBoxWithoutBottom(meshGroup, width, depth, height, wallThickness, cornerRadius, color)
    }

    // Rotate the whole group to match the scene orientation
    meshGroup.rotation.x = -Math.PI / 2

    return meshGroup
}

/**
 * Add a box with bottom to the mesh group
 */
function addBoxWithBottom(
    meshGroup: THREE.Group,
    width: number,
    depth: number,
    height: number,
    wallThickness: number,
    cornerRadius: number,
    color: number
): void {
    // Create wall shape with rounded corners
    const wallsShape = createWallShape(width, depth, wallThickness, cornerRadius)
    
    // Extrude the walls vertically
    const wallsExtrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: false,
    }
    const wallsGeometry = new THREE.ExtrudeGeometry(wallsShape, wallsExtrudeSettings)

    // Create material with proper color
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.4,
        metalness: 0.2,
    })

    // Create the walls mesh
    const wallsMesh = new THREE.Mesh(wallsGeometry, material)
    wallsMesh.castShadow = true
    wallsMesh.receiveShadow = true
    meshGroup.add(wallsMesh)

    // Create the bottom shape (same as outer wall shape)
    const bottomShape = createOuterShape(width, depth, cornerRadius)
    
    // Extrude the bottom with wall thickness
    const bottomExtrudeSettings = {
        steps: 1,
        depth: wallThickness,
        bevelEnabled: false,
    }
    const bottomGeometry = new THREE.ExtrudeGeometry(bottomShape, bottomExtrudeSettings)
    const bottomMesh = new THREE.Mesh(bottomGeometry, material)
    bottomMesh.castShadow = true
    bottomMesh.receiveShadow = true
    meshGroup.add(bottomMesh)
}

/**
 * Add a box without bottom to the mesh group
 */
function addBoxWithoutBottom(
    meshGroup: THREE.Group,
    width: number,
    depth: number,
    height: number,
    wallThickness: number,
    cornerRadius: number,
    color: number
): void {
    // Create wall shape with rounded corners
    const wallsShape = createWallShape(width, depth, wallThickness, cornerRadius)
    
    const extrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: false,
    }
    
    const geometry = new THREE.ExtrudeGeometry(wallsShape, extrudeSettings)

    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.4,
        metalness: 0.2,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    meshGroup.add(mesh)
}

/**
 * Helper function to create the outer shape with rounded corners
 */
function createOuterShape(width: number, depth: number, cornerRadius: number): THREE.Shape {
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
function createInnerShape(width: number, depth: number, wallThickness: number, cornerRadius: number): THREE.Path {
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

/**
 * Helper function to create a wall shape (outer shape with inner hole)
 */
function createWallShape(width: number, depth: number, wallThickness: number, cornerRadius: number): THREE.Shape {
    const outerShape = createOuterShape(width, depth, cornerRadius)
    const innerPath = createInnerShape(width, depth, wallThickness, cornerRadius)
    
    outerShape.holes.push(innerPath)
    
    return outerShape
}