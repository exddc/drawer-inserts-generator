import { renderRuntime } from '@/lib/renderRuntime'
import type { SelectionId } from '@/lib/types'
import * as THREE from 'three'

export function pickCurrentBox(
    raycaster: THREE.Raycaster,
    pointer: THREE.Vector2
): SelectionId | null {
    const camera = renderRuntime.cameraRef.current
    const boxGroup = renderRuntime.boxRef.current
    if (!camera || !boxGroup) return null

    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster
        .intersectObjects(boxGroup.children, true)
        .find(({ object }) => {
            const parent = object.parent
            return (
                parent instanceof THREE.Group &&
                renderRuntime.boxMeshes.has(parent.name as SelectionId)
            )
        })

    return (hit?.object.parent?.name as SelectionId | undefined) ?? null
}
