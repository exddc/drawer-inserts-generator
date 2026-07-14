import * as THREE from 'three'

export function disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
        const disposable = child as THREE.Object3D & {
            geometry?: THREE.BufferGeometry
            material?: THREE.Material | THREE.Material[]
        }

        disposable.geometry?.dispose()
        if (disposable.material) disposeMaterial(disposable.material)
    })
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose())
        return
    }
    material.dispose()
}
