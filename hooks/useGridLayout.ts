'use client'

import { gridMatchesLayout, resizeGrid } from '@/lib/gridHelper'
import type { Grid } from '@/lib/types'
import { useEffect, useMemo } from 'react'

interface GridLayoutOptions {
    grid: Grid
    totalWidth: number
    totalDepth: number
    maxBoxWidth: number
    maxBoxDepth: number
    minBoxSize: number
    setGrid: (grid: Grid) => void
    /** When false, skip resize writes so pre-hydration effects cannot clobber. */
    layoutHydrated: boolean
}

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
    const resolvedGrid = useMemo(() => {
        if (!layoutHydrated) return grid

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
        return resizeGrid(
            grid,
            totalWidth,
            totalDepth,
            maxBoxWidth,
            maxBoxDepth,
            minBoxSize
        )
    }, [
        grid,
        totalWidth,
        totalDepth,
        maxBoxWidth,
        maxBoxDepth,
        minBoxSize,
        layoutHydrated,
    ])

    useEffect(() => {
        if (!layoutHydrated) return
        if (resolvedGrid !== grid) setGrid(resolvedGrid)
    }, [grid, resolvedGrid, setGrid, layoutHydrated])

    return resolvedGrid
}
