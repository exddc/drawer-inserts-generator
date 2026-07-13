'use client'

import type { GridCommands } from '@/hooks/useGridCommands'
import { canCombineGridBoxes } from '@/lib/gridCombine'
import { getBoxById, getGridBoxes } from '@/lib/gridVisibility'
import { useStore } from '@/lib/store'
import type { GeneratedBoxMetadata, SelectionId } from '@/lib/types'
import {
    Boxes,
    Combine,
    Eye,
    MousePointerClick,
    SquareDashed,
    SquareSplitHorizontal,
} from 'lucide-react'
import { type RefObject, useEffect, useRef, useState } from 'react'

declare global {
    interface Window {
        contextMenuOpen?: boolean
    }
}

interface BoxContextMenuProps {
    containerRef: RefObject<HTMLDivElement | null>
    pickBoxAtClientPoint: (
        clientX: number,
        clientY: number
    ) => SelectionId | null
    commands: GridCommands
}

export default function BoxContextMenu({
    containerRef,
    pickBoxAtClientPoint,
    commands,
}: BoxContextMenuProps) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ x: 0, y: 0 })
    const [boxInfos, setBoxInfos] = useState<GeneratedBoxMetadata | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const grid = useStore((state) => state.grid)
    const wallHeight = useStore((state) => state.wallHeight)
    const setSelectedBoxIds = useStore((state) => state.setSelectedBoxIds)
    const selectedBoxIds = useStore((state) => state.selectedBoxIds)

    const [canSplit, setCanSplit] = useState(false)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            if (menuRef.current?.contains(e.target as Node)) {
                setPos({ x: e.clientX, y: e.clientY })
                return
            }

            const boxId = pickBoxAtClientPoint(e.clientX, e.clientY)

            if (boxId) {
                setBoxInfos(
                    getBoxById(
                        useStore.getState().grid,
                        boxId,
                        useStore.getState().wallHeight
                    ) ?? null
                )
            } else {
                setBoxInfos(null)
            }
            setPos({ x: e.clientX, y: e.clientY })
            setOpen(true)
        }

        container.addEventListener('contextmenu', onContextMenu)

        return () => {
            if (container) {
                container.removeEventListener('contextmenu', onContextMenu)
            }
        }
    }, [containerRef, pickBoxAtClientPoint])

    useEffect(() => {
        if (!open) {
            window.contextMenuOpen = false
            return
        }

        window.contextMenuOpen = true

        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setOpen(false)
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [open])

    useEffect(() => {
        const selectedBoxes = getGridBoxes(grid, wallHeight).filter((box) =>
            selectedBoxIds.includes(box.id)
        )
        if (selectedBoxes.length === 1) {
            if (selectedBoxes[0].group !== 0) {
                setCanSplit(true)
            } else {
                setCanSplit(false)
            }
        } else {
            setCanSplit(false)
        }
    }, [selectedBoxIds, grid, wallHeight])

    const handleMenuItemClick = (
        action?:
            | 'Select Box'
            | 'Add to Selection'
            | 'Split Box'
            | 'Combine Selected Boxes'
            | 'Toggle Visibility'
            | 'Clear Selection'
    ) => {
        if (!action) {
            setOpen(false)
            return
        }

        if (action === 'Select Box') {
            if (boxInfos) {
                setSelectedBoxIds([boxInfos.id])
            }
        } else if (action === 'Add to Selection') {
            if (boxInfos) {
                if (!selectedBoxIds.includes(boxInfos.id)) {
                    setSelectedBoxIds([...selectedBoxIds, boxInfos.id])
                }
            }
        } else if (action === 'Split Box') {
            if (canSplit) {
                commands.splitSelection()
            }
        } else if (action === 'Combine Selected Boxes') {
            if (selectedBoxIds.length >= 2) {
                commands.combineSelection()
            }
        } else if (action === 'Toggle Visibility') {
            commands.toggleSelectionVisibility()
        } else if (action === 'Clear Selection') {
            commands.clearSelection()
        }

        setOpen(false)
    }

    if (!open) return null

    const isBoxSpecificMenu = boxInfos != null

    const isBoxSelected = boxInfos && selectedBoxIds.includes(boxInfos.id)

    const canCombine =
        selectedBoxIds.length >= 2 &&
        canCombineGridBoxes(
            grid,
            getGridBoxes(grid, wallHeight).filter((box) =>
                selectedBoxIds.includes(box.id)
            )
        )

    if (selectedBoxIds.length === 0) {
        // if no boxes are selected, don't show the menu
        return null
    }

    return (
        <div
            ref={menuRef}
            role="menu"
            className="fixed z-50 min-w-[300px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80"
            style={{
                left: pos.x,
                top: pos.y,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
                e.stopPropagation()
                e.preventDefault()
            }}
        >
            {isBoxSpecificMenu ? (
                <>
                    {boxInfos.dimensions && (
                        <div className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground truncate">
                            {`W: ${boxInfos.dimensions.width?.toFixed(1) ?? 'N/A'} D: ${boxInfos.dimensions.depth?.toFixed(1) ?? 'N/A'} H: ${boxInfos.dimensions.height?.toFixed(1) ?? 'N/A'} mm`}
                        </div>
                    )}
                    <div className="px-2 py-1.5 text-sm font-semibold">
                        Box {boxInfos.index}
                        {boxInfos.group != 0
                            ? `(| Group ${boxInfos.group})`
                            : ''}
                    </div>

                    {!isBoxSelected && (
                        <>
                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() =>
                                    handleMenuItemClick('Select Box')
                                }
                            >
                                <MousePointerClick className="mr-2 h-4 w-4" />
                                Select Box
                                <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                    Click
                                </span>
                            </div>

                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() =>
                                    handleMenuItemClick('Add to Selection')
                                }
                            >
                                <Boxes className="mr-2 h-4 w-4" />
                                Add to Selection
                                <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                    Cmd+Click
                                </span>
                            </div>
                        </>
                    )}

                    {isBoxSelected && (
                        <>
                            <div className="-mx-1 my-1 h-px bg-border" />

                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() =>
                                    handleMenuItemClick('Toggle Visibility')
                                }
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Toggle Box Visibility
                                <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                    H
                                </span>
                            </div>
                        </>
                    )}

                    <div className="-mx-1 my-1 h-px bg-border" />

                    {canSplit && (
                        <div
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleMenuItemClick('Split Box')}
                        >
                            <SquareSplitHorizontal className="mr-2 h-4 w-4" />
                            Split Box
                            <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                S
                            </span>
                        </div>
                    )}

                    {canCombine && (
                        <div
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() =>
                                handleMenuItemClick('Combine Selected Boxes')
                            }
                            title="Combine selected boxes"
                        >
                            <Combine className="mr-2 h-4 w-4" />
                            Combine Selected Boxes
                            <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                C
                            </span>
                        </div>
                    )}

                    {(canSplit || canCombine) && (
                        <div className="-mx-1 my-1 h-px bg-border" />
                    )}

                    <div
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleMenuItemClick('Clear Selection')}
                    >
                        <SquareDashed className="mr-2 h-4 w-4" />
                        Clear Selection
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            Esc
                        </span>
                    </div>
                </>
            ) : (
                <>
                    <div className="px-2 py-1.5 text-sm font-semibold">
                        Actions
                    </div>

                    <div
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                            handleMenuItemClick('Toggle Visibility')
                        }}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Toggle Selected Visibility
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            H
                        </span>
                    </div>

                    {canCombine && (
                        <div
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() =>
                                handleMenuItemClick('Combine Selected Boxes')
                            }
                            title="Combine selected boxes"
                        >
                            <Combine className="mr-2 h-4 w-4" />
                            Combine Selected Boxes
                            <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                C
                            </span>
                        </div>
                    )}

                    <div className="-mx-1 my-1 h-px bg-border" />

                    <div
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleMenuItemClick('Clear Selection')}
                    >
                        <SquareDashed className="mr-2 h-4 w-4" />
                        Clear Selection
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            Esc
                        </span>
                    </div>
                </>
            )}
        </div>
    )
}
