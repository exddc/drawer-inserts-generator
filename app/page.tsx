'use client'
import ActionsBar from '@/components/ActionsBar'
import BoxContextMenu from '@/components/BoxContextMenu'
import ConfigSidebar from '@/components/ConfigSidebar'
import DebugInfoPanel from '@/components/DebugInfoPanel'
import Header from '@/components/Header'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { createBoxModel, setupGrid } from '@/lib/modelGenerator'
import { createRaycastManager } from '@/lib/RaycastManager'
import { useBoxStore } from '@/lib/store'
import { CombinedBoxInfo } from '@/lib/types'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Define the WindowWithContextMenu interface
interface WindowWithContextMenu {
    contextMenuOpen?: boolean
    raycastManager: any
}

// Type assertion to access our custom properties
declare global {
    interface Window extends WindowWithContextMenu {}
}

export default function Home() {
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        debugMode,
        showGrid,
        showAxes,
        boxWidths,
        boxDepths,
        loadFromUrl,
        selectedBoxIndex,
        selectedBoxIndices,
        toggleBoxSelection,
        clearSelectedBoxes,
        hiddenBoxes,
        toggleSelectedBoxesVisibility,
        getBoxHexColor,
        getHighlightHexColor,
        canCombineSelectedBoxes,
        combineSelectedBoxes,
        isPrimaryBox,
        resetCombinedBoxes,
        combinedBoxes,
    } = useBoxStore()

    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer>(null)
    const sceneRef = useRef<THREE.Scene>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera>(null)
    const controlsRef = useRef<OrbitControls>(null)
    const boxMeshGroupRef = useRef<THREE.Group>(null)
    const gridHelperRef = useRef<THREE.GridHelper>(null)
    const axesHelperRef = useRef<THREE.AxesHelper>(null)
    const raycasterRef = useRef<THREE.Raycaster>(null)
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())

    // Load configuration from URL if present
    useEffect(() => {
        loadFromUrl()
    }, [loadFromUrl])

    // Initialize Three.js
    useEffect(() => {
        if (!containerRef.current) return

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xffffff)
        sceneRef.current = scene

        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth /
                containerRef.current.clientHeight,
            0.1,
            1000
        )
        camera.position.set(-110, -130, 110)
        camera.up.set(0, 0, 1)
        cameraRef.current = camera

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })
        renderer.setSize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
        )
        renderer.shadowMap.enabled = true
        renderer.info.autoReset = false
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        }
        controlsRef.current = controls

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(150, 200, 100)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight2.position.set(-150, 50, -100)
        directionalLight2.castShadow = true
        scene.add(directionalLight2)

        const gridHelper = setupGrid(scene, width, depth)
        gridHelperRef.current = gridHelper
        scene.rotateX(Math.PI / 2) // Make Z the up direction for easier placement in CAD or Slicer Software

        const axesHelper = new THREE.AxesHelper(100)
        scene.add(axesHelper)
        axesHelperRef.current = axesHelper

        const boxGroup = new THREE.Group()
        scene.add(boxGroup)
        boxMeshGroupRef.current = boxGroup

        raycasterRef.current = new THREE.Raycaster()

        const animate = () => {
            requestAnimationFrame(animate)
            if (controlsRef.current) controlsRef.current.update()
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                if (debugMode) {
                    rendererRef.current.info.reset()
                }
                rendererRef.current.render(sceneRef.current, cameraRef.current)
            }
        }
        animate()

        const handleResize = () => {
            if (
                !containerRef.current ||
                !cameraRef.current ||
                !rendererRef.current
            )
                return

            cameraRef.current.aspect =
                containerRef.current.clientWidth /
                containerRef.current.clientHeight
            cameraRef.current.updateProjectionMatrix()
            rendererRef.current.setSize(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
            )
        }
        window.addEventListener('resize', handleResize)

        createBoxModel(boxMeshGroupRef.current, {
            boxWidths,
            boxDepths,
            height,
            wallThickness,
            cornerRadius,
            hasBottom,
            selectedBoxIndex,
            selectedBoxIndices,
            hiddenBoxes,
            boxColor: getBoxHexColor(),
            highlightColor: getHighlightHexColor(),
        })

        return () => {
            window.removeEventListener('resize', handleResize)
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement)
            }
        }
    }, [])

    useEffect(() => {
        if (sceneRef.current) {
            const gridHelper = setupGrid(sceneRef.current, width, depth)
            gridHelperRef.current = gridHelper
        }

        if (boxMeshGroupRef.current) {
            createBoxModel(boxMeshGroupRef.current, {
                boxWidths,
                boxDepths,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                selectedBoxIndex,
                selectedBoxIndices,
                hiddenBoxes,
                boxColor: getBoxHexColor(),
                highlightColor: getHighlightHexColor(),
                combinedBoxes: combinedBoxes as Map<number, CombinedBoxInfo>,
            })

            // Update raycast manager when box mesh group changes
            if (window.raycastManager && cameraRef.current) {
                window.raycastManager.init(
                    cameraRef.current,
                    boxMeshGroupRef.current
                )
            }
        }
    }, [
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        boxWidths,
        boxDepths,
        selectedBoxIndex,
        selectedBoxIndices,
        hiddenBoxes,
        getBoxHexColor,
        getHighlightHexColor,
        useBoxStore((state) => state.boxColor),
        useBoxStore((state) => state.highlightColor),
        combinedBoxes,
    ])

    // Toggle grid visibility
    useEffect(() => {
        if (gridHelperRef.current) {
            gridHelperRef.current.visible = showGrid
        }
    }, [showGrid])

    // Toggle axes visibility
    useEffect(() => {
        if (axesHelperRef.current) {
            axesHelperRef.current.visible = showAxes
        }
    }, [showAxes])

    // Debug Mode
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.info.autoReset = !debugMode
        }
    }, [debugMode])

    useEffect(() => {
        if (!containerRef.current) return

        const handleMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            mouseRef.current.x =
                ((event.clientX - rect.left) /
                    containerRef.current.clientWidth) *
                    2 -
                1
            mouseRef.current.y =
                -(
                    (event.clientY - rect.top) /
                    containerRef.current.clientHeight
                ) *
                    2 +
                1
        }

        const handleClick = (event: MouseEvent) => {
            // Skip processing if context menu is open
            if (window.contextMenuOpen) return

            if (
                !containerRef.current ||
                !raycasterRef.current ||
                !sceneRef.current ||
                !cameraRef.current ||
                !boxMeshGroupRef.current
            )
                return

            raycasterRef.current.setFromCamera(
                mouseRef.current,
                cameraRef.current
            )

            const intersects = raycasterRef.current.intersectObjects(
                boxMeshGroupRef.current.children || [],
                true
            )

            // metaKey is Cmd on Mac, Ctrl on Windows
            const isMultiSelect = event.metaKey || event.ctrlKey

            if (intersects.length > 0) {
                const object = intersects[0].object

                let boxObject = object
                while (
                    boxObject.parent &&
                    boxObject.parent !== boxMeshGroupRef.current
                ) {
                    boxObject = boxObject.parent
                }

                // Find box index in the group
                const boxIndex =
                    boxMeshGroupRef.current.children.indexOf(boxObject)

                if (boxIndex !== -1) {
                    // Get the actual index from userData
                    const actualIndex = boxObject.userData?.dimensions?.index

                    if (actualIndex !== undefined) {
                        // Handle selection with multi-select capability
                        toggleBoxSelection(actualIndex, isMultiSelect)
                    }
                }
            } else {
                // Don't clear selection when clicking empty space
                // Only clear via Escape key or dedicated button now
            }
        }

        containerRef.current.addEventListener('mousemove', handleMouseMove)
        containerRef.current.addEventListener('click', handleClick)

        // Handle keyboard shortcuts for selection
        const handleKeyDown = (event: KeyboardEvent) => {
            // Escape key to clear selection
            if (event.key === 'Escape') {
                clearSelectedBoxes()
            }

            // 'h' key to toggle visibility of selected boxes
            if (event.key === 'h' || event.key === 'H') {
                if (selectedBoxIndices.size > 0) {
                    toggleSelectedBoxesVisibility()
                }
            }

            // 'c' key to combine selected boxes
            if (event.key === 'c' && !event.shiftKey) {
                if (canCombineSelectedBoxes()) {
                    combineSelectedBoxes()
                }
            }

            // 's' key to split a combined box (previously 'Shift+C')
            if (event.key === 's' || event.key === 'S') {
                if (selectedBoxIndices.size === 1) {
                    const index = Array.from(selectedBoxIndices)[0]
                    if (isPrimaryBox(index)) {
                        resetCombinedBoxes()
                    }
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        // Initialize the raycast manager for right-click context menu
        if (cameraRef.current && boxMeshGroupRef.current) {
            if (!window.raycastManager) {
                window.raycastManager = createRaycastManager()
            }
            window.raycastManager.init(
                cameraRef.current,
                boxMeshGroupRef.current
            )
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener(
                    'mousemove',
                    handleMouseMove
                )
                containerRef.current.removeEventListener('click', handleClick)
            }
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [
        toggleBoxSelection,
        clearSelectedBoxes,
        toggleSelectedBoxesVisibility,
        selectedBoxIndices,
        canCombineSelectedBoxes,
        combineSelectedBoxes,
        isPrimaryBox,
        resetCombinedBoxes,
    ])

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <Header sceneRef={sceneRef} boxMeshGroupRef={boxMeshGroupRef} />
            <div className="bg-background flex h-full flex-col">
                <div className="flex flex-grow flex-col overflow-hidden">
                    <ResizablePanelGroup
                        direction="horizontal"
                        className="h-full"
                    >
                        {/* Settings Panel */}
                        <ResizablePanel
                            defaultSize={20}
                            minSize={15}
                            maxSize={30}
                            className="flex flex-col"
                        >
                            <div className="flex-grow overflow-auto">
                                <ConfigSidebar />
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* 3D Preview */}
                        <ResizablePanel defaultSize={80} className="h-full">
                            <div
                                ref={containerRef}
                                className="relative h-full w-full"
                            >
                                {containerRef.current && (
                                    <BoxContextMenu
                                        // @ts-ignore - To be fixed
                                        containerRef={containerRef}
                                    />
                                )}
                            </div>
                            <ActionsBar
                                camera={cameraRef}
                                controls={controlsRef}
                            />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>

                <DebugInfoPanel
                    renderer={rendererRef.current}
                    scene={sceneRef.current}
                    boxMeshGroup={boxMeshGroupRef.current}
                    enabled={debugMode}
                />
            </div>
        </div>
    )
}
