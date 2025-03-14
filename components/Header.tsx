'use client'
import React, { useState, useEffect } from 'react'
import * as THREE from 'three'
import ShareButton from './ShareButton'
import ExportButton from './ExportButton'

interface HeaderProps {
    title?: string
    sceneRef: React.MutableRefObject<THREE.Scene | null>
    boxMeshGroupRef: React.MutableRefObject<THREE.Group | null>
}

export default function Header({
    title = 'Box Grid Generator',
    sceneRef,
    boxMeshGroupRef,
}: HeaderProps) {
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
    return (
        <header className="flex max-w-screen items-center justify-between border-b p-4">
            <h1 className="text-xl font-bold">{title}</h1>

            {isSceneReady && (
                <div className="grid grid-cols-2 gap-4">
                    <ShareButton />
                    <ExportButton
                        scene={sceneRef.current!}
                        boxMeshGroup={boxMeshGroupRef.current!}
                    />
                </div>
            )}
        </header>
    )
}
