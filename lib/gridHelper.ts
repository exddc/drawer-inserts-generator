import { segmentSizes } from '@/lib/gridSizing'
import { Grid } from '@/lib/types'

export function resizeGrid(
    oldGrid: Grid,
    totalWidth: number,
    totalDepth: number,
    maxBoxWidth: number,
    maxBoxDepth: number,
    minBoxSize = 0
): Grid {
    const widths = segmentSizes(totalWidth, maxBoxWidth, minBoxSize)
    const depths = segmentSizes(totalDepth, maxBoxDepth, minBoxSize)

    return depths.map((depth, rowIdx) =>
        widths.map((width, colIdx) => {
            const oldRow = oldGrid[rowIdx]
            const hasOld = oldRow !== undefined && colIdx < oldRow.length
            const oldCell = hasOld ? oldGrid[rowIdx][colIdx] : undefined
            return {
                group: oldCell?.group ?? 0,
                visibility: oldCell?.visibility ?? 'visible',
                width,
                depth,
            }
        })
    )
}

export function gridMatchesLayout(
    grid: Grid,
    totalWidth: number,
    totalDepth: number,
    maxBoxWidth: number,
    maxBoxDepth: number,
    minBoxSize = 0
): boolean {
    const widths = segmentSizes(totalWidth, maxBoxWidth, minBoxSize)
    const depths = segmentSizes(totalDepth, maxBoxDepth, minBoxSize)

    if (grid.length !== depths.length) return false
    if (grid.length === 0) return widths.length === 0
    if (grid[0].length !== widths.length) return false

    return (
        grid.every((row) => row.length === widths.length) &&
        widths.every((width, colIdx) => grid[0][colIdx].width === width) &&
        depths.every((depth, rowIdx) => grid[rowIdx][0].depth === depth)
    )
}
