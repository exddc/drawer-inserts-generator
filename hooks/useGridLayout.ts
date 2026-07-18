'use client'

import { gridMatchesLayout, resizeGrid } from '@/lib/gridHelper'
import type { Grid } from '@/lib/types'
import { useEffect, useMemo, useRef } from 'react'

interface GridLayoutOptions {
    grid: Grid
    totalWidth: number
    totalDepth: number
    maxBoxWidth: number
    maxBoxDepth: number
    minBoxSize: number
    setGrid: (grid: Grid) => void
    /** When false, skip store writes so pre-hydration effects cannot clobber. */
    layoutHydrated: boolean
}

const DIMENSION_TOLERANCE = 1e-6

function paramsKey(
    totalWidth: number,
    totalDepth: number,
    maxBoxWidth: number,
    maxBoxDepth: number,
    minBoxSize: number
): string {
    return `${totalWidth}:${totalDepth}:${maxBoxWidth}:${maxBoxDepth}:${minBoxSize}`
}

function gridFitsDimensions(
    grid: Grid,
    totalWidth: number,
    totalDepth: number
): boolean {
    if (grid.length === 0 || grid[0].length === 0) return false
    const width = grid[0].reduce((sum, cell) => sum + cell.width, 0)
    const depth = grid.reduce((sum, row) => sum + row[0].depth, 0)
    return (
        Math.abs(width - totalWidth) <= DIMENSION_TOLERANCE &&
        Math.abs(depth - totalDepth) <= DIMENSION_TOLERANCE
    )
}

/**
 * Resolves the display/store grid.
 *
 * Pre-hydration: returns a safe computed preview without writing (avoids empty
 * scene generation and stale overwrite races).
 *
 * Post-hydration: keeps a fitting persisted grid unchanged until the user
 * changes sizing parameters — then applies live resize rules explicitly.
 */
export function useGridLayout({
    grid,
    totalWidth,
    totalDepth,
    maxBoxWidth,
    maxBoxDepth,
    minBoxSize,
    setGrid,
    layoutHydrated,
}: GridLayoutOptions): Grid {
    const appliedParamsRef = useRef<string | null>(null)
    const key = paramsKey(
        totalWidth,
        totalDepth,
        maxBoxWidth,
        maxBoxDepth,
        minBoxSize
    )

    const resolvedGrid = useMemo(() => {
        const computeLive = () =>
            resizeGrid(
                grid,
                totalWidth,
                totalDepth,
                maxBoxWidth,
                maxBoxDepth,
                minBoxSize
            )

        if (!layoutHydrated) {
            // Preview only — never write until hydration finishes.
            if (grid.length === 0) {
                return resizeGrid(
                    [],
                    totalWidth,
                    totalDepth,
                    maxBoxWidth,
                    maxBoxDepth,
                    minBoxSize
                )
            }
            return grid
        }

        if (grid.length === 0) {
            return computeLive()
        }

        // Preserve hydrated (e.g. frozen v1) cell sizes until params change.
        if (
            gridFitsDimensions(grid, totalWidth, totalDepth) &&
            (appliedParamsRef.current === null ||
                appliedParamsRef.current === key)
        ) {
            return grid
        }

        if (
            gridMatchesLayout(
                grid,
                totalWidth,
                totalDepth,
                maxBoxWidth,
                maxBoxDepth,
                minBoxSize
            )
        ) {
            return grid
        }

        return computeLive()
    }, [
        grid,
        totalWidth,
        totalDepth,
        maxBoxWidth,
        maxBoxDepth,
        minBoxSize,
        layoutHydrated,
        key,
    ])

    useEffect(() => {
        if (!layoutHydrated) return
        appliedParamsRef.current = key
        if (resolvedGrid !== grid) setGrid(resolvedGrid)
    }, [grid, resolvedGrid, setGrid, layoutHydrated, key])

    return resolvedGrid
}
