import {
    getOutline,
    getRoundedOutline,
    offsetPolygonCCW,
} from '@/lib/lineHelper'
import { Cell, Grid } from '@/lib/types'
import * as THREE from 'three'
import { buildBottomMesh, buildWallMesh } from './meshHelper'
import { useStore } from '@/lib/store'

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

    let nextBoxId = 1

    const widths = grid[0].map(c => c.width)
    const depths = grid.map(row => row[0].depth)
    const cumW: number[] = [0]
    widths.forEach(w => cumW.push(cumW[cumW.length - 1] + w))
    const cumD: number[] = [0]
    depths.forEach(d => cumD.push(cumD[cumD.length - 1] + d))

    ids.forEach((id) => {
        const cellsForThisId: { x: number; z: number }[] = []
        let isBoxVisible = false
        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x < grid[0].length; x++) {
                if (grid[z][x].group === id) {
                    cellsForThisId.push({ x, z })
                    if (grid[z][x].visible !== false) {
                        // If cell is not explicitly hidden, it's visible
                        isBoxVisible = true
                    }
                }
            }
        }

        const rawO = getOutline(grid, id)
        if (!rawO.length) return

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

        const xCoords = cellsForThisId.map(cell => cell.x)
        const zCoords = cellsForThisId.map(cell => cell.z)
        const minX = Math.min(...xCoords)
        const maxX = Math.max(...xCoords)
        const minZ = Math.min(...zCoords)
        const maxZ = Math.max(...zCoords)

        const width = cumW[maxX + 1] - cumW[minX]
        const depth = cumD[maxZ + 1] - cumD[minZ]

        const boxGroup = new THREE.Group()
        boxGroup.userData.group = id
        boxGroup.userData.id = nextBoxId++
        boxGroup.userData.cells = cellsForThisId
        boxGroup.userData.dimensions = {
            width,
            depth,
            height: useStore.getState().wallHeight
        }
        boxGroup.visible = isBoxVisible
        boxGroup.userData.visible = isBoxVisible

        boxGroup.add(buildWallMesh(outR, inR))
        if (generate_bottom) boxGroup.add(buildBottomMesh(outR, wall_thickness))

        if (useStore.getState().showCornerLines) {
            const cornerLines = createCornerLines(
                outR,
                useStore.getState().wallHeight,
                useStore.getState().cornerLineColor,
                useStore.getState().cornerLineOpacity
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
            cellGroup.userData.id = nextBoxId++
            cellGroup.userData.cells = [{ x, z }]
            cellGroup.visible = cell.visible !== false
            cellGroup.userData.visible = cell.visible !== false

            cellGroup.userData.dimensions = {
                width: cell.width,
                depth: cell.depth,
                height: useStore.getState().wallHeight
            }
            cellGroup.add(buildWallMesh(outR, inR))
            if (generate_bottom)
                cellGroup.add(buildBottomMesh(outR, wall_thickness))

            if (useStore.getState().showCornerLines) {
                const outerLines = createCornerLines(
                    outR,
                    useStore.getState().wallHeight,
                    useStore.getState().cornerLineColor,
                    useStore.getState().cornerLineOpacity
                )
                cellGroup.add(outerLines)

                const innerLines = createCornerLines(
                    inR,
                    useStore.getState().wallHeight,
                    useStore.getState().cornerLineColor,
                    useStore.getState().cornerLineOpacity,
                    true
                )
                cellGroup.add(innerLines)
            }

            group.add(cellGroup)
        }
    }

    return group
}

function createCornerLines(
    outlinePoints: THREE.Vector2[], 
    height: number,
    color: number,
    opacity: number,
    inner: boolean = false
): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry()
    const positions: number[] = []
    
    outlinePoints.forEach(point => {
        positions.push(point.x, 0, point.y)        // bottom
        positions.push(point.x, height, point.y)   // top
    })
    
    for (let i = 0; i < outlinePoints.length; i++) {
        const current = outlinePoints[i]
        const next = outlinePoints[(i + 1) % outlinePoints.length]
        
        if (inner && useStore.getState().generateBottom) {
            positions.push(current.x, useStore.getState().wallThickness, current.y)
            positions.push(next.x, useStore.getState().wallThickness, next.y)
        } else {
            positions.push(current.x, 0, current.y)
            positions.push(next.x, 0, next.y)
        }
         
        positions.push(current.x, height, current.y)
        positions.push(next.x, height, next.y)
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    
    const material = new THREE.LineBasicMaterial({ 
        color, 
        opacity, 
        transparent: true,
        linewidth: 1
    })
    
    const lines = new THREE.LineSegments(geometry, material)
    lines.userData.isCornerLine = true
    return lines
}