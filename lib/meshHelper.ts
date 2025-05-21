import { material } from '@/lib/defaults'
import { useStore } from '@/lib/store'
import * as THREE from 'three'

export function buildWallMesh(
    outerPts: THREE.Vector2[],
    innerPts: THREE.Vector2[]
): THREE.Mesh {
    const wallHeight = useStore.getState().wallHeight
    const shape = new THREE.Shape()
    if (outerPts.length) {
        shape.moveTo(outerPts[0].x, outerPts[0].y)
        outerPts.slice(1).forEach((pt) => shape.lineTo(pt.x, pt.y))
        shape.closePath()
    }

    if (innerPts.length) {
        const hole = new THREE.Path()
        hole.moveTo(innerPts[0].x, innerPts[0].y)
        innerPts.slice(1).forEach((pt) => hole.lineTo(pt.x, pt.y))
        hole.closePath()
        shape.holes.push(hole)
    }

    const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallHeight,
        bevelEnabled: false,
    })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, wallHeight, 0)

    const mat = new THREE.MeshStandardMaterial({
        color: material.standard.color,
        roughness: material.standard.roughness,
        metalness: material.standard.metalness,
        side: THREE.DoubleSide,
    })
    return new THREE.Mesh(geo, mat)
}

export function buildBottomMesh(
    outerPts: THREE.Vector2[],
    thickness: number
): THREE.Mesh {
    const shape = new THREE.Shape()
    shape.moveTo(outerPts[0].x, outerPts[0].y)
    outerPts.slice(1).forEach((pt) => shape.lineTo(pt.x, pt.y))
    shape.closePath()

    const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: thickness,
        bevelEnabled: false,
    })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, thickness, 0)

    const mat = new THREE.MeshStandardMaterial({
        color: material.standard.color,
        roughness: material.standard.roughness,
        metalness: material.standard.metalness,
        side: THREE.DoubleSide,
    })
    return new THREE.Mesh(geo, mat)
}
