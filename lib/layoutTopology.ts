import type { Grid } from '@/lib/types'

/**
 * Near-linear topology checks for persisted layouts.
 * Connectivity: one flood-fill pass over all positive groups.
 * Holes: exterior flood-fill per multi-cell group (skipped for tiny shapes).
 */
export function validatePersistedGridTopology(grid: Grid): void {
    if (grid.length === 0) return
    const rows = grid.length
    const cols = grid[0].length
    if (grid.some((row) => row.length !== cols)) {
        throw new Error('Grid is not rectangular')
    }

    const totals = new Map<number, number>()
    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            const group = grid[z][x].group
            if (!Number.isInteger(group) || group < 0) {
                throw new Error(
                    `Invalid group id ${String(group)} at ${x},${z}`
                )
            }
            if (group > 0) {
                totals.set(group, (totals.get(group) ?? 0) + 1)
            }
        }
    }

    const visited = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => false)
    )

    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            const group = grid[z][x].group
            if (group <= 0 || visited[z][x]) continue

            const reached = floodGroup(grid, visited, x, z, group)
            if (reached !== totals.get(group)) {
                throw new Error(`Group ${group} is disconnected`)
            }
        }
    }

    for (const [group, count] of totals) {
        // A polyomino needs at least 8 cells to enclose a 1-cell hole.
        if (count < 8) continue
        if (groupHasHole(grid, group)) {
            throw new Error(`Group ${group} contains a hole`)
        }
    }
}

function floodGroup(
    grid: Grid,
    visited: boolean[][],
    startX: number,
    startZ: number,
    group: number
): number {
    const rows = grid.length
    const cols = grid[0].length
    const stack: Array<[number, number]> = [[startX, startZ]]
    let reached = 0

    while (stack.length > 0) {
        const [x, z] = stack.pop()!
        if (x < 0 || z < 0 || x >= cols || z >= rows) continue
        if (visited[z][x] || grid[z][x].group !== group) continue

        visited[z][x] = true
        reached++
        stack.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1])
    }

    return reached
}

function groupHasHole(grid: Grid, group: number): boolean {
    const rows = grid.length
    const cols = grid[0].length
    const outside = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => false)
    )
    const stack: Array<[number, number]> = []

    for (let x = 0; x < cols; x++) {
        stack.push([x, 0], [x, rows - 1])
    }
    for (let z = 0; z < rows; z++) {
        stack.push([0, z], [cols - 1, z])
    }

    while (stack.length > 0) {
        const [x, z] = stack.pop()!
        if (x < 0 || z < 0 || x >= cols || z >= rows) continue
        if (outside[z][x] || grid[z][x].group === group) continue

        outside[z][x] = true
        stack.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1])
    }

    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            if (grid[z][x].group !== group && !outside[z][x]) {
                return true
            }
        }
    }

    return false
}
