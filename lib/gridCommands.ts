import { combineGridBoxes, getNextAvailableGroupId } from '@/lib/gridCombine'
import {
    getBoxById,
    getGridBoxes,
    isGridBoxVisible,
    setGridBoxVisible,
} from '@/lib/gridVisibility'
import type { Grid, SelectionId } from '@/lib/types'

export function combineSelectedBoxes(
    grid: Grid,
    wallHeight: number,
    selectedIds: SelectionId[]
): Grid | null {
    const selectedBoxes = getGridBoxes(grid, wallHeight).filter((box) =>
        selectedIds.includes(box.id)
    )
    if (selectedBoxes.length < 2) return null

    const nextGrid = cloneGrid(grid)
    const newId = getNextAvailableGroupId(nextGrid)
    return combineGridBoxes(nextGrid, selectedBoxes, newId) ? nextGrid : null
}

export function splitSelectedBoxes(
    grid: Grid,
    selectedIds: SelectionId[]
): Grid | null {
    const selectedBoxes = selectedIds
        .map((id) => getBoxById(grid, id))
        .filter((box) => box !== undefined)
    if (selectedBoxes.length === 0) return null

    const nextGrid = cloneGrid(grid)
    selectedBoxes.forEach((box) => {
        box.cells.forEach(({ x, z }) => {
            nextGrid[z][x].group = 0
        })
    })
    return nextGrid
}

export function toggleSelectedBoxesVisibility(
    grid: Grid,
    selectedIds: SelectionId[]
): Grid | null {
    const selectedBoxes = selectedIds
        .map((id) => getBoxById(grid, id))
        .filter((box) => box !== undefined)
    if (selectedBoxes.length === 0) return null

    const nextGrid = cloneGrid(grid)
    selectedBoxes.forEach((box) => {
        setGridBoxVisible(nextGrid, box, !isGridBoxVisible(nextGrid, box))
    })
    return nextGrid
}

function cloneGrid(grid: Grid): Grid {
    return grid.map((row) => row.map((cell) => ({ ...cell })))
}
