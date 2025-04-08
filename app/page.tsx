'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

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
import { useParameterChange } from '@/hooks/useParameterChange'
import { useSceneSetup } from '@/hooks/useSceneSetup'
import { useBoxStore } from '@/lib/store'

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
    // Access state from Zustand store
    const { debugMode, loadFromUrl } = useBoxStore()

    // Set up refs for Three.js components
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

    // Update the model and grid when parameters change
    useParameterChange(
        // @ts-ignore - To be fixed
        sceneRef,
        boxMeshGroupRef,
        gridHelperRef,
        cameraRef
    )

    // Handle all user interactions with the 3D scene
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
