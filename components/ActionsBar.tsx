'use client'
import * as React from 'react'
import * as THREE from 'three'

import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from '@/components/ui/menubar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { cameraSettings } from '@/lib/defaults'
import { keyPress } from '@/lib/keyHelper'
import { useStore } from '@/lib/store'
import {
    Box,
    Camera,
    Combine,
    EyeOff,
    Grid2X2,
    SquareSplitHorizontal,
    X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ActionsBar() {
    const store = useStore()
    const position = store.actionsBarPosition || 'bottom'
    const camera = store.cameraRef
    const controls = store.controlsRef
    const initialPosition = React.useRef(
        new THREE.Vector3(
            cameraSettings.position.x,
            cameraSettings.position.y,
            cameraSettings.position.z
        )
    )
    const [enableClearSelection, setEnableClearSelection] = useState(false)
    const [canSplit, setCanSplit] = useState(false)

    const resetCamera = () => {
        if (!camera.current || !controls.current) return

        camera.current.position.copy(initialPosition.current)
        camera.current.up.set(0, 1, 0)
        controls.current.target.set(0, 0, 0)
        controls.current.update()
    }

    const setTopView = () => {
        if (!camera.current || !controls.current) return

        const distance = camera.current.position.length()

        camera.current.position.set(0, distance, 0)
        camera.current.up.set(0, 1, 0)
        controls.current.target.set(0, 0, 0)
        controls.current.update()
    }

    useEffect(() => {
        if (store.selectedGroups.length > 0) {
            setEnableClearSelection(true)
            if (store.selectedGroups.length == 1) {
                if (store.selectedGroups[0].userData.group != 0) {
                    setCanSplit(true)
                }
            } else {
                setCanSplit(false)
            }
        } else {
            setEnableClearSelection(false)
        }
    }, [store.selectedGroups])

    return (
        <div
            className={`fixed ${position === 'top' ? 'top-20' : 'bottom-14'} left-1/2 z-10 -translate-x-1/2 transform relative w-fit`}
        >
            <TooltipProvider>
                <div className="flex rounded-lg border border-neutral-300 bg-white p-1 shadow-md">
                    {/* Camera Views Menu */}
                    <Menubar className="border-0 bg-transparent p-0">
                        <MenubarMenu>
                            <MenubarTrigger
                                className="cursor-pointer px-2 py-1"
                                title="Camera Views"
                            >
                                <Camera className="h-5 w-5" />
                            </MenubarTrigger>
                            <MenubarContent>
                                <MenubarItem onClick={resetCamera}>
                                    <Box className="h-4 w-4" />
                                    <p>Inital View</p>
                                </MenubarItem>
                                <MenubarItem onClick={setTopView}>
                                    <Grid2X2 className="h-4 w-4" />
                                    <p>Top View</p>
                                </MenubarItem>
                            </MenubarContent>
                        </MenubarMenu>
                    </Menubar>
                    <div className="mx-1 h-8 w-px self-center bg-gray-300 dark:bg-gray-600" />
                    {/* Direct Actions */}
                    <Tooltip>
                        <TooltipTrigger
                            className={
                                'flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100' +
                                (enableClearSelection
                                    ? ' cursor-pointer'
                                    : ' cursor-default text-neutral-400')
                            }
                            onClick={() => keyPress('h')}
                            disabled={!enableClearSelection}
                        >
                            <EyeOff className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Toggle Visibility (H)</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger
                            className={
                                'flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100' +
                                (enableClearSelection
                                    ? ' cursor-pointer'
                                    : ' cursor-not-allowed text-neutral-400')
                            }
                            onClick={() => store.setSelectedGroups([])}
                            disabled={!enableClearSelection}
                        >
                            <X className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Clear Selection (Esc)</p>
                        </TooltipContent>
                    </Tooltip>
                    <div className="mx-1 h-8 w-px self-center bg-gray-300 dark:bg-gray-600" />
                    <Tooltip>
                        <TooltipTrigger
                            className={
                                'flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100' +
                                (enableClearSelection
                                    ? ' cursor-pointer'
                                    : ' cursor-not-allowed text-neutral-400')
                            }
                            disabled={!enableClearSelection}
                            onClick={() => {
                                if (canSplit) {
                                    keyPress('s')
                                } else {
                                    keyPress('c')
                                }
                            }}
                        >
                            {canSplit ? (
                                <SquareSplitHorizontal className="h-4 w-4" />
                            ) : (
                                <Combine className="h-4 w-4" />
                            )}
                        </TooltipTrigger>
                        <TooltipContent>
                            {canSplit ? (
                                <p>Split Combined Box (S)</p>
                            ) : (
                                <p>Combine Selected Boxes (C)</p>
                            )}
                        </TooltipContent>
                    </Tooltip>{' '}
                </div>
            </TooltipProvider>
        </div>
    )
}
