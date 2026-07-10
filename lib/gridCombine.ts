import { getOutline } from '@/lib/lineHelper'
import type { GeneratedBoxMetadata, Grid } from '@/lib/types'

export type GridBoxSelection = Pick<GeneratedBoxMetadata, 'cells'>

export function canCombineGridBoxes(
    grid: Grid,
    boxes: GridBoxSelection[]
): boolean {
    if (boxes.length < 2 || grid.length === 0 || grid[0].length === 0) {
        return false
    }

    const nextGroup = getNextAvailableGroupId(grid)
    const candidate = grid.map((row) => row.map((cell) => ({ ...cell })))
    const selectedCells = selectedCellKeys(boxes)

    if (selectedCells.size === 0) return false

    for (const key of selectedCells) {
        const [x, z] = key.split(',').map(Number)
        if (!candidate[z]?.[x]) return false
        candidate[z][x].group = nextGroup
    }

    try {
        getOutline(candidate, nextGroup)
        return true
    } catch {
        return false
    }
}

export function combineGridBoxes(
    grid: Grid,
    boxes: GridBoxSelection[],
    groupId: number
): boolean {
    if (!canCombineGridBoxes(grid, boxes)) return false

    selectedCellKeys(boxes).forEach((key) => {
        const [x, z] = key.split(',').map(Number)
        grid[z][x].group = groupId
    })
    return true
}

export function getNextAvailableGroupId(grid: Grid): number {
    const existing = new Set(grid.flat().map((cell) => cell.group))
    let nextGroup = 1
    while (existing.has(nextGroup)) nextGroup++
    return nextGroup
}

function selectedCellKeys(boxes: GridBoxSelection[]): Set<string> {
    return new Set(
        boxes.flatMap((box) =>
            getSelectionCells(box).map(({ x, z }) => `${x},${z}`)
        )
    )
}

function getSelectionCells(
    box: GridBoxSelection
): Array<{ x: number; z: number }> {
    return box.cells
}
