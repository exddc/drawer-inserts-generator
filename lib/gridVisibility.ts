import { Grid } from '@/lib/types'

export type GridBoxInfo = {
    id: number
    group: number
    cells: Array<{ x: number; z: number }>
    visible: boolean
}

export function getGridBoxes(grid: Grid): GridBoxInfo[] {
    if (grid.length === 0) return []

    let nextBoxId = 1
    const boxes: GridBoxInfo[] = []
    const groupIds = Array.from(new Set(grid.flat().map((cell) => cell.group)))
        .filter((group) => group > 0)
        .sort((a, b) => a - b)

    groupIds.forEach((group) => {
        const cells = getCellsForGroup(grid, group)
        boxes.push({
            id: nextBoxId++,
            group,
            cells,
            visible: cells.some(({ x, z }) => grid[z][x].visible !== false),
        })
    })

    for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[z][x]
            if (cell.group !== 0) continue

            boxes.push({
                id: nextBoxId++,
                group: 0,
                cells: [{ x, z }],
                visible: cell.visible !== false,
            })
        }
    }

    return boxes
}

export function setGridBoxVisible(
    grid: Grid,
    box: Pick<GridBoxInfo, 'cells'>,
    visible: boolean
): void {
    box.cells.forEach(({ x, z }) => {
        grid[z][x].visible = visible
    })
}

export function isGridBoxVisible(
    grid: Grid,
    box: Pick<GridBoxInfo, 'cells'>
): boolean {
    return box.cells.some(({ x, z }) => grid[z][x].visible !== false)
}

function getCellsForGroup(
    grid: Grid,
    group: number
): Array<{ x: number; z: number }> {
    const cells: Array<{ x: number; z: number }> = []

    for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid[0].length; x++) {
            if (grid[z][x].group === group) {
                cells.push({ x, z })
            }
        }
    }

    return cells
}
