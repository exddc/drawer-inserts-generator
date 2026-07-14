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
}

export function useGridLayout({
    grid,
    totalWidth,
    totalDepth,
    maxBoxWidth,
    maxBoxDepth,
    minBoxSize,
    setGrid,
}: GridLayoutOptions): Grid {
    const resolvedGrid = useMemo(() => {
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
    }, [grid, totalWidth, totalDepth, maxBoxWidth, maxBoxDepth, minBoxSize])

    useEffect(() => {
        if (resolvedGrid !== grid) setGrid(resolvedGrid)
    }, [grid, resolvedGrid, setGrid])

    return resolvedGrid
}
