'use client'
import { useState, useEffect } from 'react'
import * as THREE from 'three'
import ConfigSidebar from './ConfigSidebar'

interface ConfigSidebarWrapperProps {
    sceneRef: React.MutableRefObject<THREE.Scene | null>
    boxMeshGroupRef: React.MutableRefObject<THREE.Group | null>
}

/**
 * Wrapper component that handles the timing of scene initialization
 * and only renders the ConfigSidebar when the scene is ready
 */
export default function ConfigSidebarWrapper({
    sceneRef,
    boxMeshGroupRef,
}: ConfigSidebarWrapperProps) {
    const [isSceneReady, setIsSceneReady] = useState(false)

    useEffect(() => {
        const checkRefsAvailable = () => {
            if (sceneRef.current && boxMeshGroupRef.current) {
                setIsSceneReady(true)
                return true
            }
            return false
        }

        if (checkRefsAvailable()) return

        const intervalId = setInterval(() => {
            if (checkRefsAvailable()) {
                clearInterval(intervalId)
            }
        }, 100)

        return () => {
            clearInterval(intervalId)
        }
    }, [sceneRef, boxMeshGroupRef])

    if (!isSceneReady) {
        return (
            <div className="space-y-4 p-4">
                <div className="h-8 animate-pulse rounded bg-gray-200"></div>
                <div className="h-32 animate-pulse rounded bg-gray-200"></div>
                <div className="h-24 animate-pulse rounded bg-gray-200"></div>
                <p className="text-muted-foreground mt-4 text-center text-sm">
                    Initializing 3D scene...
                </p>
            </div>
        )
    }

    return (
        <ConfigSidebar
            scene={sceneRef.current!}
            boxMeshGroup={boxMeshGroupRef.current!}
        />
    )
}
