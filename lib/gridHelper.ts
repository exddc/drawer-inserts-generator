import { Cell, Grid } from '@/lib/types'

export function generateGrid(totalWidth: number, totalDepth: number): Grid {
    const cols = Math.floor(totalWidth)
    const rows = Math.floor(totalDepth)
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            group: 0,
            width: 1,
            depth: 1,
        }))
    )
}

export function resizeGrid(
    oldGrid: Grid,
    totalWidth: number,
    totalDepth: number
): Grid {
    return Array.from({ length: totalDepth }, (_, z) =>
        Array.from({ length: totalWidth }, (_, x) => {
            // if this cell existed before, keep it
            if (z < oldGrid.length && x < oldGrid[0].length) {
                return oldGrid[z][x]
            }
            // otherwise make a fresh empty cell
            return { group: 0, width: 1, depth: 1 }
        })
    )
}