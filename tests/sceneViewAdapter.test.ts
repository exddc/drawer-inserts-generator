import {
    SceneViewAdapter,
    type ScenePointerHandler,
    type SceneViewEnvironment,
} from '@/lib/sceneViewAdapter'
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { describe, expect, it, vi } from 'vitest'

const standardColor = 0xcccccc
const selectedColor = 0xff5500

describe('SceneViewAdapter', () => {
    it('converts client coordinates relative to its own renderer canvas', () => {
        const harness = createHarness({
            rect: { left: 100, top: 50, width: 400, height: 200 },
        })
        const group = selectableGroup('cell:0:0')
        harness.intersections.push({
            object: group.children[0].children[0],
        } as THREE.Intersection)
        harness.adapter.replaceBox(group, [], standardColor, selectedColor)

        expect(harness.adapter.pickBoxAtClientPoint(300, 100)).toBe('cell:0:0')
        expect(harness.raycaster.setFromCamera).toHaveBeenCalledWith(
            expect.objectContaining({ x: 0, y: 0.5 }),
            harness.adapter.camera
        )
    })

    it('keeps camera commands and cleanup isolated between adapters', () => {
        const first = createHarness()
        const second = createHarness()
        first.adapter.camera.position.set(9, 8, 7)
        second.adapter.camera.position.set(90, 80, 70)

        first.adapter.resetCamera()
        expect(first.adapter.camera.position.toArray()).toEqual([100, 100, 100])
        expect(second.adapter.camera.position.toArray()).toEqual([90, 80, 70])

        first.adapter.setTopView()
        expect(first.adapter.camera.position.x).toBe(0)
        expect(first.adapter.camera.position.z).toBe(0)
        expect(first.adapter.camera.position.y).toBeCloseTo(Math.sqrt(30000))

        first.adapter.dispose()
        second.adapter.resetCamera()
        expect(second.adapter.camera.position.toArray()).toEqual([
            100, 100, 100,
        ])
        expect(second.renderer.dispose).not.toHaveBeenCalled()
    })

    it('registers one pointer/resize handler and removes both on dispose', () => {
        const onPointerSelection = vi.fn<ScenePointerHandler>()
        const harness = createHarness({ onPointerSelection })
        const group = selectableGroup('cell:0:0')
        harness.intersections.push({
            object: group.children[0].children[0],
        } as THREE.Intersection)
        harness.adapter.replaceBox(group, [], standardColor, selectedColor)

        const event = Object.assign(new Event('pointerdown'), {
            button: 0,
            clientX: 25,
            clientY: 25,
            metaKey: true,
            ctrlKey: false,
        })
        harness.canvas.dispatchEvent(event)

        expect(onPointerSelection).toHaveBeenCalledWith({
            boxId: 'cell:0:0',
            multiSelect: true,
        })
        expect(harness.canvasAddEventListener).toHaveBeenCalledTimes(1)
        expect(harness.environment.addResizeListener).toHaveBeenCalledTimes(1)

        harness.adapter.dispose()
        harness.adapter.dispose()

        expect(harness.canvasRemoveEventListener).toHaveBeenCalledTimes(1)
        expect(harness.environment.removeResizeListener).toHaveBeenCalledTimes(
            1
        )
    })

    it('disposes GPU resources and remounts without stale picking state', () => {
        const first = createHarness()
        const oldGroup = selectableGroup('cell:0:0')
        const oldMesh = oldGroup.children[0].children[0] as THREE.Mesh
        const geometryDispose = vi.spyOn(oldMesh.geometry, 'dispose')
        const materialDispose = vi.spyOn(
            oldMesh.material as THREE.Material,
            'dispose'
        )
        first.intersections.push({
            object: oldMesh,
        } as unknown as THREE.Intersection)
        first.adapter.replaceBox(oldGroup, [], standardColor, selectedColor)
        expect(first.adapter.pickBoxAtClientPoint(10, 10)).toBe('cell:0:0')

        first.adapter.dispose()
        expect(geometryDispose).toHaveBeenCalledOnce()
        expect(materialDispose).toHaveBeenCalledOnce()
        expect(first.controls.dispose).toHaveBeenCalledOnce()
        expect(first.renderer.dispose).toHaveBeenCalledOnce()
        expect(first.renderer.forceContextLoss).toHaveBeenCalledOnce()
        expect(first.canvas.remove).toHaveBeenCalledOnce()

        const second = createHarness()
        const currentGroup = selectableGroup('cell:1:0')
        second.intersections.push({
            object: currentGroup.children[0].children[0],
        } as THREE.Intersection)
        second.adapter.replaceBox(
            currentGroup,
            [],
            standardColor,
            selectedColor
        )

        expect(second.adapter.pickBoxAtClientPoint(10, 10)).toBe('cell:1:0')
        expect(first.raycaster.intersectObjects).toHaveBeenCalledTimes(1)
        expect(second.raycaster.intersectObjects).toHaveBeenCalledTimes(1)
    })

    it('reapplies selection colors when replacing the box tree', () => {
        const harness = createHarness()
        const initial = selectableGroup('cell:0:0')
        const replacement = selectableGroup('cell:1:0')

        harness.adapter.replaceBox(
            initial,
            ['cell:0:0'],
            standardColor,
            selectedColor
        )
        harness.adapter.replaceBox(
            replacement,
            ['cell:1:0'],
            standardColor,
            selectedColor
        )

        expect(meshColors(replacement)).toEqual([selectedColor])
    })
})

interface HarnessOptions {
    rect?: { left: number; top: number; width: number; height: number }
    onPointerSelection?: ScenePointerHandler
}

function createHarness(options: HarnessOptions = {}) {
    const canvas = Object.assign(new EventTarget(), {
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 100,
            height: 100,
            ...options.rect,
        }),
        remove: vi.fn(),
    }) as unknown as HTMLCanvasElement
    const canvasAddEventListener = vi.spyOn(canvas, 'addEventListener')
    const canvasRemoveEventListener = vi.spyOn(canvas, 'removeEventListener')
    const renderer = {
        domElement: canvas,
        shadowMap: { enabled: false },
        setPixelRatio: vi.fn(),
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
        forceContextLoss: vi.fn(),
    } as unknown as THREE.WebGLRenderer
    const controls = {
        enableDamping: false,
        mouseButtons: {},
        target: new THREE.Vector3(),
        update: vi.fn(),
        dispose: vi.fn(),
    } as unknown as OrbitControls
    const intersections: THREE.Intersection[] = []
    const raycaster = {
        setFromCamera: vi.fn(),
        intersectObjects: vi.fn(() => intersections),
    } as unknown as THREE.Raycaster
    const environment: SceneViewEnvironment = {
        createRenderer: vi.fn(() => renderer),
        createControls: vi.fn(() => controls),
        createRaycaster: vi.fn(() => raycaster),
        devicePixelRatio: 2,
        requestFrame: vi.fn(() => 42),
        cancelFrame: vi.fn(),
        addResizeListener: vi.fn(),
        removeResizeListener: vi.fn(),
    }
    const container = {
        clientWidth: 640,
        clientHeight: 480,
        appendChild: vi.fn(),
    } as unknown as HTMLDivElement
    const adapter = new SceneViewAdapter(
        container,
        options.onPointerSelection ?? vi.fn(),
        environment
    )

    return {
        adapter,
        canvas,
        canvasAddEventListener,
        canvasRemoveEventListener,
        controls,
        environment,
        intersections,
        raycaster: raycaster as THREE.Raycaster & {
            setFromCamera: ReturnType<typeof vi.fn>
            intersectObjects: ReturnType<typeof vi.fn>
        },
        renderer: renderer as THREE.WebGLRenderer & {
            dispose: ReturnType<typeof vi.fn>
            forceContextLoss: ReturnType<typeof vi.fn>
        },
    }
}

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
