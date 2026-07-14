import {
    createCornerLines,
    getOutline,
    getRoundedOutline,
    offsetPolygonCCW,
} from '@/lib/lineHelper'
import { Cell, Grid } from '@/lib/types'
import * as THREE from 'three'
import { buildBottomMesh, buildWallMesh } from './meshHelper'

export type BoxGenerationOptions = {
    wallThickness: number
    cornerRadius: number
    wallHeight: number
    generateBottom: boolean
    cornerLines: {
        show: boolean
        color: number
        opacity: number
    }
}

export function generateCustomBox(
    grid: Grid,
    options: BoxGenerationOptions
): THREE.Group {
    if (grid.length === 0 || grid[0].length === 0) {
        throw new Error('Cannot generate box geometry for an empty grid.')
    }

    const group = new THREE.Group()
    const ids = Array.from(new Set(grid.flat().map((c) => c.group))).filter(
        (i) => i > 0
    )

    const widths = grid[0].map((c) => c.width)
    const depths = grid.map((row) => row[0].depth)
    const cumW: number[] = [0]
    widths.forEach((w) => cumW.push(cumW[cumW.length - 1] + w))
    const cumD: number[] = [0]
    depths.forEach((d) => cumD.push(cumD[cumD.length - 1] + d))

    ids.forEach((id) => {
        const cellsForThisId: { x: number; z: number }[] = []
        let isBoxVisible = false
        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x < grid[0].length; x++) {
                if (grid[z][x].group === id) {
                    cellsForThisId.push({ x, z })
                    if (grid[z][x].visibility !== 'hidden') {
                        // If cell is not explicitly hidden, it's visible
                        isBoxVisible = true
                    }
                }
            }
        }

        const rawO = getOutline(grid, id)
        if (!rawO.length) return

        const rawI = offsetPolygonCCW(rawO, options.wallThickness)
        const outR = getRoundedOutline(
            rawO,
            options.cornerRadius,
            5,
            options.cornerRadius,
            options.wallThickness
        )
        const inR = getRoundedOutline(
            rawI,
            options.cornerRadius - options.wallThickness,
            5,
            options.cornerRadius,
            options.wallThickness
        )

        const xCoords = cellsForThisId.map((cell) => cell.x)
        const zCoords = cellsForThisId.map((cell) => cell.z)
        const minX = Math.min(...xCoords)
        const maxX = Math.max(...xCoords)
        const minZ = Math.min(...zCoords)
        const maxZ = Math.max(...zCoords)

        const width = cumW[maxX + 1] - cumW[minX]
        const depth = cumD[maxZ + 1] - cumD[minZ]

        const boxGroup = new THREE.Group()
        boxGroup.name = `group:${id}`
        boxGroup.visible = isBoxVisible

        boxGroup.add(buildWallMesh(outR, inR, options.wallHeight))
        if (options.generateBottom)
            boxGroup.add(buildBottomMesh(outR, options.wallThickness))

        if (options.cornerLines.show) {
            const cornerLines = createCornerLines(
                outR,
                options.wallHeight,
                options.cornerLines.color,
                options.cornerLines.opacity,
                0
            )
            boxGroup.add(cornerLines)
        }

        group.add(boxGroup)
    })

    // For each cell that is NOT filled, build a 1×1 cell‐grid
    for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[z][x]
            if (cell.group !== 0) continue

            const singleGrid: Cell[][] = [
                [
                    {
                        group: 0,
                        width: cell.width,
                        depth: cell.depth,
                        visibility: 'visible',
                    },
                ],
            ]
            const rawO = getOutline(singleGrid, 0)
            const rawI = offsetPolygonCCW(rawO, options.wallThickness)
            const outR = getRoundedOutline(
                rawO,
                options.cornerRadius,
                5,
                options.cornerRadius,
                options.wallThickness
            )
            const inR = getRoundedOutline(
                rawI,
                options.cornerRadius - options.wallThickness,
                5,
                options.cornerRadius,
                options.wallThickness
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
            cellGroup.name = `cell:${x}:${z}`
            cellGroup.visible = cell.visibility !== 'hidden'
            cellGroup.add(buildWallMesh(outR, inR, options.wallHeight))
            if (options.generateBottom)
                cellGroup.add(buildBottomMesh(outR, options.wallThickness))

            if (options.cornerLines.show) {
                const outerLines = createCornerLines(
                    outR,
                    options.wallHeight,
                    options.cornerLines.color,
                    options.cornerLines.opacity,
                    0
                )
                cellGroup.add(outerLines)

                const innerLines = createCornerLines(
                    inR,
                    options.wallHeight,
                    options.cornerLines.color,
                    options.cornerLines.opacity,
                    options.generateBottom ? options.wallThickness : 0,
                    true
                )
                cellGroup.add(innerLines)
            }

            group.add(cellGroup)
        }
    }

    return group
}
