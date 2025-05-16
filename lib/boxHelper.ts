import * as THREE from 'three'
import { Cell, Grid } from '@/lib/types'
import { getOutline, offsetPolygonCCW, getRoundedOutline } from '@/lib/lineHelper'
import { buildBottomMesh, buildWallMesh } from './meshHelper'

export function generateCustomBox(
    grid: Grid,
    wall_thickness: number,
    corner_radius: number,
    generate_bottom: boolean
): THREE.Group {
    const group = new THREE.Group()
    const ids = Array.from(new Set(grid.flat().map((c) => c.group))).filter(
        (i) => i > 0
    )

    ids.forEach((id) => {
        // 1) collect every cell in the grid that has this group-id
        const cellsForThisId: { x: number; z: number }[] = []
        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x < grid[0].length; x++) {
                if (grid[z][x].group === id) {
                    cellsForThisId.push({ x, z })
                }
            }
        }

        // 2) if there really is something to outline…
        const rawO = getOutline(grid, id)
        if (!rawO.length) return

        // 3) now build your inner/outlines as before
        const rawI = offsetPolygonCCW(rawO, wall_thickness)
        const outR = getRoundedOutline(
            rawO,
            corner_radius,
            5,
            corner_radius,
            wall_thickness
        )
        const inR = getRoundedOutline(
            rawI,
            corner_radius - wall_thickness,
            5,
            corner_radius,
            wall_thickness
        )

        // 4) stick it on a Group and remember its cells
        const boxGroup = new THREE.Group()
        boxGroup.userData.group = id
        boxGroup.userData.cells = cellsForThisId
        boxGroup.add(buildWallMesh(outR, inR))
        if (generate_bottom) boxGroup.add(buildBottomMesh(outR, wall_thickness))
        group.add(boxGroup)
    })

    const widths = grid[0].map((c) => c.width)
    const depths = grid.map((row) => row[0].depth)
    const cumW: number[] = [0]
    widths.forEach((w) => cumW.push(cumW[cumW.length - 1] + w))
    const cumD: number[] = [0]
    depths.forEach((d) => cumD.push(cumD[cumD.length - 1] + d))

    // For each cell that is NOT filled, build a 1×1 cell‐grid
    for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[z][x]
            if (cell.group !== 0) continue

            // Build a 1×1 grid containing just this cell
            const singleGrid: Cell[][] = [
                [{ group: 0, width: cell.width, depth: cell.depth }],
            ]
            const rawO = getOutline(singleGrid, 0)
            const rawI = offsetPolygonCCW(rawO, wall_thickness)
            const outR = getRoundedOutline(
                rawO,
                corner_radius,
                5,
                corner_radius,
                wall_thickness
            )
            const inR = getRoundedOutline(
                rawI,
                corner_radius - wall_thickness,
                5,
                corner_radius,
                wall_thickness
            )
            const x0 = cumW[x],
                z0 = cumD[z]
            outR.forEach((p) => {
                p.x += x0
                p.y += z0
            })
            inR.forEach((p) => {
                p.x += x0
                p.y += z0
            })

            const cellGroup = new THREE.Group()
            cellGroup.userData.selectable = true
            cellGroup.userData.group = 0
            cellGroup.userData.cells = [{ x, z }]
            cellGroup.add(buildWallMesh(outR, inR))
            if (generate_bottom)
                cellGroup.add(buildBottomMesh(outR, wall_thickness))
            group.add(cellGroup)
        }
    }

    return group
}