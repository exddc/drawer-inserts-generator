'use client'

import ActionsBar from '@/components/ActionsBar'
import BoxContextMenu from '@/components/BoxContextMenu'
import ConfigSidebar from '@/components/ConfigSidebar'
import HiddenBoxesDisplay from '@/components/HiddenBoxesDisplay'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { generateCustomBox } from '@/lib/boxHelper'
import { cameraSettings, material } from '@/lib/defaults'
import { resizeGrid } from '@/lib/gridHelper'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function Home() {
    const state = useStore()

    useEffect(() => {
        const container = state.containerRef.current
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
        state.sceneRef.current = scene
        state.cameraRef.current = camera
        state.rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        state.controlsRef.current = controls
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
            if (!state.cameraRef.current || !state.rendererRef.current) return
            state.cameraRef.current.aspect =
                window.innerWidth / window.innerHeight
            state.cameraRef.current.updateProjectionMatrix()
            state.rendererRef.current.setSize(
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
        let selectedGroups: THREE.Group[] = []

        window.addEventListener('keydown', onKeyDown)

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                selectedGroups = []
                state.setSelectedGroups(selectedGroups)
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

        // Helper function to update hiddenBoxIds based on current box visibility
        const updateHiddenBoxIds = () => {
            const currentBoxRef = state.boxRef.current
            if (!currentBoxRef) return

            const newHiddenIds = new Set<number>()
            currentBoxRef.children.forEach((child) => {
                if (
                    child instanceof THREE.Group &&
                    !child.visible &&
                    child.userData.id
                ) {
                    newHiddenIds.add(child.userData.id)
                }
            })
            state.setHiddenBoxIds(newHiddenIds)
        }

        function onCombineClick() {
            if (selectedGroups.length < 2) return

            // 1) pick a new unused ID
            const existing = new Set<number>(
                (state.boxRef.current!.children as THREE.Group[]).map(
                    (g) => g.userData.group as number
                )
            )
            let newId = 1
            while (existing.has(newId)) newId++

            // 2) stamp that ID into the master grid for each selected box
            const grid = state.gridRef.current!
            selectedGroups.forEach((grp) => {
                const cells: { x: number; z: number }[] = grp.userData.cells
                cells.forEach(({ x, z }) => {
                    grid[z][x].group = newId
                })
            })

            // 3) rebuild the entire box‐layer from the updated grid
            const scene = state.sceneRef.current!
            scene.remove(state.boxRef.current!)
            const newBox = generateCustomBox(
                grid,
                state.wallThickness,
                state.cornerRadius,
                state.generateBottom
            )
            state.boxRef.current = newBox
            newBox.position.set(
                -useStore.getState().totalWidth / 2,
                0,
                -useStore.getState().totalDepth / 2
            )
            scene.add(newBox)

            // 4) reset selection
            selectedGroups = []
            state.setSelectedGroups(selectedGroups)
            updateHiddenBoxIds() // Update hidden boxes after combine
        }

        function onSplitClick() {
            if (selectedGroups.length === 0) return

            // 1) reset each selected group's cells back to group 0
            const grid = state.gridRef.current!
            selectedGroups.forEach((grp) => {
                const cells: { x: number; z: number }[] = grp.userData.cells
                cells.forEach(({ x, z }) => {
                    grid[z][x].group = 0
                })
            })

            // 2) rebuild the entire box‐layer
            const scene = state.sceneRef.current!
            scene.remove(state.boxRef.current!)
            const newBox = generateCustomBox(
                grid,
                state.wallThickness,
                state.cornerRadius,
                state.generateBottom
            )
            state.boxRef.current = newBox
            newBox.position.set(
                -useStore.getState().totalWidth / 2,
                0,
                -useStore.getState().totalDepth / 2
            )
            scene.add(newBox)

            // 3) reset selection
            selectedGroups = []
            state.setSelectedGroups(selectedGroups)
            updateHiddenBoxIds() // Update hidden boxes after split
        }

        function onHideClick() {
            if (selectedGroups.length === 0) return

            const grid = state.gridRef.current!

            selectedGroups.forEach((grp) => {
                const newVisibility = !grp.visible
                grp.visible = newVisibility

                const cells: { x: number; z: number }[] = grp.userData.cells
                cells.forEach(({ x, z }) => {
                    grid[z][x].visible = newVisibility
                })
            })

            const scene = state.sceneRef.current!
            scene.remove(state.boxRef.current!)
            const newBox = generateCustomBox(
                grid,
                state.wallThickness,
                state.cornerRadius,
                state.generateBottom
            )
            state.boxRef.current = newBox
            newBox.position.set(
                -useStore.getState().totalWidth / 2,
                0,
                -useStore.getState().totalDepth / 2
            )
            scene.add(newBox)

            selectedGroups = []
            state.setSelectedGroups(selectedGroups)
            updateHiddenBoxIds()
        }

        function onPointerDown(event: MouseEvent) {
            if (event.button !== 0) return // only left mouse button

            const isMultiSelect = event.metaKey || event.ctrlKey

            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouse, camera)

            const hits = raycaster.intersectObjects(scene.children, true)
            if (!hits.length) return

            const hit = hits.find(({ object }) => {
                if (!(object instanceof THREE.Mesh)) return false
                //@ts-ignore
                const idx = object.parent.children.indexOf(object)
                const isWall = idx === 0
                const isBottom = state.generateBottom && idx === 1
                return isWall || isBottom
            })
            if (!hit) return

            const box = (hit.object as THREE.Mesh).parent as THREE.Group

            if (!isMultiSelect) {
                selectedGroups = []
            }

            const i = selectedGroups.indexOf(box)
            if (i !== -1) {
                selectedGroups.splice(i, 1)
            } else {
                selectedGroups.push(box)
            }
            state.setSelectedGroups([...selectedGroups])
        }

        renderer.domElement.addEventListener('pointerdown', onPointerDown)

        return () => {
            cancelAnimationFrame(frameId)
            window.removeEventListener('resize', onWindowResize)
            renderer.domElement.removeEventListener(
                'pointerdown',
                onPointerDown
            )
            controls.dispose()
            renderer.dispose()
        }
    }, [])

    useEffect(() => {
        const boxGroup = state.boxRef.current
        if (!boxGroup) return

        // clear
        boxGroup.children.forEach((child) => {
            if (!(child instanceof THREE.Group)) return
            child.traverse((c) => {
                if (c instanceof THREE.Mesh)
                    c.material.color.setHex(material.standard.color)
            })
        })

        // highlight selected
        state.selectedGroups.forEach((grp) =>
            grp.traverse((c) => {
                if (c instanceof THREE.Mesh)
                    c.material.color.setHex(material.selected.color)
            })
        )
    }, [state.selectedGroups])

    useEffect(() => {
        const scene = state.sceneRef.current
        if (!scene) return

        // remove old
        if (state.boxRef.current) scene.remove(state.boxRef.current)

        // only resize the grid if cols/rows actually changeds
        const old = state.gridRef.current
        if (
            old.length !== state.totalDepth ||
            old[0].length !== state.totalWidth
        ) {
            state.gridRef.current = resizeGrid(
                old,
                state.totalWidth,
                state.totalDepth,
                state.maxBoxWidth,
                state.maxBoxDepth
            )
        }

        const grid = state.gridRef.current
        const box = generateCustomBox(
            grid,
            state.wallThickness,
            state.cornerRadius,
            state.generateBottom
        )
        state.boxRef.current = box
        box.position.set(-state.totalWidth / 2, 0, -state.totalDepth / 2)
        scene.add(box)
    }, [
        state.wallThickness,
        state.cornerRadius,
        state.wallHeight,
        state.generateBottom,
        state.totalWidth,
        state.totalDepth,
        state.maxBoxWidth,
        state.maxBoxDepth,
        state.redrawTrigger,
    ])

    useEffect(() => {
        const scene = state.sceneRef.current
        if (!scene) return

        const size = Math.max(state.totalWidth, state.totalDepth) + 50
        const divisions = Math.ceil(size / 10)

        if (state.helperGridRef.current) {
            scene.remove(state.helperGridRef.current)
        }

        if (state.showHelperGrid) {
            const grid = new THREE.GridHelper(size, divisions)
            state.helperGridRef.current = grid
            scene.add(grid)
        } else {
            state.helperGridRef.current = null
        }
    }, [state.totalWidth, state.totalDepth, state.showHelperGrid])

    return (
        <div className="bg-background flex h-full flex-col">
            <div className="flex flex-grow flex-col overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Settings Panel */}
                    <ResizablePanel defaultSize={20} className="h-full">
                        <ConfigSidebar />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* 3D Preview */}
                    <ResizablePanel defaultSize={80} className="h-full">
                        <div
                            ref={state.containerRef}
                            className="relative h-full w-full"
                        >
                            {state.containerRef.current && <BoxContextMenu />}
                            <HiddenBoxesDisplay />
                        </div>
                        <ActionsBar />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
}
