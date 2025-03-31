import { get } from 'http'
import { Grid } from 'lucide-react'
import * as THREE from 'three'

interface GridCell {
    index: number,
    width: number,
    depth: number,
    startX: number,
    startZ: number,
}

/**
 * Generate the grid based on the given dimensions
 */
export function generateGrid(width: number, depth: number, maxBoxWidth: number, maxBoxDepth: number) {
    const widthCells = width > maxBoxWidth ? Math.ceil(width / maxBoxWidth) : 1
    const depthCells = depth > maxBoxDepth ? Math.ceil(depth / maxBoxDepth) : 1

    const grid: GridCell[][] = []
    let index = 0

    for (let i = 0; i < widthCells; i++) {
        const row: GridCell[] = []
        for (let j = 0; j < depthCells; j++) {
            const cellWidth = i === widthCells - 1 ? width % maxBoxWidth : maxBoxWidth
            const cellDepth = j === depthCells - 1 ? depth % maxBoxDepth : maxBoxDepth

            row.push({
                index,
                width: widthCells === 1 ? width : cellWidth,
                depth: depthCells === 1 ? depth : cellDepth,
                startX: 0,
                startZ: 0
            })

            index++
        }
        grid.push(row)
    }

    // Update start positions
    for (let i = 0; i < widthCells; i++) {
        for (let j = 0; j < depthCells; j++) {
            const previousWidth = i > 0 ? grid[i - 1][j].startX + grid[i - 1][j].width : 0
            const previousDepth = j > 0 ? grid[i][j - 1].startZ - grid[i][j - 1].depth : 0

            grid[i][j].startX = previousWidth
            grid[i][j].startZ = previousDepth
        }
    }
    
    return grid
}

