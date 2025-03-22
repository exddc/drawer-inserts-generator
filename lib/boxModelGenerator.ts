import { BoxParameters } from '@/lib/types'
import * as THREE from 'three'

/**
 * Create a box with rounded edges and optional bottom
 */
export function createBoxWithRoundedEdges({
    width,
    depth,
    height,
    wallThickness,
    cornerRadius,
    hasBottom,
    isSelected = false,
    boxColor,
    highlightColor,
}: BoxParameters): THREE.Mesh | THREE.Group {
    const meshGroup = new THREE.Group()

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

        const defaultColor = 0x7a9cbf
        const materialColor = isSelected
            ? highlightColor || 0xf59e0b
            : boxColor || defaultColor

        const material = new THREE.MeshStandardMaterial({
            color: materialColor,
            roughness: 0.4,
            metalness: 0.2,
        })

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

        meshGroup.rotation.x = -Math.PI / 2

        return meshGroup
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

        const defaultColor = 0x7a9cbf
        const materialColor = isSelected
            ? highlightColor || 0xf59e0b
            : boxColor || defaultColor

        const material = new THREE.MeshStandardMaterial({
            color: materialColor,
            roughness: 0.4,
            metalness: 0.2,
        })

        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.receiveShadow = true

        mesh.rotation.x = -Math.PI / 2

        return mesh
    }
}
