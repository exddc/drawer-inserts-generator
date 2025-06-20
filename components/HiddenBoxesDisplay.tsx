'use client'

import { useStore } from '@/lib/store'
import { ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { useCallback, useState } from 'react'
import * as THREE from 'three'

export default function HiddenBoxesDisplay() {
    const hiddenBoxIds = useStore((state) => state.hiddenBoxIds)
    const setHiddenBoxIds = useStore((state) => state.setHiddenBoxIds)
    const store = useStore()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const handleUnhideBox = (boxToUnhide: THREE.Group) => {
        boxToUnhide.visible = true

        const newHiddenBoxIds = new Set(hiddenBoxIds)
        newHiddenBoxIds.delete(boxToUnhide.userData.id)

        setHiddenBoxIds(newHiddenBoxIds)
        store.forceRedraw()
    }

    const handleUnhideAll = useCallback(() => {
        const currentBoxRef = store.boxRef.current
        if (!currentBoxRef) return

        for (const id of hiddenBoxIds) {
            const box = currentBoxRef.children.find(
                (child) => child.userData.id === id
            ) as THREE.Group
            if (box) {
                box.visible = true
            }
        }

        setHiddenBoxIds(new Set())
        store.setSelectedGroups([])
        store.forceRedraw()
    }, [hiddenBoxIds, store])

    if (hiddenBoxIds.size === 0) {
        return null
    }

    const hiddenBoxes = Array.from(hiddenBoxIds)
        .map(
            (id) =>
                store.boxRef.current?.children.find(
                    (child) => child.userData.id === id
                ) as THREE.Group | undefined
        )
        .filter(Boolean) as THREE.Group[]

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
                            key={box.userData.id}
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 text-sm outline-none justify-between"
                            title="Unhide Box"
                        >
                            <span>
                                Box {box.userData.id}
                                {box.userData.group !== 0
                                    ? ` (Group ${box.userData.group})`
                                    : ''}
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

                    {hiddenBoxIds.size > 1 && (
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
