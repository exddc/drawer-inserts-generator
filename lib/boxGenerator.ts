import * as THREE from 'three'
import { createOuterShape, createInnerShape } from './boxGeneratorUtils'

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
export function generateBasicBox(dimensions: BoxDimensions, positionX: number, positionZ: number): THREE.Mesh | THREE.Group {
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

    // Create wall shape with rounded corners
    const wallsShape = createOuterShape(width, depth, cornerRadius)
    const innerPath = createInnerShape(width, depth, wallThickness, cornerRadius)
    
    wallsShape.holes.push(innerPath)

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

    if(hasBottom) {
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

    // Rotate the whole group to match the scene orientation
    meshGroup.rotation.x = -Math.PI / 2

    // Position the mesh group
    meshGroup.position.x = positionX
    meshGroup.position.z = positionZ
    return meshGroup
}
