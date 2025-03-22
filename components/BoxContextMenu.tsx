'use client'
import { useBoxStore } from '@/lib/store'
import {
    Boxes,
    Check,
    Combine,
    Eye,
    EyeOff,
    MousePointerClick,
    SquareSplitHorizontal,
    Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface BoxContextMenuProps {
    containerRef: React.RefObject<HTMLDivElement>
}

export default function BoxContextMenu({ containerRef }: BoxContextMenuProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isVisible, setIsVisible] = useState(false)
    const [clickedBoxIndex, setClickedBoxIndex] = useState<number | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const {
        selectedBoxIndices,
        toggleBoxSelection,
        clearSelectedBoxes,
        toggleBoxVisibility,
        toggleSelectedBoxesVisibility,
        isBoxVisible,
        isBoxSelected,
        canCombineSelectedBoxes,
        combineSelectedBoxes,
        isCombinedBox,
        isPrimaryBox,
        resetCombinedBoxes,
    } = useBoxStore()

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setIsVisible(false)
            }
        }

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isVisible])

    // Interaction logic with the 3D scene
    useEffect(() => {
        if (!containerRef.current) return

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()

            // Store the click position for the context menu
            setPosition({ x: e.clientX, y: e.clientY })

            if (window.raycastManager && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                const mouseX =
                    ((e.clientX - rect.left) /
                        containerRef.current.clientWidth) *
                        2 -
                    1
                const mouseY =
                    -(
                        (e.clientY - rect.top) /
                        containerRef.current.clientHeight
                    ) *
                        2 +
                    1

                // Perform raycasting to find box under cursor
                const boxIndex = window.raycastManager.getBoxIndexAtPosition(
                    mouseX,
                    mouseY
                )

                console.log('Right-click detected, box index:', boxIndex)

                if (boxIndex !== null) {
                    setClickedBoxIndex(boxIndex)
                    setIsVisible(true)
                } else {
                    // If no box hit, but we have selections, show a selection-focused menu
                    setClickedBoxIndex(null)
                    if (selectedBoxIndices.size > 0) {
                        setIsVisible(true)
                    }
                }
            }
        }

        containerRef.current.addEventListener('contextmenu', handleContextMenu)

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener(
                    'contextmenu',
                    handleContextMenu
                )
            }
        }
    }, [containerRef, selectedBoxIndices])

    const handleSelect = () => {
        if (clickedBoxIndex !== null) {
            toggleBoxSelection(clickedBoxIndex, false)
        }
        setIsVisible(false)
    }

    const handleMultiSelect = () => {
        if (clickedBoxIndex !== null) {
            toggleBoxSelection(clickedBoxIndex, true)
        }
        setIsVisible(false)
    }

    const handleToggleBoxVisibility = () => {
        if (clickedBoxIndex !== null) {
            toggleBoxVisibility(clickedBoxIndex)

            // Show a toast notification for better UX
            const isVisible = isBoxVisible(clickedBoxIndex)
            toast(isVisible ? 'Box is now visible' : 'Box is now hidden', {
                description: `Box ${clickedBoxIndex + 1} visibility changed`,
                duration: 2000,
            })
        }
        setIsVisible(false)
    }

    const handleToggleSelectedVisibility = () => {
        toggleSelectedBoxesVisibility()
        setIsVisible(false)

        toast('Selected boxes visibility toggled', {
            description: `${selectedBoxIndices.size} box(es) updated`,
            duration: 2000,
        })
    }

    const handleCombine = () => {
        console.log(
            'Attempting to combine boxes:',
            canCombineSelectedBoxes(),
            'Selected indices:',
            Array.from(selectedBoxIndices)
        )

        if (canCombineSelectedBoxes()) {
            combineSelectedBoxes()

            toast('Boxes combined', {
                description: `Combined ${selectedBoxIndices.size} boxes`,
                duration: 2000,
            })
        } else {
            // Show a message explaining why boxes can't be combined
            toast.error('Cannot combine boxes', {
                description: `Boxes must be adjacent and in the same row or column to combine`,
                duration: 3000,
            })
        }
        setIsVisible(false)
    }

    const handleSplit = () => {
        if (clickedBoxIndex !== null && isPrimaryBox(clickedBoxIndex)) {
            resetCombinedBoxes()

            toast('Box split', {
                description:
                    'Combined box has been split into individual boxes',
                duration: 2000,
            })
        }
        setIsVisible(false)
    }

    const handleClearSelection = () => {
        clearSelectedBoxes()
        setIsVisible(false)
    }

    // States and conditions for menu items
    const isBoxCurrentlyVisible =
        clickedBoxIndex !== null && isBoxVisible(clickedBoxIndex)
    const isBoxCurrentlySelected =
        clickedBoxIndex !== null && isBoxSelected(clickedBoxIndex)
    const isClickedBoxPrimary =
        clickedBoxIndex !== null && isPrimaryBox(clickedBoxIndex)
    const isClickedBoxCombined =
        clickedBoxIndex !== null && isCombinedBox(clickedBoxIndex)
    const canCombine = canCombineSelectedBoxes()
    const hasSelection = selectedBoxIndices.size > 0

    // Share menu state with parent components and handle escape key
    useEffect(() => {
        // Use a global variable to communicate state
        window.contextMenuOpen = isVisible

        // Add keyboard event listener for Escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                setIsVisible(false)
            }
        }

        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isVisible])

    // Determine if we're showing box-specific or general context menu
    const isBoxSpecificMenu = clickedBoxIndex !== null

    if (!isVisible) return null

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[300px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80"
            style={{
                left: position.x,
                top: position.y,
            }}
            onClick={(e) => e.stopPropagation()} // Stop click propagation to prevent clicking through to the model
            onMouseDown={(e) => e.stopPropagation()} // Stop mousedown propagation for orbit controls
            onMouseUp={(e) => e.stopPropagation()} // Stop mouseup propagation for orbit controls
            onMouseMove={(e) => e.stopPropagation()} // Stop mousemove propagation for orbit controls
            onContextMenu={(e) => e.stopPropagation()} // Stop context menu propagation
        >
            {isBoxSpecificMenu ? (
                /* Box-specific menu when right-clicking on a box */
                <>
                    <div className="px-2 py-1.5 text-sm font-semibold">
                        Box {clickedBoxIndex + 1}
                        {isClickedBoxCombined && ' (Combined)'}
                    </div>

                    <div
                        className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${isBoxCurrentlySelected ? 'opacity-50' : ''}`}
                        onClick={handleSelect}
                    >
                        <MousePointerClick className="mr-2 h-4 w-4" />
                        {isBoxCurrentlySelected ? (
                            <span className="flex items-center">
                                Selected <Check className="ml-2 h-3 w-3" />
                            </span>
                        ) : (
                            'Select Box'
                        )}
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            Click
                        </span>
                    </div>

                    <div
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={handleMultiSelect}
                    >
                        <Boxes className="mr-2 h-4 w-4" />
                        {isBoxCurrentlySelected
                            ? 'Remove from Selection'
                            : 'Add to Selection'}
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            Cmd+Click
                        </span>
                    </div>

                    <div className="-mx-1 my-1 h-px bg-border" />

                    <div
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={handleToggleBoxVisibility}
                    >
                        {isBoxCurrentlyVisible ? (
                            <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Hide Box
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                Show Box
                            </>
                        )}
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            H
                        </span>
                    </div>

                    <div className="-mx-1 my-1 h-px bg-border" />

                    {isClickedBoxPrimary && (
                        <div
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={handleSplit}
                        >
                            <SquareSplitHorizontal className="mr-2 h-4 w-4" />
                            Split Combined Box
                            <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                S
                            </span>
                        </div>
                    )}

                    {selectedBoxIndices.size > 1 && (
                        <div
                            className={`relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none ${canCombine ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' : 'cursor-not-allowed opacity-50'}`}
                            onClick={canCombine ? handleCombine : undefined}
                            title={
                                canCombine
                                    ? 'Combine selected boxes'
                                    : 'Boxes must be adjacent in same row/column'
                            }
                        >
                            <Combine className="mr-2 h-4 w-4" />
                            Combine Selected Boxes
                            <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                C
                            </span>
                        </div>
                    )}
                </>
            ) : (
                /* General context menu when right-clicking on empty space */
                <>
                    <div className="px-2 py-1.5 text-sm font-semibold">
                        Selection ({selectedBoxIndices.size} box
                        {selectedBoxIndices.size !== 1 ? 'es' : ''})
                    </div>

                    {hasSelection && (
                        <>
                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={handleToggleSelectedVisibility}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Toggle Visibility
                                <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                    H
                                </span>
                            </div>

                            {selectedBoxIndices.size > 1 && (
                                <div
                                    className={`relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none ${canCombine ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' : 'cursor-not-allowed opacity-50'}`}
                                    onClick={
                                        canCombine ? handleCombine : undefined
                                    }
                                    title={
                                        canCombine
                                            ? 'Combine selected boxes'
                                            : 'Boxes must be adjacent in same row/column'
                                    }
                                >
                                    <Combine className="mr-2 h-4 w-4" />
                                    Combine Selected Boxes
                                    <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                                        C
                                    </span>
                                </div>
                            )}

                            <div className="-mx-1 my-1 h-px bg-border" />
                        </>
                    )}

                    <div
                        className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${!hasSelection ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={handleClearSelection}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
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
