'use client'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import DebugInfoPanel from '@/components/DebugInfoPanel'
import { useBoxStore } from '@/lib/store'
import { createBoxModel, setupGrid } from '@/lib/modelGenerator'
import ConfigSidebar from '@/components/ConfigSidebar'
import Header from '@/components/Header'

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
    } = useBoxStore()

    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const boxMeshGroupRef = useRef<THREE.Group | null>(null)
    const gridHelperRef = useRef<THREE.GridHelper | null>(null)
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null)
    const raycasterRef = useRef<THREE.Raycaster | null>(null)
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
            })
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
        if (!containerRef.current || !debugMode) return

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
                const boxIndex = boxMeshGroupRef.current.children.findIndex(
                    (child) => child === boxObject
                )

                // Handle selection with multi-select capability
                toggleBoxSelection(boxIndex, isMultiSelect)
            } else {
                // Only clear selection if not multi-selecting
                if (!isMultiSelect) {
                    clearSelectedBoxes()
                }
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
        }

        window.addEventListener('keydown', handleKeyDown)

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
        debugMode,
        toggleBoxSelection,
        clearSelectedBoxes,
        toggleSelectedBoxesVisibility,
        selectedBoxIndices,
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
                            ></div>
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
