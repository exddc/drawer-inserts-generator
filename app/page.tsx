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
import { useInteractions } from '@/hooks/useInteractions'
import { useModelUpdater } from '@/hooks/useModelUpdater'
import { useSceneSetup } from '@/hooks/useSceneSetup'
import { createBoxModel } from '@/lib/modelGenerator'
import { useBoxStore } from '@/lib/store'
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
        debugMode,
        boxWidths,
        boxDepths,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        selectedBoxIndex,
        selectedBoxIndices,
        hiddenBoxes,
        getBoxHexColor,
        getHighlightHexColor,
        loadFromUrl,
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

    // Initialize the scene, initial model, and add event listeners
    useEffect(() => {
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

            // Update raycast manager when box mesh group changes
            if (window.raycastManager && cameraRef.current) {
                window.raycastManager.init(
                    cameraRef.current,
                    boxMeshGroupRef.current
                )
            }
        }
    }, [])

    // Use custom hooks to handle all the Three.js setup and interactions
    useSceneSetup(
        // @ts-ignore - To be fixed
        containerRef,
        rendererRef,
        sceneRef,
        cameraRef,
        controlsRef,
        boxMeshGroupRef,
        gridHelperRef,
        axesHelperRef,
        raycasterRef,
        mouseRef
    )

    useModelUpdater(
        // @ts-ignore - To be fixed
        sceneRef,
        boxMeshGroupRef,
        gridHelperRef,
        axesHelperRef,
        cameraRef
    )

    useInteractions(
        // @ts-ignore - To be fixed
        containerRef,
        raycasterRef,
        cameraRef,
        boxMeshGroupRef,
        mouseRef
    )

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
