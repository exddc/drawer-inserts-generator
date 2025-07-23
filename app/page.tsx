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

        // Resize functions
        function onResizePointerMove(event: MouseEvent) {
            if (!resizingRef.current) return

            const { side, boundaryIndex, startPointer, initSizes } =
                resizingRef.current

            console.log('📏 Resize pointer move triggered')

            // Get current pointer position in world coordinates
            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            // Project mouse to world coordinates on the ground plane (y=0)
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
            const worldPos = new THREE.Vector3()
            raycaster.setFromCamera(mouse, camera)
            raycaster.ray.intersectPlane(plane, worldPos)

            // Calculate delta based on side
            let delta = 0
            if (side === 'left' || side === 'right') {
                delta = worldPos.x - startPointer.x
                if (side === 'left') delta = -delta
            } else {
                delta = worldPos.z - startPointer.z
                if (side === 'top') delta = -delta
            }

            console.log(
                '📐 Delta:',
                delta.toFixed(2),
                'World pos:',
                worldPos.x.toFixed(2),
                worldPos.z.toFixed(2)
            )

            // Clamp delta to prevent negative sizes
            const minSize = 0.5
            const maxDeltaA = initSizes.a - minSize
            const maxDeltaB = initSizes.b - minSize
            const clampedDelta = Math.max(
                -maxDeltaA,
                Math.min(maxDeltaB, delta)
            )

            if (clampedDelta !== delta) {
                console.log(
                    '🔒 Delta clamped from',
                    delta.toFixed(2),
                    'to',
                    clampedDelta.toFixed(2)
                )
            }

            // Update grid based on side
            const grid = state.gridRef.current

            if (side === 'left') {
                if (boundaryIndex > 0 && boundaryIndex < grid[0].length) {
                    const newSizeA = initSizes.a - clampedDelta
                    const newSizeB = initSizes.b + clampedDelta

                    console.log(
                        '⬅️ Updating left - New sizes:',
                        newSizeA.toFixed(2),
                        newSizeB.toFixed(2)
                    )

                    for (let row = 0; row < grid.length; row++) {
                        grid[row][boundaryIndex - 1].width = newSizeA
                        grid[row][boundaryIndex].width = newSizeB
                    }
                }
            } else if (side === 'right') {
                if (boundaryIndex > 0 && boundaryIndex < grid[0].length) {
                    const newSizeA = initSizes.a + clampedDelta
                    const newSizeB = initSizes.b - clampedDelta

                    console.log(
                        '➡️ Updating right - New sizes:',
                        newSizeA.toFixed(2),
                        newSizeB.toFixed(2)
                    )

                    for (let row = 0; row < grid.length; row++) {
                        grid[row][boundaryIndex - 1].width = newSizeA
                        grid[row][boundaryIndex].width = newSizeB
                    }
                }
            } else if (side === 'top') {
                if (boundaryIndex > 0 && boundaryIndex < grid.length) {
                    const newSizeA = initSizes.a - clampedDelta
                    const newSizeB = initSizes.b + clampedDelta

                    console.log(
                        '⬆️ Updating top - New sizes:',
                        newSizeA.toFixed(2),
                        newSizeB.toFixed(2)
                    )

                    for (let col = 0; col < grid[0].length; col++) {
                        grid[boundaryIndex - 1][col].depth = newSizeA
                        grid[boundaryIndex][col].depth = newSizeB
                    }
                }
            } else {
                if (boundaryIndex > 0 && boundaryIndex < grid.length) {
                    const newSizeA = initSizes.a + clampedDelta
                    const newSizeB = initSizes.b - clampedDelta

                    console.log(
                        '⬇️ Updating bottom - New sizes:',
                        newSizeA.toFixed(2),
                        newSizeB.toFixed(2)
                    )

                    for (let col = 0; col < grid[0].length; col++) {
                        grid[boundaryIndex - 1][col].depth = newSizeA
                        grid[boundaryIndex][col].depth = newSizeB
                    }
                }
            }

            // Force redraw
            state.forceRedraw()
        }

        function onResizePointerUp(event: MouseEvent) {
            console.log('🏁 Resize ended')
            if (!resizingRef.current) return

            const { selectedGroupIds } = resizingRef.current

            // Clean up event listeners
            renderer.domElement.removeEventListener(
                'pointermove',
                onResizePointerMove
            )
            renderer.domElement.removeEventListener(
                'pointerup',
                onResizePointerUp
            )

            // Re-enable orbit controls
            controls.enabled = true

            // Restore selection after a small delay to allow for redraw
            setTimeout(() => {
                if (state.boxRef.current && selectedGroupIds) {
                    const newSelectedGroups: THREE.Group[] = []
                    state.boxRef.current.children.forEach((child) => {
                        if (
                            child instanceof THREE.Group &&
                            selectedGroupIds.includes(child.userData.id)
                        ) {
                            newSelectedGroups.push(child)
                        }
                    })
                    state.setSelectedGroups(newSelectedGroups)
                    console.log(
                        '🔄 Selection restored:',
                        newSelectedGroups.length,
                        'groups'
                    )
                }
            }, 100) // Increased delay

            // Clear resizing state
            resizingRef.current = null
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
                console.log('🎯 Handle clicked:', handleHit.object.userData)
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
            console.log('🚀 Starting resize:', handleData)
            const { side, boundaryIndex } = handleData

            // Store the currently selected groups to restore them later
            const selectedGroupIds = state.selectedGroups.map(
                (g) => g.userData.id
            )

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

            console.log('📏 Grid dimensions:', grid.length, 'x', grid[0].length)
            console.log('📍 Boundary index:', boundaryIndex, 'Side:', side)

            if (side === 'left') {
                const leftSize =
                    boundaryIndex > 0 ? grid[0][boundaryIndex - 1].width : 0
                const rightSize =
                    boundaryIndex < grid[0].length
                        ? grid[0][boundaryIndex].width
                        : 0
                initSizes = { a: leftSize, b: rightSize }
                console.log(
                    '⬅️ Left resize - Left size:',
                    leftSize,
                    'Right size:',
                    rightSize
                )
            } else if (side === 'right') {
                const leftSize =
                    boundaryIndex > 0 ? grid[0][boundaryIndex - 1].width : 0
                const rightSize =
                    boundaryIndex < grid[0].length
                        ? grid[0][boundaryIndex].width
                        : 0
                initSizes = { a: leftSize, b: rightSize }
                console.log(
                    '➡️ Right resize - Left size:',
                    leftSize,
                    'Right size:',
                    rightSize
                )
            } else if (side === 'top') {
                const topSize =
                    boundaryIndex > 0 ? grid[boundaryIndex - 1][0].depth : 0
                const bottomSize =
                    boundaryIndex < grid.length
                        ? grid[boundaryIndex][0].depth
                        : 0
                initSizes = { a: topSize, b: bottomSize }
                console.log(
                    '⬆️ Top resize - Top size:',
                    topSize,
                    'Bottom size:',
                    bottomSize
                )
            } else {
                const topSize =
                    boundaryIndex > 0 ? grid[boundaryIndex - 1][0].depth : 0
                const bottomSize =
                    boundaryIndex < grid.length
                        ? grid[boundaryIndex][0].depth
                        : 0
                initSizes = { a: topSize, b: bottomSize }
                console.log(
                    '⬇️ Bottom resize - Top size:',
                    topSize,
                    'Bottom size:',
                    bottomSize
                )
            }

            resizingRef.current = {
                side,
                boundaryIndex,
                startPointer: { x: worldPos.x, z: worldPos.z },
                initSizes,
                selectedGroupIds,
            }

            // Add event listeners for move and up
            renderer.domElement.addEventListener(
                'pointermove',
                onResizePointerMove
            )
            renderer.domElement.addEventListener('pointerup', onResizePointerUp)

            // Prevent orbit controls during resize
            controls.enabled = false

            console.log('🔧 Resize event listeners added')
        }

        // Mouse hover handling for handles
        function onPointerHover(event: MouseEvent) {
            if (resizingRef.current) return // Don't handle hover during resize

            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouse, camera)

            const hits = raycaster.intersectObjects(scene.children, true)
            const handleHit = hits.find(
                ({ object }) => object.userData.isResizeHandle === true
            )

            // Reset all handle materials
            if (handlesGroupRef.current) {
                handlesGroupRef.current.children.forEach((handle) => {
                    if (handle instanceof THREE.Mesh) {
                        handle.material = createHandleMaterial(false)
                    }
                })
            }

            // Highlight hovered handle
            if (handleHit && handleHit.object instanceof THREE.Mesh) {
                handleHit.object.material = createHandleMaterial(true)
                renderer.domElement.style.cursor = 'pointer'
            } else {
                renderer.domElement.style.cursor = 'default'
            }
        }

        renderer.domElement.addEventListener('pointerdown', onPointerDown)
        renderer.domElement.addEventListener('pointermove', onPointerHover)

        return () => {
            cancelAnimationFrame(frameId)
            window.removeEventListener('resize', onWindowResize)
            window.removeEventListener('keydown', onKeyDown)
            renderer.domElement.removeEventListener(
                'pointerdown',
                onPointerDown
            )
            renderer.domElement.removeEventListener(
                'pointermove',
                onPointerHover
            )

            if (resizingRef.current) {
                renderer.domElement.removeEventListener(
                    'pointermove',
                    onResizePointerMove
                )
                renderer.domElement.removeEventListener(
                    'pointerup',
                    onResizePointerUp
                )
            }

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

    function createHandleMaterial(isHovered: boolean = false) {
        return new THREE.MeshBasicMaterial({
            color: isHovered ? 0xff4444 : 0x00ff00,
            transparent: true,
            opacity: isHovered ? 0.9 : 0.7,
        })
    }

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

        if (state.selectedGroups.length === 0) return

        const handlesGroup = new THREE.Group()
        handlesGroupRef.current = handlesGroup

        state.selectedGroups.forEach((group) => {
            const box = new THREE.Box3().setFromObject(group)
            const cells: { x: number; z: number }[] = group.userData.cells || []
            if (cells.length === 0) return

            const xCoords = cells.map((cell) => cell.x)
            const zCoords = cells.map((cell) => cell.z)
            const minX = Math.min(...xCoords)
            const maxX = Math.max(...xCoords)
            const minZ = Math.min(...zCoords)
            const maxZ = Math.max(...zCoords)

            const handleThickness = 1.5
            const handleHeight = 1.5
            const yPos = state.wallHeight + handleHeight / 2

            console.log(
                '🎨 Creating handles for group:',
                group.userData.id,
                'Cells:',
                cells
            )
            console.log('📦 Box bounds:', { minX, maxX, minZ, maxZ })

            if (minX > 0) {
                const leftGeometry = new THREE.BoxGeometry(
                    handleThickness,
                    handleHeight,
                    Math.max(1, box.max.z - box.min.z)
                )
                const leftHandle = new THREE.Mesh(
                    leftGeometry,
                    createHandleMaterial(false)
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
                console.log('⬅️ Left handle created at:', leftHandle.position)
            }

            if (maxX < state.gridRef.current[0].length - 1) {
                const rightGeometry = new THREE.BoxGeometry(
                    handleThickness,
                    handleHeight,
                    Math.max(1, box.max.z - box.min.z)
                )
                const rightHandle = new THREE.Mesh(
                    rightGeometry,
                    createHandleMaterial(false)
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
                console.log('➡️ Right handle created at:', rightHandle.position)
            }

            if (minZ > 0) {
                const topGeometry = new THREE.BoxGeometry(
                    Math.max(1, box.max.x - box.min.x),
                    handleHeight,
                    handleThickness
                )
                const topHandle = new THREE.Mesh(
                    topGeometry,
                    createHandleMaterial(false)
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
                console.log('⬆️ Top handle created at:', topHandle.position)
            }

            if (maxZ < state.gridRef.current.length - 1) {
                const bottomGeometry = new THREE.BoxGeometry(
                    Math.max(1, box.max.x - box.min.x),
                    handleHeight,
                    handleThickness
                )
                const bottomHandle = new THREE.Mesh(
                    bottomGeometry,
                    createHandleMaterial(false)
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
                console.log(
                    '⬇️ Bottom handle created at:',
                    bottomHandle.position
                )
            }
        })

        scene.add(handlesGroup)

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
                    <ResizablePanel defaultSize={20} className="h-full">
                        <ConfigSidebar />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
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
