'use client'

import ActionsBar from '@/components/ActionsBar'
import BoxContextMenu from '@/components/BoxContextMenu'
import HiddenBoxesDisplay from '@/components/HiddenBoxesDisplay'
import { generateCustomBox } from '@/lib/boxHelper'
import { pickCurrentBox } from '@/lib/boxPicking'
import { cameraSettings } from '@/lib/defaults'
import { combineGridBoxes, getNextAvailableGroupId } from '@/lib/gridCombine'
import { gridMatchesLayout, resizeGrid } from '@/lib/gridHelper'
import {
    getBoxById,
    getGridBoxes,
    isGridBoxVisible,
    setGridBoxVisible,
} from '@/lib/gridVisibility'
import {
    applyRenderedBoxSelection,
    renderRuntime,
    setRenderedBoxGroup,
} from '@/lib/renderRuntime'
import { useStore } from '@/lib/store'
import type { Grid } from '@/lib/types'
import { useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function Home() {
    const state = useStore()

    useEffect(() => {
        const container = renderRuntime.containerRef.current
        if (!container) return

        function initBasics(container: HTMLDivElement) {
            const width = container.clientWidth
            const height = container.clientHeight
            const scene = new THREE.Scene()
            scene.background = new THREE.Color(0xffffff)

            const camera = new THREE.PerspectiveCamera(
                cameraSettings.fov,
                width / height,
                cameraSettings.near,
                cameraSettings.far
            )
            camera.position.set(
                cameraSettings.position.x,
                cameraSettings.position.y,
                cameraSettings.position.z
            )
            camera.lookAt(scene.position)

            const renderer = new THREE.WebGLRenderer({ antialias: true })
            renderer.setPixelRatio(window.devicePixelRatio)
            renderer.setSize(width, height)
            container.appendChild(renderer.domElement)

            return { scene, camera, renderer }
        }

        const { scene, camera, renderer } = initBasics(container)
        renderRuntime.sceneRef.current = scene
        renderRuntime.cameraRef.current = camera
        renderRuntime.rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        renderRuntime.controlsRef.current = controls
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
        }

        // lights + grid
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(150, 200, 100)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2)
        directionalLight2.position.set(-150, 500, -100)
        directionalLight2.castShadow = true
        scene.add(directionalLight2)

        renderer.shadowMap.enabled = true

        // resize handler
        const onWindowResize = () => {
            if (
                !renderRuntime.cameraRef.current ||
                !renderRuntime.rendererRef.current
            )
                return
            renderRuntime.cameraRef.current.aspect =
                window.innerWidth / window.innerHeight
            renderRuntime.cameraRef.current.updateProjectionMatrix()
            renderRuntime.rendererRef.current.setSize(
                window.innerWidth,
                window.innerHeight
            )
        }
        window.addEventListener('resize', onWindowResize)

        // animation loop
        let frameId: number
        const animate = () => {
            controls.update()
            renderer.render(scene, camera)
            frameId = requestAnimationFrame(animate)
        }
        animate()

        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        window.addEventListener('keydown', onKeyDown)

        function onKeyDown(event: KeyboardEvent) {
            const currentState = useStore.getState()

            if (event.key === 'Escape') {
                currentState.setSelectedBoxIds([])
            }
            if (event.key === 'c') {
                onCombineClick()
            }
            if (event.key === 's') {
                onSplitClick()
            }
            if (event.key === 'h') {
                onHideClick()
            }
        }

        function rebuildBoxFromCurrentState() {
            const currentState = useStore.getState()
            const scene = renderRuntime.sceneRef.current
            const currentBox = renderRuntime.boxRef.current
            if (!scene || !currentBox) return

            removeAndDisposeObject(scene, currentBox)
            const newBox = generateCustomBox(currentState.grid, {
                wallThickness: currentState.wallThickness,
                cornerRadius: currentState.cornerRadius,
                wallHeight: currentState.wallHeight,
                generateBottom: currentState.generateBottom,
                cornerLines: {
                    show: currentState.showCornerLines,
                    color: currentState.cornerLineColor,
                    opacity: currentState.cornerLineOpacity,
                },
            })
            setRenderedBoxGroup(
                newBox,
                currentState.selectedBoxIds,
                currentState.standardColor,
                currentState.selectedColor
            )
            newBox.position.set(
                -currentState.totalWidth / 2,
                0,
                -currentState.totalDepth / 2
            )
            scene.add(newBox)
        }

        function onCombineClick() {
            const currentState = useStore.getState()
            const boxesToCombine = getGridBoxes(
                currentState.grid,
                currentState.wallHeight
            ).filter((box) => currentState.selectedBoxIds.includes(box.id))
            if (boxesToCombine.length < 2) return
            const currentBox = renderRuntime.boxRef.current
            if (!currentBox) return

            const grid = cloneGrid(currentState.grid)
            const newId = getNextAvailableGroupId(grid)
            if (!combineGridBoxes(grid, boxesToCombine, newId)) return

            currentState.setGrid(grid)
            rebuildBoxFromCurrentState()
            currentState.setSelectedBoxIds([])
        }

        function onSplitClick() {
            const currentState = useStore.getState()
            const boxesToSplit = currentState.selectedBoxIds
                .map((id) => getBoxById(currentState.grid, id))
                .filter((box) => box !== undefined)
            if (boxesToSplit.length === 0) return

            const grid = cloneGrid(currentState.grid)
            boxesToSplit.forEach((box) => {
                box.cells.forEach(({ x, z }) => {
                    grid[z][x].group = 0
                })
            })

            currentState.setGrid(grid)
            rebuildBoxFromCurrentState()
            currentState.setSelectedBoxIds([])
        }

        function onHideClick() {
            const currentState = useStore.getState()
            const boxesToHide = currentState.selectedBoxIds
                .map((id) => getBoxById(currentState.grid, id))
                .filter((box) => box !== undefined)
            if (boxesToHide.length === 0) return

            const grid = cloneGrid(currentState.grid)

            boxesToHide.forEach((box) => {
                setGridBoxVisible(grid, box, !isGridBoxVisible(grid, box))
            })

            currentState.setGrid(grid)
            rebuildBoxFromCurrentState()
            currentState.setSelectedBoxIds([])
        }

        function onPointerDown(event: MouseEvent) {
            if (event.button !== 0) return // only left mouse button

            const isMultiSelect = event.metaKey || event.ctrlKey

            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
            const boxId = pickCurrentBox(raycaster, mouse)
            if (!boxId) return

            const selectedBoxIds = isMultiSelect
                ? [...useStore.getState().selectedBoxIds]
                : []

            const i = selectedBoxIds.indexOf(boxId)
            if (i !== -1) {
                selectedBoxIds.splice(i, 1)
            } else {
                selectedBoxIds.push(boxId)
            }
            useStore.getState().setSelectedBoxIds(selectedBoxIds)
        }

        renderer.domElement.addEventListener('pointerdown', onPointerDown)

        return () => {
            cancelAnimationFrame(frameId)
            window.removeEventListener('resize', onWindowResize)
            window.removeEventListener('keydown', onKeyDown)
            renderer.domElement.removeEventListener(
                'pointerdown',
                onPointerDown
            )
            disposeObject(scene)
            scene.clear()
            controls.dispose()
            renderer.dispose()
            renderer.forceContextLoss()
            renderer.domElement.remove()
            renderRuntime.sceneRef.current = null
            renderRuntime.cameraRef.current = null
            renderRuntime.rendererRef.current = null
            renderRuntime.controlsRef.current = null
            renderRuntime.boxRef.current = null
            renderRuntime.helperGridRef.current = null
            renderRuntime.boxMeshes.clear()
        }
    }, [])

    useEffect(() => {
        applyRenderedBoxSelection(
            state.selectedBoxIds,
            state.standardColor,
            state.selectedColor
        )
    }, [state.selectedBoxIds, state.standardColor, state.selectedColor])

    const {
        grid: modelGrid,
        totalWidth,
        totalDepth,
        maxBoxWidth,
        maxBoxDepth,
        wallThickness,
        cornerRadius,
        generateBottom,
        wallHeight,
        redrawTrigger,
        showCornerLines,
        cornerLineColor,
        cornerLineOpacity,
        setGrid,
    } = state

    useEffect(() => {
        const scene = renderRuntime.sceneRef.current
        if (!scene) return

        if (renderRuntime.boxRef.current) {
            removeAndDisposeObject(scene, renderRuntime.boxRef.current)
            renderRuntime.boxRef.current = null
        }

        const old = modelGrid
        let grid = old
        if (
            !gridMatchesLayout(
                old,
                totalWidth,
                totalDepth,
                maxBoxWidth,
                maxBoxDepth
            )
        ) {
            grid = resizeGrid(
                old,
                totalWidth,
                totalDepth,
                maxBoxWidth,
                maxBoxDepth
            )
            setGrid(grid)
        }

        const box = generateCustomBox(grid, {
            wallThickness,
            cornerRadius,
            wallHeight,
            generateBottom,
            cornerLines: {
                show: showCornerLines,
                color: cornerLineColor,
                opacity: cornerLineOpacity,
            },
        })
        const currentState = useStore.getState()
        setRenderedBoxGroup(
            box,
            currentState.selectedBoxIds,
            currentState.standardColor,
            currentState.selectedColor
        )
        box.position.set(-totalWidth / 2, 0, -totalDepth / 2)
        scene.add(box)
    }, [
        wallThickness,
        cornerRadius,
        wallHeight,
        generateBottom,
        totalWidth,
        totalDepth,
        maxBoxWidth,
        maxBoxDepth,
        modelGrid,
        redrawTrigger,
        showCornerLines,
        cornerLineColor,
        cornerLineOpacity,
        setGrid,
    ])

    useEffect(() => {
        const scene = renderRuntime.sceneRef.current
        if (!scene) return

        const size = Math.max(state.totalWidth, state.totalDepth) + 50
        const divisions = Math.ceil(size / 10)

        if (renderRuntime.helperGridRef.current) {
            removeAndDisposeObject(scene, renderRuntime.helperGridRef.current)
        }

        if (state.showHelperGrid) {
            const grid = new THREE.GridHelper(size, divisions)
            renderRuntime.helperGridRef.current = grid
            scene.add(grid)
        } else {
            renderRuntime.helperGridRef.current = null
        }
    }, [state.totalWidth, state.totalDepth, state.showHelperGrid])

    return (
        <div className="bg-background flex h-full flex-col">
            <div className="flex flex-grow flex-col overflow-hidden">
                <div className="h-full">
                    <div className="h-full flex flex-col lg:block">
                        <div
                            ref={renderRuntime.containerRef}
                            className="relative h-full w-full"
                        >
                            <BoxContextMenu />
                            <HiddenBoxesDisplay />
                        </div>
                        <ActionsBar />
                    </div>
                </div>
            </div>
        </div>
    )
}

function cloneGrid(grid: Grid): Grid {
    return grid.map((row) => row.map((cell) => ({ ...cell })))
}

function removeAndDisposeObject(
    scene: THREE.Scene,
    object: THREE.Object3D
): void {
    scene.remove(object)
    disposeObject(object)
}

function disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
        const disposable = child as THREE.Object3D & {
            geometry?: THREE.BufferGeometry
            material?: THREE.Material | THREE.Material[]
        }

        disposable.geometry?.dispose()
        if (disposable.material) {
            disposeMaterial(disposable.material)
        }
    })
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose())
        return
    }

    material.dispose()
}
