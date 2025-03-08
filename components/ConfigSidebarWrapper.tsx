'use client';
import { useState, useEffect } from 'react';
import * as THREE from 'three';
import ConfigSidebar from './ConfigSidebar';

interface ConfigSidebarWrapperProps {
    sceneRef: React.MutableRefObject<THREE.Scene | null>;
    boxMeshGroupRef: React.MutableRefObject<THREE.Group | null>;
}

/**
 * Wrapper component that handles the timing of scene initialization
 * and only renders the ConfigSidebar when the scene is ready
 */
export default function ConfigSidebarWrapper({
    sceneRef,
    boxMeshGroupRef,
}: ConfigSidebarWrapperProps) {
    const [isSceneReady, setIsSceneReady] = useState(false);

    // Use an effect to monitor when the scene and boxMeshGroup are available
    useEffect(() => {
        // Check if both refs are available
        const checkRefsAvailable = () => {
            if (sceneRef.current && boxMeshGroupRef.current) {
                setIsSceneReady(true);
                return true;
            }
            return false;
        };

        // Try immediately first
        if (checkRefsAvailable()) return;

        // If not ready, set up a polling mechanism
        const intervalId = setInterval(() => {
            if (checkRefsAvailable()) {
                clearInterval(intervalId);
            }
        }, 100); // Check every 100ms

        // Clean up
        return () => {
            clearInterval(intervalId);
        };
    }, [sceneRef, boxMeshGroupRef]);

    // Only render ConfigSidebar when the scene is ready
    if (!isSceneReady) {
        return (
            <div className="p-4 space-y-4">
                <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-32 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-24 bg-gray-200 animate-pulse rounded"></div>
                <p className="text-sm text-center text-muted-foreground mt-4">
                    Initializing 3D scene...
                </p>
            </div>
        );
    }

    return (
        <ConfigSidebar
            scene={sceneRef.current!}
            boxMeshGroup={boxMeshGroupRef.current!}
        />
    );
}
