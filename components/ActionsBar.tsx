'use client'
import * as React from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
    Menubar,
    MenubarMenu,
    MenubarTrigger,
    MenubarContent,
    MenubarItem,
} from '@/components/ui/menubar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Camera, EyeOff, X, Grid2X2, Box } from 'lucide-react'
import { useBoxStore } from '@/lib/store'
import CombineBoxesButton from './CombineBoxesButton'

interface ActionsBarProps {
    camera: React.MutableRefObject<THREE.PerspectiveCamera | null>
    controls: React.MutableRefObject<OrbitControls | null>
}

export default function ActionsBar({ camera, controls }: ActionsBarProps) {
    const {
        selectedBoxIndices,
        toggleSelectedBoxesVisibility,
        clearSelectedBoxes,
        actionsBarPosition,
    } = useBoxStore()

    // Get position from store or default to 'bottom'
    const position = actionsBarPosition || 'bottom'

    // Initial camera position to reset to
    const initialPosition = React.useRef(new THREE.Vector3(-110, -130, 110))

    const resetCamera = () => {
        if (!camera.current || !controls.current) return

        // Reset to initial position
        camera.current.position.copy(initialPosition.current)
        camera.current.up.set(0, 0, 1)

        // Look at center
        controls.current.target.set(0, 0, 0)
        controls.current.update()
    }

    const setTopView = () => {
        if (!camera.current || !controls.current) return

        // Set top-down view
        const distance = camera.current.position.length()
        camera.current.position.set(0, 0, distance)
        camera.current.up.set(0, 0, 1)

        // Look at center
        controls.current.target.set(0, 0, 0)
        controls.current.update()
    }

    const hasSelection = selectedBoxIndices.size > 0

    return (
        <div
            className={`fixed ${position === 'top' ? 'top-14' : 'bottom-14'} left-1/2 z-10 -translate-x-1/2 transform`}
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
                                (hasSelection
                                    ? ' cursor-pointer'
                                    : ' cursor-default text-neutral-400')
                            }
                            onClick={toggleSelectedBoxesVisibility}
                            disabled={!hasSelection}
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
                                (hasSelection
                                    ? ' cursor-pointer'
                                    : ' cursor-default text-neutral-400')
                            }
                            onClick={clearSelectedBoxes}
                            disabled={!hasSelection}
                        >
                            <X className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Clear Selection (Esc)</p>
                        </TooltipContent>
                    </Tooltip>

                    <div className="mx-1 h-8 w-px self-center bg-gray-300 dark:bg-gray-600" />

                    {/* Add CombineBoxesButton */}
                    <CombineBoxesButton />
                </div>
            </TooltipProvider>
        </div>
    )
}
