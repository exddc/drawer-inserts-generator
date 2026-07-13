'use client'

import { generateCustomBox } from '@/lib/boxHelper'
import {
    SceneViewAdapter,
    type ScenePointerHandler,
} from '@/lib/sceneViewAdapter'
import type { Grid, SelectionId } from '@/lib/types'
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'

interface SceneViewOptions {
    grid: Grid
    totalWidth: number
    totalDepth: number
    wallThickness: number
    cornerRadius: number
    wallHeight: number
    generateBottom: boolean
    redrawTrigger: number
    showCornerLines: boolean
    cornerLineColor: number
    cornerLineOpacity: number
    showHelperGrid: boolean
    selectedBoxIds: SelectionId[]
    standardColor: number
    selectedColor: number
    onPointerSelection: ScenePointerHandler
}

export interface SceneViewControls {
    containerRef: RefObject<HTMLDivElement | null>
    pickBoxAtClientPoint: (
        clientX: number,
        clientY: number
    ) => SelectionId | null
    resetCamera: () => void
    setTopView: () => void
}

export function useSceneView(options: SceneViewOptions): SceneViewControls {
    const containerRef = useRef<HTMLDivElement>(null)
    const adapterRef = useRef<SceneViewAdapter | null>(null)
    const pointerHandlerRef = useRef(options.onPointerSelection)
    const selectionRef = useRef({
        selectedBoxIds: options.selectedBoxIds,
        standardColor: options.standardColor,
        selectedColor: options.selectedColor,
    })
    pointerHandlerRef.current = options.onPointerSelection
    selectionRef.current = {
        selectedBoxIds: options.selectedBoxIds,
        standardColor: options.standardColor,
        selectedColor: options.selectedColor,
    }

    const pickBoxAtClientPoint = useCallback(
        (clientX: number, clientY: number) =>
            adapterRef.current?.pickBoxAtClientPoint(clientX, clientY) ?? null,
        []
    )
    const resetCamera = useCallback(() => {
        adapterRef.current?.resetCamera()
    }, [])
    const setTopView = useCallback(() => {
        adapterRef.current?.setTopView()
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const adapter = new SceneViewAdapter(container, (selection) => {
            pointerHandlerRef.current(selection)
        })
        adapterRef.current = adapter

        return () => {
            adapter.dispose()
            if (adapterRef.current === adapter) adapterRef.current = null
        }
    }, [])

    useEffect(() => {
        const adapter = adapterRef.current
        if (!adapter) return

        const box = generateCustomBox(options.grid, {
            wallThickness: options.wallThickness,
            cornerRadius: options.cornerRadius,
            wallHeight: options.wallHeight,
            generateBottom: options.generateBottom,
            cornerLines: {
                show: options.showCornerLines,
                color: options.cornerLineColor,
                opacity: options.cornerLineOpacity,
            },
        })
        box.position.set(-options.totalWidth / 2, 0, -options.totalDepth / 2)
        const selection = selectionRef.current
        adapter.replaceBox(
            box,
            selection.selectedBoxIds,
            selection.standardColor,
            selection.selectedColor
        )
    }, [
        options.grid,
        options.wallThickness,
        options.cornerRadius,
        options.wallHeight,
        options.generateBottom,
        options.totalWidth,
        options.totalDepth,
        options.redrawTrigger,
        options.showCornerLines,
        options.cornerLineColor,
        options.cornerLineOpacity,
    ])

    useEffect(() => {
        adapterRef.current?.applySelection(
            options.selectedBoxIds,
            options.standardColor,
            options.selectedColor
        )
    }, [options.selectedBoxIds, options.standardColor, options.selectedColor])

    useEffect(() => {
        const adapter = adapterRef.current
        if (!adapter) return

        if (!options.showHelperGrid) {
            adapter.replaceHelperGrid(null)
            return
        }

        const size = Math.max(options.totalWidth, options.totalDepth) + 50
        adapter.replaceHelperGrid(
            new THREE.GridHelper(size, Math.ceil(size / 10))
        )
    }, [options.totalWidth, options.totalDepth, options.showHelperGrid])

    return { containerRef, pickBoxAtClientPoint, resetCamera, setTopView }
}
