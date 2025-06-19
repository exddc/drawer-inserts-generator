'use client'

import { useStore } from '@/lib/store'
import { BoxInfo } from '@/lib/types'
import {
    Boxes,
    Combine,
    Eye,
    MousePointerClick,
    SquareDashed,
    SquareSplitHorizontal,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

declare global {
    interface Window {
        contextMenuOpen?: boolean
    }
}

export default function BoxContextMenu() {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ x: 0, y: 0 })
    const [boxInfos, setBoxInfos] = useState<BoxInfo | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const storeContainerRef = useStore((state) => state.containerRef)
    const cameraRef = useStore((state) => state.cameraRef)
    const boxRef = useStore((state) => state.boxRef)
    const setSelectedGroups = useStore((state) => state.setSelectedGroups)
    const selectedGroups = useStore((state) => state.selectedGroups)

    const [canSplit, setCanSplit] = useState(false)

    useEffect(() => {
        const container = storeContainerRef.current
        const cam = cameraRef.current
        const grp = boxRef.current

        if (!container || !cam || !grp) {
            return
        }

        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()

        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            if (menuRef.current && menuRef.current.contains(e.target as Node)) {
                setPos({ x: e.clientX, y: e.clientY })
                return
            }

            if (!container) return
            const rect = container.getBoundingClientRect()
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

            raycaster.setFromCamera(mouse, cam)
            const hits = raycaster.intersectObjects(grp.children, true)
            const hit = hits.find((h) => {
                const p = h.object.parent as THREE.Group
                return typeof p.userData.group === 'number'
            })

            if (hit && hit.object.parent) {
                setBoxInfos(hit.object.parent.userData as BoxInfo)
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
    }, [storeContainerRef, cameraRef, boxRef])

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
        if (selectedGroups.length === 1) {
            if (selectedGroups[0].userData.group !== 0) {
                setCanSplit(true)
            } else {
                setCanSplit(false)
            }
        } else {
            setCanSplit(false)
        }
    }, [selectedGroups])

    const handleMenuItemClick = (action?: string) => {
        if (!action || !boxInfos) {
            setOpen(false)
            return
        }

        if (action === 'Select Box') {
            // Find the box group that matches the boxInfos using the unique ID
            const boxGroup = boxRef.current?.children.find(
                (child) => child.userData.id === boxInfos.id
            ) as THREE.Group | undefined

            if (boxGroup) {
                setSelectedGroups([boxGroup])
            }
        } else if (action === 'Add to Selection') {
            // Find the box group that matches the boxInfos using the unique ID
            const boxGroup = boxRef.current?.children.find(
                (child) => child.userData.id === boxInfos.id
            ) as THREE.Group | undefined

            if (boxGroup) {
                // Add to existing selection if not already selected
                if (!selectedGroups.includes(boxGroup)) {
                    setSelectedGroups([...selectedGroups, boxGroup])
                }
            }
        } else if (action === 'Split Box') {
            if (canSplit) {
                window.dispatchEvent(
                    new KeyboardEvent('keydown', {
                        key: 's',
                        code: 's',
                    })
                )
            }
        } else if (action === 'Combine Selected Boxes') {
            if (selectedGroups.length >= 2) {
                window.dispatchEvent(
                    new KeyboardEvent('keydown', {
                        key: 'c',
                        code: 'c',
                    })
                )
            }
        } else if (action === 'Toggle Box Visibility') {
            window.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'h',
                    code: 'h',
                })
            )
        } else if (action === 'Clear Selection') {
            setSelectedGroups([])
        }

        setOpen(false)
    }

    if (!open) return null

    const isBoxSpecificMenu = boxInfos != null

    const isBoxSelected =
        boxInfos &&
        selectedGroups.some((group) => group.userData.id === boxInfos.id)

    const canCombine = selectedGroups.length >= 2

    return (
        <div
            ref={menuRef}
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
                        Box {boxInfos.id}
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
                                    handleMenuItemClick('Toggle Box Visibility')
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
                        onClick={() =>
                            handleMenuItemClick('Toggle Selected Visibility')
                        }
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Toggle Selected Visibility
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            H
                        </span>
                    </div>

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
