import { generateCustomBox } from '@/lib/boxHelper'
import { pickCurrentBox } from '@/lib/boxPicking'
import { getGridBoxes } from '@/lib/gridVisibility'
import { renderRuntime, setRenderedBoxGroup } from '@/lib/renderRuntime'
import { useStore } from '@/lib/store'
import type { Grid } from '@/lib/types'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

const standardColor = 0xcccccc
const selectedColor = 0xff5500

describe('renderer projections', () => {
    afterEach(() => {
        renderRuntime.cameraRef.current = null
        renderRuntime.boxRef.current = null
        renderRuntime.boxMeshes.clear()
        useStore.setState({ selectedBoxIds: [] })
        vi.restoreAllMocks()
    })

    it('reapplies selected IDs when geometry settings replace the mesh tree', () => {
        const grid: Grid = [[{ group: 1, width: 30, depth: 20 }]]
        useStore.setState({
            grid,
            selectedBoxIds: ['group:1'],
            wallHeight: 30,
            showCornerLines: false,
        })

        const initial = generateCustomBox(grid, 2, 4, true)
        setRenderedBoxGroup(
            initial,
            useStore.getState().selectedBoxIds,
            standardColor,
            selectedColor
        )

        const rebuilt = generateCustomBox(grid, 3, 6, false)
        setRenderedBoxGroup(
            rebuilt,
            useStore.getState().selectedBoxIds,
            standardColor,
            selectedColor
        )

        expect(renderRuntime.boxRef.current).toBe(rebuilt)
        expect(meshColors(rebuilt.children[0])).toEqual([selectedColor])
        expect(useStore.getState().selectedBoxIds).toEqual(['group:1'])
        expect(
            getGridBoxes(grid, 30).filter((box) =>
                useStore.getState().selectedBoxIds.includes(box.id)
            )
        ).toMatchObject([{ id: 'group:1', group: 1 }])
    })

    it('raycasts the current camera and box tree after a replacement', () => {
        const oldGroup = selectableGroup('cell:0:0')
        const currentGroup = selectableGroup('cell:1:0')
        const oldCamera = new THREE.PerspectiveCamera()
        const currentCamera = new THREE.PerspectiveCamera()
        renderRuntime.cameraRef.current = oldCamera
        setRenderedBoxGroup(oldGroup, [], standardColor, selectedColor)

        renderRuntime.cameraRef.current = currentCamera
        setRenderedBoxGroup(currentGroup, [], standardColor, selectedColor)

        const raycaster = new THREE.Raycaster()
        const setFromCamera = vi
            .spyOn(raycaster, 'setFromCamera')
            .mockImplementation(() => undefined)
        const intersectObjects = vi
            .spyOn(raycaster, 'intersectObjects')
            .mockReturnValue([
                {
                    object: currentGroup.children[0].children[0],
                } as THREE.Intersection,
            ])

        expect(pickCurrentBox(raycaster, new THREE.Vector2())).toBe('cell:1:0')
        expect(setFromCamera).toHaveBeenCalledWith(
            expect.any(THREE.Vector2),
            currentCamera
        )
        expect(intersectObjects).toHaveBeenCalledWith(
            currentGroup.children,
            true
        )
        expect(intersectObjects).not.toHaveBeenCalledWith(
            oldGroup.children,
            true
        )
    })
})

function selectableGroup(id: 'cell:0:0' | 'cell:1:0'): THREE.Group {
    const root = new THREE.Group()
    const box = new THREE.Group()
    box.name = id
    box.add(
        new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial()
        )
    )
    root.add(box)
    return root
}

function meshColors(object: THREE.Object3D): number[] {
    const colors = new Set<number>()
    object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const materials = Array.isArray(child.material)
            ? child.material
            : [child.material]
        materials.forEach((material) => {
            if ('color' in material && material.color instanceof THREE.Color) {
                colors.add(material.color.getHex())
            }
        })
    })
    return [...colors]
}
