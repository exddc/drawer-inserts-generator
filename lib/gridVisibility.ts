import type {
    GeneratedBoxMetadata,
    Grid,
    GridCoordinate,
    SelectionId,
} from '@/lib/types'

export type GridBoxInfo = GeneratedBoxMetadata

export function getGridBoxes(grid: Grid, height = 0): GridBoxInfo[] {
    if (grid.length === 0) return []

    let nextBoxId = 1
    const boxes: GridBoxInfo[] = []
    const groupIds = Array.from(new Set(grid.flat().map((cell) => cell.group)))
        .filter((group) => group > 0)
        .sort((a, b) => a - b)

    groupIds.forEach((group) => {
        const cells = getCellsForGroup(grid, group)
        boxes.push({
            id: `group:${group}`,
            index: nextBoxId++,
            group,
            cells,
            dimensions: getDimensions(grid, cells, height),
            visibility: cells.some(
                ({ x, z }) => grid[z][x].visibility !== 'hidden'
            )
                ? 'visible'
                : 'hidden',
            isCombined: true,
        })
    })

    for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[z][x]
            if (cell.group !== 0) continue

            boxes.push({
                id: `cell:${x}:${z}`,
                index: nextBoxId++,
                group: 0,
                cells: [{ x, z }],
                dimensions: {
                    width: cell.width,
                    depth: cell.depth,
                    height,
                },
                visibility: cell.visibility ?? 'visible',
                isCombined: false,
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
        grid[z][x].visibility = visible ? 'visible' : 'hidden'
    })
}

export function isGridBoxVisible(
    grid: Grid,
    box: Pick<GridBoxInfo, 'cells'>
): boolean {
    return box.cells.some(({ x, z }) => grid[z][x].visibility !== 'hidden')
}

function getCellsForGroup(grid: Grid, group: number): GridCoordinate[] {
    const cells: GridCoordinate[] = []

    for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid[0].length; x++) {
            if (grid[z][x].group === group) {
                cells.push({ x, z })
            }
        }
    }

    return cells
}

export function getBoxById(
    grid: Grid,
    id: SelectionId,
    height = 0
): GridBoxInfo | undefined {
    return getGridBoxes(grid, height).find((box) => box.id === id)
}

function getDimensions(grid: Grid, cells: GridCoordinate[], height: number) {
    const xIndexes = new Set(cells.map(({ x }) => x))
    const zIndexes = new Set(cells.map(({ z }) => z))
    return {
        width: [...xIndexes].reduce((sum, x) => sum + grid[0][x].width, 0),
        depth: [...zIndexes].reduce((sum, z) => sum + grid[z][0].depth, 0),
        height,
    }
}
