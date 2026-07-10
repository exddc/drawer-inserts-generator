import type { SelectionId } from '@/lib/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Imperative renderer state for the route's single canvas instance. This
 * deliberately lives outside the app model and must not be shared by multiple
 * simultaneous renderers.
 */
export const renderRuntime = {
    containerRef: { current: null as HTMLDivElement | null },
    sceneRef: { current: null as THREE.Scene | null },
    cameraRef: { current: null as THREE.PerspectiveCamera | null },
    rendererRef: { current: null as THREE.WebGLRenderer | null },
    controlsRef: { current: null as OrbitControls | null },
    boxRef: { current: null as THREE.Group | null },
    helperGridRef: { current: null as THREE.GridHelper | null },
    boxMeshes: new Map<SelectionId, THREE.Group>(),
}

export function setRenderedBoxGroup(
    group: THREE.Group,
    selectedIds: SelectionId[],
    standardColor: number,
    selectedColor: number
): void {
    renderRuntime.boxRef.current = group
    renderRuntime.boxMeshes.clear()
    group.children.forEach((child) => {
        if (child instanceof THREE.Group) {
            renderRuntime.boxMeshes.set(child.name as SelectionId, child)
        }
    })
    applyRenderedBoxSelection(selectedIds, standardColor, selectedColor)
}

export function applyRenderedBoxSelection(
    selectedIds: SelectionId[],
    standardColor: number,
    selectedColor: number
): void {
    renderRuntime.boxMeshes.forEach((group) => {
        setMeshColor(group, standardColor)
    })
    selectedIds.forEach((id) => {
        const group = renderRuntime.boxMeshes.get(id)
        if (group) setMeshColor(group, selectedColor)
    })
}

function setMeshColor(group: THREE.Group, color: number): void {
    group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const materials = Array.isArray(child.material)
            ? child.material
            : [child.material]
        materials.forEach((material) => {
            if ('color' in material && material.color instanceof THREE.Color) {
                material.color.setHex(color)
            }
        })
    })
}
