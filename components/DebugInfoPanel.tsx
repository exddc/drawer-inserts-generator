'use client'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useBoxStore } from '@/lib/store'
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'

interface DebugInfoProps {
    renderer: THREE.WebGLRenderer | null
    scene: THREE.Scene | null
    boxMeshGroup: THREE.Group | null
    enabled: boolean
}

export default function DebugInfoPanel({
    renderer,
    scene,
    boxMeshGroup,
    enabled,
}: DebugInfoProps) {
    const [fps, setFps] = useState<number>(0)
    const [memory, setMemory] = useState<string>('')
    const [triangleCount, setTriangleCount] = useState<number>(0)
    const [pageSize, setPageSize] = useState<string>('')
    const [renderInfo, setRenderInfo] = useState<{
        calls: number
        triangles: number
    }>({ calls: 0, triangles: 0 })
    const [showAllBoxes, setShowAllBoxes] = useState<boolean>(false)

    const frameCountRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(performance.now())
    const frameTimeRef = useRef<number[]>([])

    const {
        boxWidths,
        boxDepths,
        selectedBoxIndex,
        selectedBoxIndices,
        toggleBoxSelection,
        clearSelectedBoxes,
        hiddenBoxes,
        toggleBoxVisibility,
        toggleSelectedBoxesVisibility,
        isBoxVisible,
        isBoxSelected,
    } = useBoxStore()

    useEffect(() => {
        if (!enabled) return

        const updateFps = () => {
            frameCountRef.current++

            const now = performance.now()
            const elapsed = now - lastTimeRef.current

            if (elapsed >= 500) {
                const fps = Math.round((frameCountRef.current * 1000) / elapsed)
                setFps(fps)

                frameTimeRef.current.push(elapsed / frameCountRef.current)
                if (frameTimeRef.current.length > 20) {
                    frameTimeRef.current.shift()
                }

                frameCountRef.current = 0
                lastTimeRef.current = now
            }

            if (renderer) {
                const info = renderer.info
                setRenderInfo({
                    calls: info.render.calls,
                    triangles: info.render.triangles,
                })
            }

            requestAnimationFrame(updateFps)
        }

        const animationId = requestAnimationFrame(updateFps)

        return () => {
            cancelAnimationFrame(animationId)
        }
    }, [enabled, renderer])

    useEffect(() => {
        if (!enabled) return

        const updateMemory = () => {
            if ((performance as any).memory) {
                const memoryInfo = (performance as any).memory
                const usedHeapSize = memoryInfo.usedJSHeapSize / (1024 * 1024)
                const totalHeapSize = memoryInfo.totalJSHeapSize / (1024 * 1024)
                setMemory(
                    `${usedHeapSize.toFixed(1)}MB / ${totalHeapSize.toFixed(1)}MB`
                )
            } else {
                setMemory('Not available')
            }

            try {
                const pageSize =
                    new Blob([document.documentElement.outerHTML]).size /
                    (1024 * 1024)
                setPageSize(`${pageSize.toFixed(2)}MB`)
            } catch (e) {
                setPageSize('N/A')
            }
        }

        const countTriangles = () => {
            if (boxMeshGroup) {
                let count = 0
                boxMeshGroup.traverse((obj) => {
                    if (obj instanceof THREE.Mesh) {
                        const geometry = obj.geometry
                        if (geometry instanceof THREE.BufferGeometry) {
                            if (geometry.index) {
                                count += geometry.index.count / 3
                            } else if (geometry.attributes.position) {
                                count += geometry.attributes.position.count / 3
                            }
                        }
                    }
                })
                setTriangleCount(Math.round(count))
            }
        }

        updateMemory()
        countTriangles()

        const memoryInterval = setInterval(updateMemory, 2000)
        const triangleInterval = setInterval(countTriangles, 5000)

        return () => {
            clearInterval(memoryInterval)
            clearInterval(triangleInterval)
        }
    }, [enabled, boxMeshGroup])

    // Function to handle visibility toggle
    const handleToggleVisibility = (index: number) => {
        toggleBoxVisibility(index)
    }

    // Toggle showing all boxes
    const toggleShowAllBoxes = () => {
        setShowAllBoxes(!showAllBoxes)
    }

    // Handle box click in the list (for selection)
    const handleBoxClick = (index: number, event: React.MouseEvent) => {
        event.stopPropagation()
        // Use meta/ctrl key for multi-select
        toggleBoxSelection(index, event.metaKey || event.ctrlKey)
    }

    // Toggle visibility for all selected boxes
    const handleToggleSelectedVisibility = () => {
        toggleSelectedBoxesVisibility()
    }

    // Clear all selections
    const handleClearSelection = () => {
        clearSelectedBoxes()
    }

    if (!enabled) return null

    const totalBoxes = boxWidths.length * boxDepths.length
    const hiddenBoxCount = hiddenBoxes.size
    const visibleBoxCount = totalBoxes - hiddenBoxCount
    const selectedCount = selectedBoxIndices.size

    // Get the box details for the selected box
    const selectedBoxDetails =
        selectedBoxIndex !== null &&
        boxMeshGroup &&
        boxMeshGroup.children[selectedBoxIndex]
            ? boxMeshGroup.children[selectedBoxIndex].userData?.dimensions
            : null

    return (
        <div className="fixed top-20 right-4 z-50 max-h-[80vh] overflow-auto rounded-md bg-black/80 p-3 font-mono text-xs whitespace-nowrap text-white">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="font-semibold">FPS:</div>
                <div
                    className={`${
                        fps < 30
                            ? 'text-red-400'
                            : fps < 50
                              ? 'text-yellow-400'
                              : 'text-green-400'
                    }`}
                >
                    {fps}
                </div>

                <div className="font-semibold">Memory:</div>
                <div>{memory}</div>

                <div className="font-semibold">Page Size:</div>
                <div>{pageSize}</div>

                <div className="font-semibold">Triangles:</div>
                <div>{triangleCount.toLocaleString()}</div>

                <div className="font-semibold">Draw Calls:</div>
                <div>{renderInfo.calls}</div>

                <div className="font-semibold">Grid Size:</div>
                <div>
                    {boxWidths.length}×{boxDepths.length} ({visibleBoxCount}/
                    {totalBoxes} visible)
                </div>

                {/* Selected Boxes Section */}
                {selectedCount > 0 && (
                    <div className="col-span-2 mt-2 border-t border-orange-600 pt-2">
                        <div className="mb-1 flex items-center justify-between font-semibold text-orange-400">
                            <span>
                                {selectedCount} Box
                                {selectedCount > 1 ? 'es' : ''} Selected
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleToggleSelectedVisibility}
                                    className="ml-2 flex items-center rounded bg-gray-700 px-1 py-0.5 text-xs hover:bg-gray-600"
                                    title="Toggle Visibility"
                                >
                                    <Eye size={12} className="mr-1" />
                                    <EyeOff size={12} />
                                </button>
                                <button
                                    onClick={handleClearSelection}
                                    className="flex items-center rounded bg-gray-700 px-1 py-0.5 text-xs hover:bg-gray-600"
                                    title="Clear Selection"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        {/* If single box selected - show details */}
                        {selectedCount === 1 && selectedBoxDetails && (
                            <div className="grid grid-cols-2 gap-1">
                                <div>Width:</div>
                                <div>
                                    {selectedBoxDetails.width?.toFixed(1) ||
                                        'N/A'}{' '}
                                    mm
                                </div>

                                <div>Depth:</div>
                                <div>
                                    {selectedBoxDetails.depth?.toFixed(1) ||
                                        'N/A'}{' '}
                                    mm
                                </div>

                                <div>Height:</div>
                                <div>
                                    {selectedBoxDetails.height?.toFixed(1) ||
                                        'N/A'}{' '}
                                    mm
                                </div>

                                <div>Status:</div>
                                <div
                                    className={
                                        isBoxVisible(selectedBoxIndex as number)
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                    }
                                >
                                    {isBoxVisible(selectedBoxIndex as number)
                                        ? 'Visible'
                                        : 'Hidden'}
                                </div>
                            </div>
                        )}

                        {/* If multiple boxes selected - show summary */}
                        {selectedCount > 1 && (
                            <div className="mt-1 text-xs">
                                <div>
                                    Selected indices:{' '}
                                    {Array.from(selectedBoxIndices)
                                        .sort((a, b) => a - b)
                                        .join(', ')}
                                </div>
                                <div className="mt-1">
                                    <span className="text-green-400">
                                        {
                                            Array.from(
                                                selectedBoxIndices
                                            ).filter((idx) => isBoxVisible(idx))
                                                .length
                                        }
                                    </span>{' '}
                                    visible,
                                    <span className="ml-1 text-red-400">
                                        {
                                            Array.from(
                                                selectedBoxIndices
                                            ).filter(
                                                (idx) => !isBoxVisible(idx)
                                            ).length
                                        }
                                    </span>{' '}
                                    hidden
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Box grid debug - with toggle to show all boxes */}
                <div className="col-span-2 mt-2 border-t border-gray-600 pt-2">
                    <div className="mb-1 flex items-center justify-between">
                        <div className="font-semibold">Box Grid:</div>
                        <button
                            onClick={toggleShowAllBoxes}
                            className="flex items-center rounded bg-gray-700 px-1 py-0.5 text-xs hover:bg-gray-600"
                        >
                            {showAllBoxes ? (
                                <>
                                    <ChevronUp size={10} className="mr-1" />
                                    <span>Collapse</span>
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={10} className="mr-1" />
                                    <span>Show All</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div
                        className={`${showAllBoxes ? 'max-h-64 overflow-y-auto pr-1' : ''}`}
                    >
                        {boxMeshGroup?.children
                            .slice(0, showAllBoxes ? undefined : 5)
                            .map((child, index) => {
                                const pos = child.position
                                const isVisible = isBoxVisible(index)
                                const isSelected = isBoxSelected(index)
                                return (
                                    <div
                                        key={index}
                                        onClick={(e) =>
                                            handleBoxClick(index, e)
                                        }
                                        className={`flex cursor-pointer items-center justify-between rounded px-1 py-0.5 text-xs hover:bg-gray-700/50 ${
                                            isSelected
                                                ? 'bg-orange-800/20 font-semibold text-orange-400'
                                                : !isVisible
                                                  ? 'opacity-50'
                                                  : ''
                                        }`}
                                        title={`Click to ${isSelected ? 'deselect' : 'select'} (Cmd/Ctrl+click for multi-select)`}
                                    >
                                        <span>
                                            Box {index + 1}: x:{' '}
                                            {pos.x.toFixed(1)}, z:{' '}
                                            {pos.z.toFixed(1)}, w:{' '}
                                            {child.userData?.dimensions?.width?.toFixed(
                                                1
                                            ) || 'N/A'}
                                            , d:{' '}
                                            {child.userData?.dimensions?.depth?.toFixed(
                                                1
                                            ) || 'N/A'}
                                            {isSelected && ' ★'}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleToggleVisibility(index)
                                            }}
                                            className="ml-1 opacity-70 hover:opacity-100"
                                            title={
                                                isVisible
                                                    ? 'Hide Box'
                                                    : 'Show Box'
                                            }
                                        >
                                            {isVisible ? (
                                                <EyeOff size={10} />
                                            ) : (
                                                <Eye size={10} />
                                            )}
                                        </button>
                                    </div>
                                )
                            })}

                        {!showAllBoxes &&
                            boxMeshGroup &&
                            boxMeshGroup.children.length > 5 && (
                                <div className="mt-1 text-xs text-gray-400">
                                    ...and {boxMeshGroup.children.length - 5}{' '}
                                    more boxes
                                    {selectedCount > 0 && (
                                        <span className="ml-1 text-orange-400">
                                            (including {selectedBoxIndices.size}{' '}
                                            selected)
                                        </span>
                                    )}
                                    {hiddenBoxCount > 0 && (
                                        <span className="ml-1">
                                            ({hiddenBoxCount} hidden)
                                        </span>
                                    )}
                                </div>
                            )}
                    </div>
                </div>

                {/* Grid summary */}
                <div className="col-span-2 mt-2 border-t border-gray-600 pt-2">
                    <div className="mb-1 font-semibold">Grid Details:</div>

                    <div className="mt-1 text-xs">
                        <div className="mb-1">Width Distribution:</div>
                        <div className="mb-2 flex flex-wrap gap-1">
                            {boxWidths.slice(0, 5).map((w, i) => (
                                <span
                                    key={`w-${i}`}
                                    className="rounded bg-blue-900/50 px-1"
                                >
                                    {w.toFixed(1)}
                                </span>
                            ))}
                            {boxWidths.length > 5 && <span>...</span>}
                        </div>

                        <div className="mb-1">Depth Distribution:</div>
                        <div className="flex flex-wrap gap-1">
                            {boxDepths.slice(0, 5).map((d, i) => (
                                <span
                                    key={`d-${i}`}
                                    className="rounded bg-green-900/50 px-1"
                                >
                                    {d.toFixed(1)}
                                </span>
                            ))}
                            {boxDepths.length > 5 && <span>...</span>}
                        </div>
                    </div>
                </div>

                {/* Keyboard shortcuts help */}
                <div className="col-span-2 mt-2 border-t border-gray-600 pt-2 text-xs">
                    <div className="mb-1 font-semibold">
                        Keyboard Shortcuts:
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <div className="text-gray-400">Cmd/Ctrl+Click:</div>
                        <div>Multi-select boxes</div>

                        <div className="text-gray-400">H:</div>
                        <div>Toggle visibility of selected</div>

                        <div className="text-gray-400">Escape:</div>
                        <div>Clear selection</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
