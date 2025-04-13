import { GridCell } from "./store"

/**
 * Generate the grid based on the given dimensions
 */
export function generateGrid(
    width: number,
    depth: number,
    maxBoxWidth: number,
    maxBoxDepth: number,
) {
    const widthCells = width > maxBoxWidth ? Math.ceil(width / maxBoxWidth) : 1
    const depthCells = depth > maxBoxDepth ? Math.ceil(depth / maxBoxDepth) : 1

    const grid: GridCell[][] = []
    let index = 0

    for (let i = 0; i < widthCells; i++) {
        const row: GridCell[] = []
        for (let j = 0; j < depthCells; j++) {
            const cellWidth =
                i === widthCells - 1 ? width % maxBoxWidth : maxBoxWidth
            const cellDepth =
                j === depthCells - 1 ? depth % maxBoxDepth : maxBoxDepth

            row.push({
                index,
                width: widthCells === 1 ? width : cellWidth,
                depth: depthCells === 1 ? depth : cellDepth,
                startX: 0,
                startZ: 0,
                excludeWalls: [],
            })

            index++
        }
        grid.push(row)
    }

    // Update start positions
    for (let i = 0; i < widthCells; i++) {
        for (let j = 0; j < depthCells; j++) {
            const previousWidth =
                i > 0 ? grid[i - 1][j].startX + grid[i - 1][j].width : 0
            const previousDepth =
                j > 0 ? grid[i][j - 1].startZ - grid[i][j - 1].depth : 0

            grid[i][j].startX = previousWidth
            grid[i][j].startZ = previousDepth
        }
    }

    return grid
}

/**
 * Get the cell information based on the given index
 */
export function getCellInfo(
    grid: GridCell[][],
    index: number
): GridCell | undefined {
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (grid[i][j].index === index) {
                return grid[i][j]
            }
        }
    }

    return undefined
}

export function combineSelectedBoxes(selectedBoxIndices: number[], grid: GridCell[][]){
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (selectedBoxIndices.includes(grid[i][j].index)) {
                grid[i][j].excludeWalls = ['front']
            }
        }
    }
}

