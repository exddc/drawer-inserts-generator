import { Grid } from '@/lib/types'

export function resizeGrid(
    oldGrid: Grid,
    totalWidth: number,
    totalDepth: number,
    maxBoxWidth: number,
    maxBoxDepth: number
): Grid {
    const widths = segmentSizes(totalWidth, maxBoxWidth)
    const depths = segmentSizes(totalDepth, maxBoxDepth)

    return depths.map((depth, rowIdx) =>
        widths.map((width, colIdx) => {
            const oldRow = oldGrid[rowIdx]
            const hasOld = oldRow !== undefined && colIdx < oldRow.length
            const oldCell = hasOld ? oldGrid[rowIdx][colIdx] : undefined
            return {
                group: oldCell?.group ?? 0,
                visible: oldCell?.visible,
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
    maxBoxDepth: number
): boolean {
    const widths = segmentSizes(totalWidth, maxBoxWidth)
    const depths = segmentSizes(totalDepth, maxBoxDepth)

    if (grid.length !== depths.length) return false
    if (grid.length === 0) return widths.length === 0
    if (grid[0].length !== widths.length) return false

    return (
        grid.every((row) => row.length === widths.length) &&
        widths.every((width, colIdx) => grid[0][colIdx].width === width) &&
        depths.every((depth, rowIdx) => grid[rowIdx][0].depth === depth)
    )
}

function segmentSizes(total: number, maxSize: number): number[] {
    if (!Number.isFinite(total) || !Number.isFinite(maxSize)) return [1]
    if (total <= 0 || maxSize <= 0) return [1]

    const fullCount = Math.floor(total / maxSize)
    const remainder = total - fullCount * maxSize
    const segments = Array(fullCount).fill(maxSize)
    if (remainder > 0) segments.push(remainder)
    return segments
}
