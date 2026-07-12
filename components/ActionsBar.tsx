'use client'

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
import type { GridCommands } from '@/hooks/useGridCommands'
import { canCombineGridBoxes } from '@/lib/gridCombine'
import { getGridBoxes } from '@/lib/gridVisibility'
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

interface ActionsBarProps {
    onResetCamera: () => void
    onSetTopView: () => void
    commands: GridCommands
}

export default function ActionsBar({
    onResetCamera,
    onSetTopView,
    commands,
}: ActionsBarProps) {
    const store = useStore()
    const position = store.actionsBarPosition || 'bottom'
    const selectedBoxes = getGridBoxes(store.grid, store.wallHeight).filter(
        (box) => store.selectedBoxIds.includes(box.id)
    )
    const enableClearSelection = selectedBoxes.length > 0
    const canSplit = selectedBoxes.length === 1 && selectedBoxes[0].group !== 0
    const canCombine =
        selectedBoxes.length >= 2 &&
        canCombineGridBoxes(store.grid, selectedBoxes)
    const canUseBoxAction = canSplit || canCombine

    return (
        <div className="lg:bottom-18 lg:ml-auto lg:-right-6 z-10 transform relative lg:w-fit">
            <TooltipProvider>
                <div className="flex border-t-[12px] lg:border-[24px] border-[#ededed] bg-white p-1 lg:p-2 items-center justify-center">
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
                                <MenubarItem onClick={onResetCamera}>
                                    <Box className="h-4 w-4" />
                                    <p>Inital View</p>
                                </MenubarItem>
                                <MenubarItem onClick={onSetTopView}>
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
                            onClick={commands.toggleSelectionVisibility}
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
                            onClick={commands.clearSelection}
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
                                (canUseBoxAction
                                    ? ' cursor-pointer'
                                    : ' cursor-not-allowed text-neutral-400')
                            }
                            disabled={!canUseBoxAction}
                            onClick={() => {
                                if (canSplit) {
                                    commands.splitSelection()
                                } else if (canCombine) {
                                    commands.combineSelection()
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
