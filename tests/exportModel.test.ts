import { buildExportAssembly, buildExportBoxMeshes } from '@/lib/exportModel'
import { createExportModelSnapshot, serializeStl } from '@/lib/exportUtils'
import { useStore } from '@/lib/store'
import { disposeObject } from '@/lib/threeDisposal'
import type { DrawerInsert, Grid } from '@/lib/types'
import * as THREE from 'three'
import { afterEach, describe, expect, it } from 'vitest'

const objectsToDispose: THREE.Object3D[] = []

afterEach(() => {
    objectsToDispose.splice(0).forEach(disposeObject)
})

describe('export model generation', () => {
    it('builds only printable domain geometry with no display helpers', () => {
        const assembly = track(buildExportAssembly(createModel()))
        const names = assembly.children.map((child) => child.name)
        const size = new THREE.Box3()
            .setFromObject(assembly)
            .getSize(new THREE.Vector3())

        expect(names).toEqual(['group:7', 'cell:0:1'])
        expect(size.y).toBeCloseTo(24)
        expect(
            assembly.getObjectsByProperty('name', 'corner-lines')
        ).toHaveLength(0)
        expect(assembly.children.every((child) => child.visible)).toBe(true)
    })

    it('positions separate meshes at a stable local origin in model order', () => {
        const entries = buildExportBoxMeshes(createModel())
        entries.forEach(({ mesh }) => track(mesh))

        expect(entries.map(({ metadata }) => metadata.id)).toEqual([
            'group:7',
            'cell:0:1',
        ])
        entries.forEach(({ mesh }) => {
            const bounds = new THREE.Box3().setFromObject(mesh)
            expect(bounds.min.x).toBeCloseTo(0)
            expect(bounds.min.y).toBeCloseTo(0)
            expect(bounds.min.z).toBeCloseTo(0)
        })
    })

    it('serializes deterministically despite display-state changes', () => {
        const grid = createGrid()
        useStore.setState({
            ...createModel(grid).config,
            grid,
            selectedBoxIds: ['group:7'],
            showHelperGrid: true,
            showCornerLines: true,
            cornerLineColor: 0xff0000,
            cornerLineOpacity: 1,
            standardColor: 0x123456,
            selectedColor: 0x654321,
        })
        const firstSnapshot = createExportModelSnapshot(useStore.getState())
        const firstAssembly = track(buildExportAssembly(firstSnapshot))
        const firstStl = serializeStl(firstAssembly)

        useStore.setState({
            showHelperGrid: false,
            showCornerLines: false,
            cornerLineColor: 0x00ff00,
            cornerLineOpacity: 0.1,
            standardColor: 0xffffff,
            selectedColor: 0x000000,
            selectedBoxIds: [],
        })
        const secondAssembly = track(
            buildExportAssembly(createExportModelSnapshot(useStore.getState()))
        )

        expect(serializeStl(secondAssembly)).toBe(firstStl)
    })

    it('does not inherit transforms or helpers from an existing scene', () => {
        const model = createModel()
        const expectedAssembly = track(buildExportAssembly(model))
        const expectedStl = serializeStl(expectedAssembly)
        const displayedAssembly = buildExportAssembly(model)
        const liveScene = track(new THREE.Scene())

        displayedAssembly.position.set(100, 200, 300)
        displayedAssembly.rotation.set(0.2, 0.4, 0.6)
        displayedAssembly.scale.setScalar(2)
        displayedAssembly.children[0].visible = false
        liveScene.add(
            new THREE.PerspectiveCamera(),
            new THREE.GridHelper(500, 50),
            displayedAssembly
        )

        const exportedAssembly = track(buildExportAssembly(model))

        expect(serializeStl(exportedAssembly)).toBe(expectedStl)
    })

    it('captures grid data instead of retaining mutable store cells', () => {
        const grid = createGrid()
        useStore.setState({ ...createModel(grid).config, grid })
        const snapshot = createExportModelSnapshot(useStore.getState())

        grid[1][1].width = 999
        grid[1][1].visibility = 'hidden'

        expect(snapshot.grid[1][1]).toMatchObject({
            width: 40,
            visibility: 'visible',
        })
    })
})

function createGrid(): Grid {
    return [
        [
            {
                group: 0,
                width: 20,
                depth: 30,
                visibility: 'hidden',
            },
            {
                group: 0,
                width: 40,
                depth: 30,
                visibility: 'hidden',
            },
        ],
        [
            {
                group: 0,
                width: 20,
                depth: 50,
                visibility: 'visible',
            },
            {
                group: 7,
                width: 40,
                depth: 50,
                visibility: 'visible',
            },
        ],
    ]
}

function createModel(grid = createGrid()): DrawerInsert {
    return {
        config: {
            totalWidth: 60,
            totalDepth: 80,
            wallThickness: 2,
            cornerRadius: 4,
            wallHeight: 24,
            generateBottom: true,
            maxBoxWidth: 40,
            maxBoxDepth: 50,
        },
        grid,
        selectedBoxIds: [],
    }
}

function track<T extends THREE.Object3D>(object: T): T {
    objectsToDispose.push(object)
    return object
}
