'use client'

import ActionsBar from '@/components/ActionsBar'
import BoxContextMenu from '@/components/BoxContextMenu'
import HiddenBoxesDisplay from '@/components/HiddenBoxesDisplay'
import { useGridCommands } from '@/hooks/useGridCommands'
import { useGridLayout } from '@/hooks/useGridLayout'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { useSceneView } from '@/hooks/useSceneView'
import { getMinimumBoxSize } from '@/lib/parameterValidation'
import type { ScenePointerSelection } from '@/lib/sceneViewAdapter'
import { useStore } from '@/lib/store'
import { useCallback } from 'react'

export default function Home() {
    useLayoutPersistence()
    const state = useStore()
    const commands = useGridCommands()
    const minBoxSize = getMinimumBoxSize(
        state.wallThickness,
        state.cornerRadius
    )
    const grid = useGridLayout({
        grid: state.grid,
        totalWidth: state.totalWidth,
        totalDepth: state.totalDepth,
        maxBoxWidth: state.maxBoxWidth,
        maxBoxDepth: state.maxBoxDepth,
        minBoxSize,
        setGrid: state.setGrid,
        layoutHydrated: state.layoutHydrated,
    })

    const handlePointerSelection = useCallback(
        ({ boxId, multiSelect }: ScenePointerSelection) => {
            const currentState = useStore.getState()
            const selectedBoxIds = multiSelect
                ? [...currentState.selectedBoxIds]
                : []
            const selectedIndex = selectedBoxIds.indexOf(boxId)

            if (selectedIndex === -1) selectedBoxIds.push(boxId)
            else selectedBoxIds.splice(selectedIndex, 1)
            currentState.setSelectedBoxIds(selectedBoxIds)
        },
        []
    )

    const sceneView = useSceneView({
        grid,
        totalWidth: state.totalWidth,
        totalDepth: state.totalDepth,
        wallThickness: state.wallThickness,
        cornerRadius: state.cornerRadius,
        wallHeight: state.wallHeight,
        generateBottom: state.generateBottom,
        redrawTrigger: state.redrawTrigger,
        showCornerLines: state.showCornerLines,
        cornerLineColor: state.cornerLineColor,
        cornerLineOpacity: state.cornerLineOpacity,
        showHelperGrid: state.showHelperGrid,
        selectedBoxIds: state.selectedBoxIds,
        standardColor: state.standardColor,
        selectedColor: state.selectedColor,
        onPointerSelection: handlePointerSelection,
    })

    return (
        <div className="bg-background flex h-full flex-col">
            <div className="flex flex-grow flex-col overflow-hidden">
                <div className="h-full">
                    <div className="h-full flex flex-col lg:block">
                        <div
                            ref={sceneView.containerRef}
                            className="relative h-full w-full"
                        >
                            <BoxContextMenu
                                containerRef={sceneView.containerRef}
                                pickBoxAtClientPoint={
                                    sceneView.pickBoxAtClientPoint
                                }
                                commands={commands}
                            />
                            <HiddenBoxesDisplay />
                        </div>
                        <ActionsBar
                            onResetCamera={sceneView.resetCamera}
                            onSetTopView={sceneView.setTopView}
                            commands={commands}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
