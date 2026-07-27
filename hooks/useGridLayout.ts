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
 * Resolves display/store grid. Preserves hydrated cell sizes until sizing
 * params change. The previous params key is a ref written only in an effect so
 * advancing it cannot re-render and re-freeze a stale grid prop before setGrid
 * feeds back.
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
    const key = paramsKey(
        totalWidth,
        totalDepth,
        maxBoxWidth,
        maxBoxDepth,
        minBoxSize
    )
    const committedParamsKeyRef = useRef<string | null>(null)

    // Derived for this render: true when sizing params changed since last commit.
    const paramsChanged =
        layoutHydrated &&
        committedParamsKeyRef.current !== null &&
        committedParamsKeyRef.current !== key

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

        // First post-hydration frame (ref still null) or unchanged params:
        // keep a dimension-fitting grid (e.g. frozen v1 segment sizes).
        if (
            !paramsChanged &&
            gridFitsDimensions(grid, totalWidth, totalDepth)
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
        paramsChanged,
    ])

    useEffect(() => {
        if (!layoutHydrated) {
            committedParamsKeyRef.current = null
            return
        }
        committedParamsKeyRef.current = key
        if (resolvedGrid !== grid) setGrid(resolvedGrid)
    }, [grid, resolvedGrid, setGrid, layoutHydrated, key])

    return resolvedGrid
}
