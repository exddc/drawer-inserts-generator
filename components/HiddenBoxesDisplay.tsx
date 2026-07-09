'use client'

import {
    getGridBoxes,
    setGridBoxVisible,
    type GridBoxInfo,
} from '@/lib/gridVisibility'
import { useStore } from '@/lib/store'
import { ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { useCallback, useState } from 'react'

export default function HiddenBoxesDisplay() {
    const store = useStore()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const hiddenBoxes = getGridBoxes(store.gridRef.current).filter(
        (box) => !box.visible
    )

    const handleUnhideBox = (boxToUnhide: GridBoxInfo) => {
        setGridBoxVisible(store.gridRef.current, boxToUnhide, true)
        store.forceRedraw()
    }

    const handleUnhideAll = useCallback(() => {
        getGridBoxes(store.gridRef.current).forEach((box) => {
            setGridBoxVisible(store.gridRef.current, box, true)
        })
        store.setSelectedGroups([])
        store.forceRedraw()
    }, [store])

    if (hiddenBoxes.length === 0) {
        return null
    }

    return (
        <div className="fixed right-4 top-20 z-50 min-w-[200px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80">
            <div className="flex items-center justify-between px-2 pt-1.5 pb-1 text-sm font-semibold">
                <div className="flex items-center">Hidden Boxes</div>
                <button
                    className="ml-2 px-2 py-1.5 rounded-md text-accent-foreground flex items-center justify-center hover:bg-muted/50 transition-colors"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronUp className="h-4 w-4" />
                    )}
                </button>
            </div>

            {!isCollapsed && (
                <>
                    <div className="-mx-1 my-1 h-px bg-border" />

                    {hiddenBoxes.map((box) => (
                        <div
                            key={box.id}
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 text-sm outline-none justify-between"
                            title="Unhide Box"
                        >
                            <span>
                                Box {box.id}
                                {box.group !== 0 ? ` (Group ${box.group})` : ''}
                            </span>
                            <button
                                className="ml-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted/50 h-8 w-8"
                                onClick={() => handleUnhideBox(box)}
                                title="Unhide Box"
                            >
                                <Eye className="h-3 w-3" />
                            </button>
                        </div>
                    ))}

                    {hiddenBoxes.length > 1 && (
                        <>
                            <div className="-mx-1 my-1 h-px bg-border" />
                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 text-sm outline-none justify-between"
                                title="Show all"
                            >
                                <span>Show all</span>
                                <button
                                    className="ml-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted/50 h-8 w-8"
                                    onClick={handleUnhideAll}
                                    title="Show all"
                                >
                                    <Eye className="h-3 w-3" />
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    )
}
