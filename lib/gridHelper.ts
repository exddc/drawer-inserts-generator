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
        const hasOld =
            rowIdx < oldGrid.length && colIdx < oldGrid[0].length
        const group = hasOld ? oldGrid[rowIdx][colIdx].group : 0
        return { group, width, depth }
        })
    )
}

function segmentSizes(total: number, maxSize: number): number[] {
    const fullCount = Math.floor(total / maxSize)
    const remainder = total - fullCount * maxSize
    const segments = Array(fullCount).fill(maxSize)
    if (remainder > 0) segments.push(remainder)
    return segments
}