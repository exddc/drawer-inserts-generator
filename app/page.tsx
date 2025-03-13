'use client'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { getBoxInfoFromObject } from '@/lib/boxUtils'
import ConfigSidebar from '@/components/ConfigSidebar'
import DebugInfoPanel from '@/components/DebugInfoPanel'
import { useBoxStore } from '@/lib/store'
import { createBoxModel, setupGrid } from '@/lib/modelGenerator'
import ConfigSidebarWrapper from '@/components/ConfigSidebarWrapper'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

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
        setSelectedBoxIndex,
        hiddenBoxes,
        toggleBoxVisibility,
        isBoxVisible,
    } = useBoxStore()

    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const boxMeshGroupRef = useRef<THREE.Group | null>(null)
    const gridHelperRef = useRef<THREE.GridHelper | null>(null)
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
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

        const tooltip = document.createElement('div')
        tooltip.className =
            'fixed hidden p-2 bg-black/80 text-white text-xs rounded pointer-events-none z-50'
        document.body.appendChild(tooltip)
        tooltipRef.current = tooltip

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
            hiddenBoxes,
        })

        return () => {
            window.removeEventListener('resize', handleResize)
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement)
            }
            if (tooltipRef.current) {
                document.body.removeChild(tooltipRef.current)
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
                hiddenBoxes,
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
        hiddenBoxes,
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

        // Create a non-interactive tooltip element for the info panel
        const createTooltipContent = (boxInfo: any, index: number) => {
            const isVisible = isBoxVisible(index)

            return `
                <div class="tooltip-content">
                    <div><strong>Box Info:</strong></div>
                    <div>Position: X: ${boxInfo.position.x.toFixed(
                        2
                    )}, Y: ${boxInfo.position.y.toFixed(
                        2
                    )}, Z: ${boxInfo.position.z.toFixed(2)}</div>
                    <div>Width: ${boxInfo.width.toFixed(2)}</div>
                    <div>Depth: ${boxInfo.depth.toFixed(2)}</div>
                    <div>Height: ${boxInfo.height.toFixed(2)}</div>
                    <div>Wall Thickness: ${wallThickness}</div>
                    <div class="mt-2 tooltip-button-container" data-box-index="${index}">
                        <button class="tooltip-button toggle-visibility-btn" data-action="toggle-visibility">
                            ${isVisible ? 'Hide Box' : 'Show Box'}
                        </button>
                    </div>
                </div>
            `
        }

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

        // This is needed to make the tooltip interactive
        const handleTooltipClick = (event: MouseEvent) => {
            if (!tooltipRef.current) return

            const target = event.target as HTMLElement

            if (target.classList.contains('toggle-visibility-btn')) {
                event.stopPropagation()

                // Find the container with the data attribute
                const container = target.closest('.tooltip-button-container')
                if (container) {
                    const boxIndex = parseInt(
                        container.getAttribute('data-box-index') || '-1'
                    )
                    if (boxIndex !== -1) {
                        toggleBoxVisibility(boxIndex)

                        // Update button text immediately
                        const isNowVisible = !isBoxVisible(boxIndex)
                        target.textContent = isNowVisible
                            ? 'Hide Box'
                            : 'Show Box'
                    }
                }
            }
        }

        const handleClick = (event: MouseEvent) => {
            if (
                !containerRef.current ||
                !raycasterRef.current ||
                !sceneRef.current ||
                !cameraRef.current ||
                !tooltipRef.current ||
                !boxMeshGroupRef.current
            )
                return

            // Check if we clicked on the tooltip itself
            if (tooltipRef.current.contains(event.target as Node)) {
                return // Don't process the click if it's inside the tooltip
            }

            raycasterRef.current.setFromCamera(
                mouseRef.current,
                cameraRef.current
            )

            const intersects = raycasterRef.current.intersectObjects(
                boxMeshGroupRef.current.children || [],
                true
            )

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

                // Set the selected box index in the store
                setSelectedBoxIndex(boxIndex)

                const boxInfo = getBoxInfoFromObject(boxObject)

                // Show tooltip with box info and visibility toggle button
                tooltipRef.current.innerHTML = createTooltipContent(
                    boxInfo,
                    boxIndex
                )

                // Make the tooltip interactive
                tooltipRef.current.style.pointerEvents = 'auto'

                // Position the tooltip near the mouse
                tooltipRef.current.style.left = `${event.clientX + 10}px`
                tooltipRef.current.style.top = `${event.clientY + 10}px`
                tooltipRef.current.classList.remove('hidden')
            } else {
                setSelectedBoxIndex(null)
                tooltipRef.current.classList.add('hidden')
                tooltipRef.current.style.pointerEvents = 'none'
            }
        }

        containerRef.current.addEventListener('mousemove', handleMouseMove)
        containerRef.current.addEventListener('click', handleClick)

        // Add the tooltip click handler
        if (tooltipRef.current) {
            tooltipRef.current.addEventListener('click', handleTooltipClick)

            // Add some basic CSS to make the buttons look better
            const style = document.createElement('style')
            style.textContent = `
                .tooltip-button {
                    background-color: #444;
                    border: none;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 6px;
                    font-size: 11px;
                }
                .tooltip-button:hover {
                    background-color: #555;
                }
                .tooltip-content {
                    max-width: 200px;
                }
                .tooltip-button-container {
                    display: flex;
                    justify-content: center;
                    margin-top: 6px;
                }
            `
            document.head.appendChild(style)
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener(
                    'mousemove',
                    handleMouseMove
                )
                containerRef.current.removeEventListener('click', handleClick)
            }

            if (tooltipRef.current) {
                tooltipRef.current.classList.add('hidden')
                tooltipRef.current.style.pointerEvents = 'none'
                tooltipRef.current.removeEventListener(
                    'click',
                    handleTooltipClick
                )
            }

            // Remove the style element we added
            const styleElement = document.querySelector(
                'style[data-for="tooltip-styles"]'
            )
            if (styleElement) {
                styleElement.remove()
            }
        }
    }, [
        debugMode,
        wallThickness,
        setSelectedBoxIndex,
        toggleBoxVisibility,
        isBoxVisible,
    ])

    return (
        <div className="bg-background flex h-full flex-col">
            <div className="flex flex-grow flex-col overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Settings Panel */}
                    <ResizablePanel
                        defaultSize={20}
                        minSize={15}
                        maxSize={30}
                        className="flex flex-col"
                    >
                        <div className="flex-grow overflow-auto">
                            <ConfigSidebarWrapper
                                sceneRef={sceneRef}
                                boxMeshGroupRef={boxMeshGroupRef}
                            />
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
    )
}
