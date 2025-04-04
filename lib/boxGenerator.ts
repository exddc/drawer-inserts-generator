import * as THREE from 'three'
import { CSG } from 'three-csg-ts'

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
    isHidden?: boolean
    excludeWalls?: string[] // Walls to exclude
}

/**
 * Create a box with individual walls and optional bottom
 */
export function generateBasicBox(
    dimensions: BoxDimensions,
    positionX: number,
    positionZ: number
): THREE.Group {
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        index,
        isHidden = false,
        color,
        excludeWalls,
    } = dimensions

    // Create a group to hold all the meshes
    const meshGroup = new THREE.Group()
    meshGroup.visible = !isHidden

    // Set userData for dimensions
    meshGroup.userData = {
        dimensions: {
            width,
            depth,
            height,
            index,
            isHidden,
        },
    }

    const defaultColor = 0x7a9cbf
    const materialColor = color || defaultColor

    const material = new THREE.MeshStandardMaterial({
        color: materialColor,
        roughness: 0.4,
        metalness: 0.2,
    })

    if (hasBottom) {
        const wallsShape = new THREE.Shape()

        wallsShape.moveTo(cornerRadius, 0)
        wallsShape.lineTo(width - cornerRadius, 0)
        wallsShape.quadraticCurveTo(width, 0, width, cornerRadius)
        wallsShape.lineTo(width, depth - cornerRadius)
        wallsShape.quadraticCurveTo(width, depth, width - cornerRadius, depth)
        wallsShape.lineTo(cornerRadius, depth)
        wallsShape.quadraticCurveTo(0, depth, 0, depth - cornerRadius)
        wallsShape.lineTo(0, cornerRadius)
        wallsShape.quadraticCurveTo(0, 0, cornerRadius, 0)

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

        wallsShape.holes.push(innerPath)

        const wallsExtrudeSettings = {
            steps: 1,
            depth: height,
            bevelEnabled: false,
        }

        const wallsGeometry = new THREE.ExtrudeGeometry(
            wallsShape,
            wallsExtrudeSettings
        )

        const wallsMesh = new THREE.Mesh(wallsGeometry, material)
        wallsMesh.castShadow = true
        wallsMesh.receiveShadow = true

        meshGroup.add(wallsMesh)

        const bottomShape = new THREE.Shape()

        bottomShape.moveTo(cornerRadius, 0)
        bottomShape.lineTo(width - cornerRadius, 0)
        bottomShape.quadraticCurveTo(width, 0, width, cornerRadius)
        bottomShape.lineTo(width, depth - cornerRadius)
        bottomShape.quadraticCurveTo(width, depth, width - cornerRadius, depth)
        bottomShape.lineTo(cornerRadius, depth)
        bottomShape.quadraticCurveTo(0, depth, 0, depth - cornerRadius)
        bottomShape.lineTo(0, cornerRadius)
        bottomShape.quadraticCurveTo(0, 0, cornerRadius, 0)

        const bottomInnerPath = new THREE.Path()
        bottomInnerPath.moveTo(wallThickness + cornerRadius, wallThickness)
        bottomInnerPath.lineTo(
            width - wallThickness - cornerRadius,
            wallThickness
        )
        bottomInnerPath.quadraticCurveTo(
            width - wallThickness,
            wallThickness,
            width - wallThickness,
            wallThickness + cornerRadius
        )
        bottomInnerPath.lineTo(
            width - wallThickness,
            depth - wallThickness - cornerRadius
        )
        bottomInnerPath.quadraticCurveTo(
            width - wallThickness,
            depth - wallThickness,
            width - wallThickness - cornerRadius,
            depth - wallThickness
        )
        bottomInnerPath.lineTo(
            wallThickness + cornerRadius,
            depth - wallThickness
        )
        bottomInnerPath.quadraticCurveTo(
            wallThickness,
            depth - wallThickness,
            wallThickness,
            depth - wallThickness - cornerRadius
        )
        bottomInnerPath.lineTo(wallThickness, wallThickness + cornerRadius)
        bottomInnerPath.quadraticCurveTo(
            wallThickness,
            wallThickness,
            wallThickness + cornerRadius,
            wallThickness
        )

        const bottomExtrudeSettings = {
            steps: 1,
            depth: wallThickness,
            bevelEnabled: false,
        }

        const bottomGeometry = new THREE.ExtrudeGeometry(
            bottomShape,
            bottomExtrudeSettings
        )
        const bottomMesh = new THREE.Mesh(bottomGeometry, material)
        bottomMesh.castShadow = true
        bottomMesh.receiveShadow = true

        meshGroup.add(bottomMesh)
    } else {
        const outerBox = new THREE.Shape()
        outerBox.moveTo(cornerRadius, 0)
        outerBox.lineTo(width - cornerRadius, 0)
        outerBox.quadraticCurveTo(width, 0, width, cornerRadius)
        outerBox.lineTo(width, depth - cornerRadius)
        outerBox.quadraticCurveTo(width, depth, width - cornerRadius, depth)
        outerBox.lineTo(cornerRadius, depth)
        outerBox.quadraticCurveTo(0, depth, 0, depth - cornerRadius)
        outerBox.lineTo(0, cornerRadius)
        outerBox.quadraticCurveTo(0, 0, cornerRadius, 0)

        const innerBox = new THREE.Path()
        innerBox.moveTo(wallThickness + cornerRadius, wallThickness)
        innerBox.lineTo(width - wallThickness - cornerRadius, wallThickness)
        innerBox.quadraticCurveTo(
            width - wallThickness,
            wallThickness,
            width - wallThickness,
            wallThickness + cornerRadius
        )
        innerBox.lineTo(
            width - wallThickness,
            depth - wallThickness - cornerRadius
        )
        innerBox.quadraticCurveTo(
            width - wallThickness,
            depth - wallThickness,
            width - wallThickness - cornerRadius,
            depth - wallThickness
        )
        innerBox.lineTo(wallThickness + cornerRadius, depth - wallThickness)
        innerBox.quadraticCurveTo(
            wallThickness,
            depth - wallThickness,
            wallThickness,
            depth - wallThickness - cornerRadius
        )
        innerBox.lineTo(wallThickness, wallThickness + cornerRadius)
        innerBox.quadraticCurveTo(
            wallThickness,
            wallThickness,
            wallThickness + cornerRadius,
            wallThickness
        )

        outerBox.holes.push(innerBox)

        const extrudeSettings = {
            steps: 1,
            depth: height,
            bevelEnabled: false,
        }

        const geometry = new THREE.ExtrudeGeometry(outerBox, extrudeSettings)

        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.receiveShadow = true
    }

    if (excludeWalls.length > 0) {
        for (const wall of excludeWalls) {
            switch (wall.toLowerCase()) {
                case 'front':
                    // Create a wall for the full width (for subtraction)
                    const frontWall = new THREE.BoxGeometry(
                        width,
                        wallThickness + cornerRadius * 2,
                        height
                    )
                    frontWall.translate(width / 2, wallThickness, height / 2)
                    const frontWallMesh = new THREE.Mesh(frontWall)

                    for (let i = 0; i < meshGroup.children.length; i++) {
                        // Get the first mesh from the group (which should be the walls mesh)
                        const boxMesh = meshGroup.children[0]

                        // Perform CSG subtraction
                        const boxCSG = CSG.fromMesh(boxMesh)
                        const frontWallCSG = CSG.fromMesh(frontWallMesh)
                        const resultCSG = boxCSG.subtract(frontWallCSG)

                        // Convert back to mesh
                        const resultMesh = CSG.toMesh(
                            resultCSG,
                            boxMesh.matrix,
                            boxMesh.material
                        )
                        resultMesh.castShadow = true
                        resultMesh.receiveShadow = true

                        // Replace the old mesh with the new one
                        meshGroup.remove(boxMesh)
                        meshGroup.add(resultMesh)
                    }

                    // Add the straight wall for connections back in
                    if (hasBottom) {
                        const bottomShape = new THREE.BoxGeometry(
                            width,
                            wallThickness + cornerRadius * 2,
                            wallThickness
                        )
                        bottomShape.translate(
                            width / 2,
                            wallThickness / 2 + cornerRadius,
                            wallThickness / 2
                        )
                        const bottomMesh = new THREE.Mesh(bottomShape)
                        bottomMesh.castShadow = true
                        bottomMesh.receiveShadow = true
                        bottomMesh.material = material
                        meshGroup.add(bottomMesh)
                    }

                    if (!excludeWalls.includes('left')) {
                        // Add the left wall for connections back in
                        const leftShape = new THREE.BoxGeometry(
                            wallThickness,
                            wallThickness + cornerRadius * 2,
                            height
                        )
                        leftShape.translate(
                            wallThickness / 2,
                            wallThickness / 2 + cornerRadius,
                            height / 2
                        )
                        const leftMesh = new THREE.Mesh(leftShape)
                        leftMesh.castShadow = true
                        leftMesh.receiveShadow = true
                        leftMesh.material = material
                        meshGroup.add(leftMesh)
                    }

                    if (!excludeWalls.includes('right')) {
                        // Add the right wall for connections back in
                        const rightShape = new THREE.BoxGeometry(
                            wallThickness,
                            wallThickness + cornerRadius * 2,
                            height
                        )
                        rightShape.translate(
                            width - wallThickness / 2,
                            wallThickness / 2 + cornerRadius,
                            height / 2
                        )
                        const rightMesh = new THREE.Mesh(rightShape)
                        rightMesh.castShadow = true
                        rightMesh.receiveShadow = true
                        rightMesh.material = material
                        meshGroup.add(rightMesh)
                    }
                    break
                case 'back':
                    // Create a wall for the full width (for subtraction)
                    const backWall = new THREE.BoxGeometry(
                        width,
                        wallThickness + cornerRadius * 2,
                        height
                    )
                    backWall.translate(width / 2, depth - wallThickness, height / 2)
                    const backWallMesh = new THREE.Mesh(backWall)

                    for (let i = 0; i < meshGroup.children.length; i++) {
                        // Get the first mesh from the group (which should be the walls mesh)
                        const boxMesh = meshGroup.children[0]

                        // Perform CSG subtraction
                        const boxCSG = CSG.fromMesh(boxMesh)
                        const backWallCSG = CSG.fromMesh(backWallMesh)
                        const resultCSG = boxCSG.subtract(backWallCSG)

                        // Convert back to mesh
                        const resultMesh = CSG.toMesh(
                            resultCSG,
                            boxMesh.matrix,
                            boxMesh.material
                        )
                        resultMesh.castShadow = true
                        resultMesh.receiveShadow = true

                        // Replace the old mesh with the new one
                        meshGroup.remove(boxMesh)
                        meshGroup.add(resultMesh)
                    }

                    // Add the straight wall for connections back in
                    if (hasBottom) {
                        const bottomShape = new THREE.BoxGeometry(
                            width,
                            wallThickness + cornerRadius * 2,
                            wallThickness
                        )
                        bottomShape.translate(
                            width / 2,
                            depth - wallThickness / 2 - cornerRadius,
                            wallThickness / 2
                        )
                        const bottomMesh = new THREE.Mesh(bottomShape)
                        bottomMesh.castShadow = true
                        bottomMesh.receiveShadow = true
                        bottomMesh.material = material
                        meshGroup.add(bottomMesh)
                    }

                    if (!excludeWalls.includes('left')) {
                        // Add the left wall for connections back in
                        const leftShape = new THREE.BoxGeometry(
                            wallThickness,
                            wallThickness + cornerRadius * 2,
                            height
                        )
                        leftShape.translate(
                            wallThickness / 2,
                            depth - wallThickness / 2 - cornerRadius,
                            height / 2
                        )
                        const leftMesh = new THREE.Mesh(leftShape)
                        leftMesh.castShadow = true
                        leftMesh.receiveShadow = true
                        leftMesh.material = material
                        meshGroup.add(leftMesh)
                    }

                    if (!excludeWalls.includes('right')) {
                        // Add the right wall for connections back in
                        const rightShape = new THREE.BoxGeometry(
                            wallThickness,
                            wallThickness + cornerRadius * 2,
                            height
                        )
                        rightShape.translate(
                            width - wallThickness / 2,
                            depth - wallThickness / 2 - cornerRadius,
                            height / 2
                        )
                        const rightMesh = new THREE.Mesh(rightShape)
                        rightMesh.castShadow = true
                        rightMesh.receiveShadow = true
                        rightMesh.material = material
                        meshGroup.add(rightMesh)
                    }
                    break
                case 'left':
                    // Create a wall for the full width (for subtraction)
                    const leftWall = new THREE.BoxGeometry(
                        wallThickness + cornerRadius * 2,
                        width,
                        height
                    )
                    leftWall.translate(wallThickness, depth / 2, height / 2)
                    const leftWallMesh = new THREE.Mesh(leftWall)

                    for (let i = 0; i < meshGroup.children.length; i++) {
                        // Get the first mesh from the group (which should be the walls mesh)
                        const boxMesh = meshGroup.children[0]

                        // Perform CSG subtraction
                        const boxCSG = CSG.fromMesh(boxMesh)
                        const leftWallCSG = CSG.fromMesh(leftWallMesh)
                        const resultCSG = boxCSG.subtract(leftWallCSG)

                        // Convert back to mesh
                        const resultMesh = CSG.toMesh(
                            resultCSG,
                            boxMesh.matrix,
                            boxMesh.material
                        )
                        resultMesh.castShadow = true
                        resultMesh.receiveShadow = true

                        // Replace the old mesh with the new one
                        meshGroup.remove(boxMesh)
                        meshGroup.add(resultMesh)
                    }

                    // Add the straight wall for connections back in
                    if (hasBottom) {
                        const bottomShape = new THREE.BoxGeometry(
                            wallThickness + cornerRadius * 2,
                            width,
                            wallThickness
                        )
                        bottomShape.translate(
                            wallThickness / 2 + cornerRadius,
                            depth / 2,
                            wallThickness / 2
                        )
                        const bottomMesh = new THREE.Mesh(bottomShape)
                        bottomMesh.castShadow = true
                        bottomMesh.receiveShadow = true
                        bottomMesh.material = material
                        meshGroup.add(bottomMesh)
                    }

                    if (!excludeWalls.includes('back')) {
                        // Add the left wall for connections back in
                        const leftShape = new THREE.BoxGeometry(
                            wallThickness + cornerRadius * 2,
                            wallThickness,
                            height
                        )
                        leftShape.translate(
                            wallThickness / 2 + cornerRadius,
                            depth - wallThickness / 2,
                            height / 2
                        )
                        const leftMesh = new THREE.Mesh(leftShape)
                        leftMesh.castShadow = true
                        leftMesh.receiveShadow = true
                        leftMesh.material = material
                        meshGroup.add(leftMesh)
                    }

                    if (!excludeWalls.includes('front')) {
                        // Add the right wall for connections back in
                        const rightShape = new THREE.BoxGeometry(
                            wallThickness + cornerRadius * 2,
                            wallThickness,
                            height
                        )
                        rightShape.translate(
                            wallThickness / 2 + cornerRadius,
                            wallThickness / 2,
                            height / 2
                        )
                        const rightMesh = new THREE.Mesh(rightShape)
                        rightMesh.castShadow = true
                        rightMesh.receiveShadow = true
                        rightMesh.material = material
                        meshGroup.add(rightMesh)
                    }
                    break
                case 'right':
                    // Create a wall for the full width (for subtraction)
                    const rightWall = new THREE.BoxGeometry(
                        wallThickness + cornerRadius * 2,
                        width,
                        height
                    )
                    rightWall.translate(width, depth / 2, height / 2)
                    const rightWallMesh = new THREE.Mesh(rightWall)

                    for (let i = 0; i < meshGroup.children.length; i++) {
                        // Get the first mesh from the group (which should be the walls mesh)
                        const boxMesh = meshGroup.children[0]

                        // Perform CSG subtraction
                        const boxCSG = CSG.fromMesh(boxMesh)
                        const rightWallCSG = CSG.fromMesh(rightWallMesh)
                        const resultCSG = boxCSG.subtract(rightWallCSG)

                        // Convert back to mesh
                        const resultMesh = CSG.toMesh(
                            resultCSG,
                            boxMesh.matrix,
                            boxMesh.material
                        )
                        resultMesh.castShadow = true
                        resultMesh.receiveShadow = true

                        // Replace the old mesh with the new one
                        meshGroup.remove(boxMesh)
                        meshGroup.add(resultMesh)
                    }

                    // Add the straight wall for connections back in
                    if (hasBottom) {
                        const bottomShape = new THREE.BoxGeometry(
                            wallThickness + cornerRadius * 2,
                            width,
                            wallThickness
                        )
                        bottomShape.translate(
                            width - wallThickness / 2 - cornerRadius,
                            depth / 2,
                            wallThickness / 2
                        )
                        const bottomMesh = new THREE.Mesh(bottomShape)
                        bottomMesh.castShadow = true
                        bottomMesh.receiveShadow = true
                        bottomMesh.material = material
                        meshGroup.add(bottomMesh)
                    }

                    if (!excludeWalls.includes('back')) {
                        // Add the left wall for connections back in
                        const leftShape = new THREE.BoxGeometry(
                            wallThickness + cornerRadius * 2,
                            wallThickness,
                            height
                        )
                        leftShape.translate(
                            width - wallThickness / 2 - cornerRadius,
                            depth - wallThickness / 2,
                            height / 2
                        )
                        const leftMesh = new THREE.Mesh(leftShape)
                        leftMesh.castShadow = true
                        leftMesh.receiveShadow = true
                        leftMesh.material = material
                        meshGroup.add(leftMesh)
                    }

                    if (!excludeWalls.includes('front')) {
                        // Add the right wall for connections back in
                        const rightShape = new THREE.BoxGeometry(
                            wallThickness + cornerRadius * 2,
                            wallThickness,
                            height
                        )
                        rightShape.translate(
                            width - wallThickness / 2 - cornerRadius,
                            wallThickness / 2,
                            height / 2
                        )
                        const rightMesh = new THREE.Mesh(rightShape)
                        rightMesh.castShadow = true
                        rightMesh.receiveShadow = true
                        rightMesh.material = material
                        meshGroup.add(rightMesh)
                    }
                    break
            }
        }
    }

    // Position the mesh group
    meshGroup.rotation.x = -Math.PI / 2
    meshGroup.position.x = positionX
    meshGroup.position.z = positionZ

    return meshGroup
}
