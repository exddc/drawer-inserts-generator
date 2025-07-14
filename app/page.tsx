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
import { ResizingState } from '@/lib/types'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function Home() {
    const state = useStore()
    const resizingRef = useRef<ResizingState | null>(null)
    const handlesGroupRef = useRef<THREE.Group | null>(null)

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

            const existing = new Set<number>(
                (state.boxRef.current!.children as THREE.Group[]).map(
                    (g) => g.userData.group as number
                )
            )
            let newId = 1
            while (existing.has(newId)) newId++

            const grid = state.gridRef.current!
            selectedGroups.forEach((grp) => {
                const cells: { x: number; z: number }[] = grp.userData.cells
                cells.forEach(({ x, z }) => {
                    grid[z][x].group = newId
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

        function onSplitClick() {
            if (selectedGroups.length === 0) return

            const grid = state.gridRef.current!
            selectedGroups.forEach((grp) => {
                const cells: { x: number; z: number }[] = grp.userData.cells
                cells.forEach(({ x, z }) => {
                    grid[z][x].group = 0
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

            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouse, camera)

            const hits = raycaster.intersectObjects(scene.children, true)
            if (!hits.length) return

            // First, check for resize handles
            const handleHit = hits.find(({ object }) => {
                return object.userData.isResizeHandle === true
            })

            if (handleHit) {
                startResize(handleHit.object.userData, event)
                return
            }

            // Existing selection logic
            const isMultiSelect = event.metaKey || event.ctrlKey

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

        function startResize(handleData: any, event: MouseEvent) {
            const { side, boundaryIndex } = handleData

            // Get initial pointer position in world coordinates
            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            // Project mouse to world coordinates on the ground plane (y=0)
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
            const worldPos = new THREE.Vector3()
            raycaster.setFromCamera(mouse, camera)
            raycaster.ray.intersectPlane(plane, worldPos)

            // Get initial sizes based on side
            const grid = state.gridRef.current
            let initSizes: { a: number; b: number }

            if (side === 'left') {
                // Moving left boundary affects columns boundaryIndex-1 and boundaryIndex
                const leftSize =
                    boundaryIndex > 0 ? grid[0][boundaryIndex - 1].width : 0
                const rightSize =
                    boundaryIndex < grid[0].length
                        ? grid[0][boundaryIndex].width
                        : 0
                initSizes = { a: leftSize, b: rightSize }
            } else if (side === 'right') {
                // Moving right boundary affects columns boundaryIndex-1 and boundaryIndex
                const leftSize =
                    boundaryIndex > 0 ? grid[0][boundaryIndex - 1].width : 0
                const rightSize =
                    boundaryIndex < grid[0].length
                        ? grid[0][boundaryIndex].width
                        : 0
                initSizes = { a: leftSize, b: rightSize }
            } else if (side === 'top') {
                // Moving top boundary affects rows boundaryIndex-1 and boundaryIndex
                const topSize =
                    boundaryIndex > 0 ? grid[boundaryIndex - 1][0].depth : 0
                const bottomSize =
                    boundaryIndex < grid.length
                        ? grid[boundaryIndex][0].depth
                        : 0
                initSizes = { a: topSize, b: bottomSize }
            } else {
                // bottom
                // Moving bottom boundary affects rows boundaryIndex-1 and boundaryIndex
                const topSize =
                    boundaryIndex > 0 ? grid[boundaryIndex - 1][0].depth : 0
                const bottomSize =
                    boundaryIndex < grid.length
                        ? grid[boundaryIndex][0].depth
                        : 0
                initSizes = { a: topSize, b: bottomSize }
            }

            resizingRef.current = {
                side,
                boundaryIndex,
                startPointer: { x: worldPos.x, z: worldPos.z },
                initSizes,
            }

            // Add event listeners for move and up
            renderer.domElement.addEventListener('pointermove', onPointerMove)
            renderer.domElement.addEventListener('pointerup', onPointerUp)

            // Prevent orbit controls during resize
            controls.enabled = false
        }

        function onPointerMove(event: MouseEvent) {
            if (!resizingRef.current) return

            // TODO: Implement in next steps
            console.log('Pointer move during resize', event)
        }

        function onPointerUp(event: MouseEvent) {
            if (!resizingRef.current) return

            // Clean up
            renderer.domElement.removeEventListener(
                'pointermove',
                onPointerMove
            )
            renderer.domElement.removeEventListener('pointerup', onPointerUp)
            controls.enabled = true
            resizingRef.current = null
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

        if (state.boxRef.current) scene.remove(state.boxRef.current)

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
        state.showCornerLines,
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

    // Handle creation effect - add this after the existing useEffects
    useEffect(() => {
        const scene = state.sceneRef.current
        if (!scene) return

        // Remove existing handles
        if (handlesGroupRef.current) {
            scene.remove(handlesGroupRef.current)
            handlesGroupRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose()
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat) => mat.dispose())
                    } else {
                        child.material.dispose()
                    }
                }
            })
            handlesGroupRef.current = null
        }

        // Only create handles if there are selected groups
        if (state.selectedGroups.length === 0) return

        const handlesGroup = new THREE.Group()
        handlesGroupRef.current = handlesGroup

        state.selectedGroups.forEach((group) => {
            // Compute world AABB
            const box = new THREE.Box3().setFromObject(group)

            // Get the group's cells to compute boundary indices
            const cells: { x: number; z: number }[] = group.userData.cells || []
            if (cells.length === 0) return

            const xCoords = cells.map((cell) => cell.x)
            const zCoords = cells.map((cell) => cell.z)
            const minX = Math.min(...xCoords)
            const maxX = Math.max(...xCoords)
            const minZ = Math.min(...zCoords)
            const maxZ = Math.max(...zCoords)

            const handleThickness = 0.2
            const handleHeight = 0.5
            const yPos = state.wallHeight + handleHeight / 2

            // Create handle material
            const handleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.7,
            })

            // Left handle (controls vertical grid line at minX)
            if (minX > 0) {
                // Only if not at left edge
                const leftGeometry = new THREE.BoxGeometry(
                    handleThickness,
                    handleHeight,
                    box.max.z - box.min.z
                )
                const leftHandle = new THREE.Mesh(
                    leftGeometry,
                    handleMaterial.clone()
                )
                leftHandle.position.set(
                    box.min.x - handleThickness / 2,
                    yPos,
                    (box.min.z + box.max.z) / 2
                )
                leftHandle.userData = {
                    isResizeHandle: true,
                    side: 'left',
                    boundaryIndex: minX,
                    groupId: group.userData.id,
                }
                handlesGroup.add(leftHandle)
            }

            // Right handle (controls vertical grid line at maxX + 1)
            if (maxX < state.gridRef.current[0].length - 1) {
                // Only if not at right edge
                const rightGeometry = new THREE.BoxGeometry(
                    handleThickness,
                    handleHeight,
                    box.max.z - box.min.z
                )
                const rightHandle = new THREE.Mesh(
                    rightGeometry,
                    handleMaterial.clone()
                )
                rightHandle.position.set(
                    box.max.x + handleThickness / 2,
                    yPos,
                    (box.min.z + box.max.z) / 2
                )
                rightHandle.userData = {
                    isResizeHandle: true,
                    side: 'right',
                    boundaryIndex: maxX + 1,
                    groupId: group.userData.id,
                }
                handlesGroup.add(rightHandle)
            }

            // Top handle (controls horizontal grid line at minZ)
            if (minZ > 0) {
                // Only if not at top edge
                const topGeometry = new THREE.BoxGeometry(
                    box.max.x - box.min.x,
                    handleHeight,
                    handleThickness
                )
                const topHandle = new THREE.Mesh(
                    topGeometry,
                    handleMaterial.clone()
                )
                topHandle.position.set(
                    (box.min.x + box.max.x) / 2,
                    yPos,
                    box.min.z - handleThickness / 2
                )
                topHandle.userData = {
                    isResizeHandle: true,
                    side: 'top',
                    boundaryIndex: minZ,
                    groupId: group.userData.id,
                }
                handlesGroup.add(topHandle)
            }

            // Bottom handle (controls horizontal grid line at maxZ + 1)
            if (maxZ < state.gridRef.current.length - 1) {
                // Only if not at bottom edge
                const bottomGeometry = new THREE.BoxGeometry(
                    box.max.x - box.min.x,
                    handleHeight,
                    handleThickness
                )
                const bottomHandle = new THREE.Mesh(
                    bottomGeometry,
                    handleMaterial.clone()
                )
                bottomHandle.position.set(
                    (box.min.x + box.max.x) / 2,
                    yPos,
                    box.max.z + handleThickness / 2
                )
                bottomHandle.userData = {
                    isResizeHandle: true,
                    side: 'bottom',
                    boundaryIndex: maxZ + 1,
                    groupId: group.userData.id,
                }
                handlesGroup.add(bottomHandle)
            }
        })

        scene.add(handlesGroup)

        // Cleanup function
        return () => {
            if (handlesGroupRef.current) {
                scene.remove(handlesGroupRef.current)
                handlesGroupRef.current.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose()
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat) => mat.dispose())
                        } else {
                            child.material.dispose()
                        }
                    }
                })
            }
        }
    }, [state.selectedGroups, state.wallHeight])

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
