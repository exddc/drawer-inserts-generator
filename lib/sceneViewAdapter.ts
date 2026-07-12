import { cameraSettings } from '@/lib/defaults'
import { disposeObject } from '@/lib/threeDisposal'
import type { SelectionId } from '@/lib/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface SceneViewEnvironment {
    createRenderer: () => THREE.WebGLRenderer
    createControls: (
        camera: THREE.PerspectiveCamera,
        canvas: HTMLCanvasElement
    ) => OrbitControls
    createRaycaster: () => THREE.Raycaster
    devicePixelRatio: number
    requestFrame: (callback: FrameRequestCallback) => number
    cancelFrame: (frameId: number) => void
    addResizeListener: (listener: EventListener) => void
    removeResizeListener: (listener: EventListener) => void
}

export interface ScenePointerSelection {
    boxId: SelectionId
    multiSelect: boolean
}

export type ScenePointerHandler = (selection: ScenePointerSelection) => void

const browserEnvironment = (): SceneViewEnvironment => ({
    createRenderer: () => new THREE.WebGLRenderer({ antialias: true }),
    createControls: (camera, canvas) => new OrbitControls(camera, canvas),
    createRaycaster: () => new THREE.Raycaster(),
    devicePixelRatio: window.devicePixelRatio,
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
    addResizeListener: (listener) =>
        window.addEventListener('resize', listener),
    removeResizeListener: (listener) =>
        window.removeEventListener('resize', listener),
})

export class SceneViewAdapter {
    readonly scene: THREE.Scene
    readonly camera: THREE.PerspectiveCamera
    readonly renderer: THREE.WebGLRenderer
    readonly controls: OrbitControls

    private readonly raycaster: THREE.Raycaster
    private readonly boxMeshes = new Map<SelectionId, THREE.Group>()
    private readonly environment: SceneViewEnvironment
    private readonly onPointerSelection: ScenePointerHandler
    private boxGroup: THREE.Group | null = null
    private helperGrid: THREE.GridHelper | null = null
    private frameId: number | null = null
    private disposed = false

    constructor(
        private readonly container: HTMLDivElement,
        onPointerSelection: ScenePointerHandler,
        environment: SceneViewEnvironment = browserEnvironment()
    ) {
        this.environment = environment
        this.onPointerSelection = onPointerSelection

        const width = container.clientWidth
        const height = container.clientHeight
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0xffffff)

        this.camera = new THREE.PerspectiveCamera(
            cameraSettings.fov,
            width / height,
            cameraSettings.near,
            cameraSettings.far
        )
        this.camera.position.set(
            cameraSettings.position.x,
            cameraSettings.position.y,
            cameraSettings.position.z
        )
        this.camera.lookAt(this.scene.position)

        this.renderer = environment.createRenderer()
        this.renderer.setPixelRatio(environment.devicePixelRatio)
        this.renderer.setSize(width, height)
        container.appendChild(this.renderer.domElement)

        this.controls = environment.createControls(
            this.camera,
            this.renderer.domElement
        )
        this.controls.enableDamping = true
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
        }
        this.raycaster = environment.createRaycaster()

        this.addLights()
        this.renderer.shadowMap.enabled = true
        environment.addResizeListener(this.handleResize)
        this.renderer.domElement.addEventListener(
            'pointerdown',
            this.handlePointerDown
        )
        this.animate()
    }

    pickBoxAtClientPoint(clientX: number, clientY: number): SelectionId | null {
        if (this.disposed || !this.boxGroup) return null

        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return null

        const pointer = clientPointToPointer(clientX, clientY, rect)
        this.raycaster.setFromCamera(pointer, this.camera)
        const hit = this.raycaster
            .intersectObjects(this.boxGroup.children, true)
            .find(({ object }) => {
                const parent = object.parent
                return (
                    object instanceof THREE.Mesh &&
                    parent instanceof THREE.Group &&
                    this.boxMeshes.has(parent.name as SelectionId)
                )
            })

        return (hit?.object.parent?.name as SelectionId | undefined) ?? null
    }

    resetCamera(): void {
        if (this.disposed) return

        this.camera.position.set(
            cameraSettings.position.x,
            cameraSettings.position.y,
            cameraSettings.position.z
        )
        this.camera.up.set(0, 1, 0)
        this.controls.target.set(0, 0, 0)
        this.controls.update()
    }

    setTopView(): void {
        if (this.disposed) return

        const distance = this.camera.position.length()
        this.camera.position.set(0, distance, 0)
        this.camera.up.set(0, 1, 0)
        this.controls.target.set(0, 0, 0)
        this.controls.update()
    }

    replaceBox(
        box: THREE.Group,
        selectedIds: SelectionId[],
        standardColor: number,
        selectedColor: number
    ): void {
        if (this.disposed) {
            disposeObject(box)
            return
        }

        if (this.boxGroup) {
            removeAndDisposeObject(this.scene, this.boxGroup)
        }

        this.boxGroup = box
        this.boxMeshes.clear()
        box.children.forEach((child) => {
            if (child instanceof THREE.Group) {
                this.boxMeshes.set(child.name as SelectionId, child)
            }
        })
        this.applySelection(selectedIds, standardColor, selectedColor)
        this.scene.add(box)
    }

    applySelection(
        selectedIds: SelectionId[],
        standardColor: number,
        selectedColor: number
    ): void {
        if (this.disposed) return

        this.boxMeshes.forEach((group) => setMeshColor(group, standardColor))
        selectedIds.forEach((id) => {
            const group = this.boxMeshes.get(id)
            if (group) setMeshColor(group, selectedColor)
        })
    }

    replaceHelperGrid(grid: THREE.GridHelper | null): void {
        if (this.disposed) {
            if (grid) disposeObject(grid)
            return
        }

        if (this.helperGrid) {
            removeAndDisposeObject(this.scene, this.helperGrid)
        }
        this.helperGrid = grid
        if (grid) this.scene.add(grid)
    }

    dispose(): void {
        if (this.disposed) return
        this.disposed = true

        if (this.frameId !== null) {
            this.environment.cancelFrame(this.frameId)
            this.frameId = null
        }
        this.environment.removeResizeListener(this.handleResize)
        this.renderer.domElement.removeEventListener(
            'pointerdown',
            this.handlePointerDown
        )
        disposeObject(this.scene)
        this.scene.clear()
        this.controls.dispose()
        this.renderer.dispose()
        this.renderer.forceContextLoss()
        this.renderer.domElement.remove()
        this.boxGroup = null
        this.helperGrid = null
        this.boxMeshes.clear()
    }

    private readonly animate = () => {
        if (this.disposed) return
        this.controls.update()
        this.renderer.render(this.scene, this.camera)
        this.frameId = this.environment.requestFrame(this.animate)
    }

    private readonly handleResize: EventListener = () => {
        if (this.disposed) return

        const width = this.container.clientWidth
        const height = this.container.clientHeight
        if (width === 0 || height === 0) return

        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(width, height)
    }

    private readonly handlePointerDown: EventListener = (event) => {
        const pointerEvent = event as PointerEvent
        if (pointerEvent.button !== 0) return

        const boxId = this.pickBoxAtClientPoint(
            pointerEvent.clientX,
            pointerEvent.clientY
        )
        if (!boxId) return

        this.onPointerSelection({
            boxId,
            multiSelect: pointerEvent.metaKey || pointerEvent.ctrlKey,
        })
    }

    private addLights(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        this.scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(150, 200, 100)
        directionalLight.castShadow = true
        this.scene.add(directionalLight)

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.2)
        fillLight.position.set(-150, 500, -100)
        fillLight.castShadow = true
        this.scene.add(fillLight)
    }
}

export function clientPointToPointer(
    clientX: number,
    clientY: number,
    rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
): THREE.Vector2 {
    return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
    )
}

function removeAndDisposeObject(
    scene: THREE.Scene,
    object: THREE.Object3D
): void {
    scene.remove(object)
    disposeObject(object)
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
