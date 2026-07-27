import { generateCustomBox } from '@/lib/boxHelper'
import { getGridBoxes } from '@/lib/gridVisibility'
import { getOutline } from '@/lib/lineHelper'
import { disposeObject } from '@/lib/threeDisposal'
import type {
    DrawerInsert,
    GeneratedBoxMetadata,
    Grid,
    ModelConfig,
} from '@/lib/types'
import * as THREE from 'three'

export type ExportBoxMesh = {
    metadata: GeneratedBoxMetadata
    mesh: THREE.Group
    shapeSignature: string
}

export type ExportBoxMeshGroup = {
    representative: ExportBoxMesh
    count: number
}

/**
 * Builds the complete printable assembly directly from a domain-model snapshot.
 * Display-only geometry and hidden boxes are never added to the result.
 */
export function buildExportAssembly(model: DrawerInsert): THREE.Group {
    const generated = generateCustomBox(model.grid, exportOptions(model.config))
    const visibleIds = new Set(
        getGridBoxes(model.grid, model.config.wallHeight)
            .filter((box) => box.visibility === 'visible')
            .map((box) => box.id)
    )

    for (const child of [...generated.children]) {
        if (visibleIds.has(child.name as GeneratedBoxMetadata['id'])) {
            child.visible = true
            continue
        }

        generated.remove(child)
        disposeObject(child)
    }

    return generated
}

/**
 * Builds one locally positioned mesh per visible domain box. The returned order
 * comes from the grid model, rather than the order of objects in a render scene.
 */
export function buildExportBoxMeshes(model: DrawerInsert): ExportBoxMesh[] {
    const assembly = buildExportAssembly(model)
    const meshesById = new Map(
        assembly.children.map((child) => [child.name, child as THREE.Group])
    )
    const result = getGridBoxes(model.grid, model.config.wallHeight)
        .filter((metadata) => metadata.visibility === 'visible')
        .map((metadata) => {
            const mesh = meshesById.get(metadata.id)
            if (!mesh) {
                throw new Error(`Missing generated mesh for ${metadata.id}.`)
            }

            assembly.remove(mesh)
            positionAtLocalOrigin(mesh, model.grid, metadata)
            return {
                metadata,
                mesh,
                shapeSignature: createExportShapeSignature(model, metadata),
            }
        })

    disposeObject(assembly)
    return result
}

/** Group rotationally equivalent meshes while preserving distinct footprints. */
export function groupExportBoxMeshes(
    entries: ExportBoxMesh[]
): ExportBoxMeshGroup[] {
    const groups = new Map<string, ExportBoxMeshGroup>()

    entries.forEach((entry) => {
        const group = groups.get(entry.shapeSignature)
        if (group) group.count++
        else
            groups.set(entry.shapeSignature, {
                representative: entry,
                count: 1,
            })
    })

    return [...groups.values()]
}

/**
 * Canonicalize the printable footprint and mesh-affecting options under quarter
 * turns. Removing collinear seams makes the signature independent of how an
 * otherwise identical shape is partitioned in the source grid.
 */
export function createExportShapeSignature(
    model: DrawerInsert,
    metadata: GeneratedBoxMetadata
): string {
    const cumulativeWidths = cumulative(model.grid[0].map((cell) => cell.width))
    const cumulativeDepths = cumulative(model.grid.map((row) => row[0].depth))
    const rawOutline = metadata.isCombined
        ? getOutline(model.grid, metadata.group)
        : rectangleOutline(metadata, cumulativeWidths, cumulativeDepths)
    const outline = removeCollinearPoints(rawOutline)
    const footprint = Array.from({ length: 4 }, (_, turns) => {
        const rotated = outline.map((point) =>
            rotateQuarterTurn(point.x, point.y, turns)
        )
        const minimumX = Math.min(...rotated.map(([x]) => x))
        const minimumZ = Math.min(...rotated.map(([, z]) => z))
        const points = rotated.map(([x, z]) =>
            [x - minimumX, z - minimumZ].map(quantize).join(',')
        )

        return points
            .map((_, start) =>
                [...points.slice(start), ...points.slice(0, start)].join(';')
            )
            .sort()[0]
    }).sort()[0]
    const options = [
        model.config.wallThickness,
        model.config.cornerRadius,
        model.config.wallHeight,
        model.config.generateBottom ? 1 : 0,
    ]
        .map(quantize)
        .join('|')

    return `${options}|${footprint}`
}

function exportOptions(config: ModelConfig) {
    return {
        wallThickness: config.wallThickness,
        cornerRadius: config.cornerRadius,
        wallHeight: config.wallHeight,
        generateBottom: config.generateBottom,
        cornerLines: {
            show: false,
            color: 0,
            opacity: 0,
        },
    }
}

function positionAtLocalOrigin(
    mesh: THREE.Group,
    grid: Grid,
    metadata: GeneratedBoxMetadata
): void {
    const firstColumn = Math.min(...metadata.cells.map(({ x }) => x))
    const firstRow = Math.min(...metadata.cells.map(({ z }) => z))
    const xOffset = grid[0]
        .slice(0, firstColumn)
        .reduce((sum, cell) => sum + cell.width, 0)
    const zOffset = grid
        .slice(0, firstRow)
        .reduce((sum, row) => sum + row[0].depth, 0)

    mesh.position.set(-xOffset, 0, -zOffset)
}

function rectangleOutline(
    metadata: GeneratedBoxMetadata,
    cumulativeWidths: number[],
    cumulativeDepths: number[]
): THREE.Vector2[] {
    const [{ x, z }] = metadata.cells
    return [
        new THREE.Vector2(cumulativeWidths[x], cumulativeDepths[z]),
        new THREE.Vector2(cumulativeWidths[x + 1], cumulativeDepths[z]),
        new THREE.Vector2(cumulativeWidths[x + 1], cumulativeDepths[z + 1]),
        new THREE.Vector2(cumulativeWidths[x], cumulativeDepths[z + 1]),
    ]
}

function removeCollinearPoints(points: THREE.Vector2[]): THREE.Vector2[] {
    return points.filter((current, index) => {
        const previous = points[(index + points.length - 1) % points.length]
        const next = points[(index + 1) % points.length]
        const first = current.clone().sub(previous)
        const second = next.clone().sub(current)
        return Math.abs(first.x * second.y - first.y * second.x) > 1e-8
    })
}

function cumulative(values: number[]): number[] {
    return values.reduce<number[]>(
        (result, value) => {
            result.push(result.at(-1)! + value)
            return result
        },
        [0]
    )
}

function rotateQuarterTurn(
    x: number,
    z: number,
    turns: number
): [number, number] {
    switch (turns) {
        case 1:
            return [-z, x]
        case 2:
            return [-x, -z]
        case 3:
            return [z, -x]
        default:
            return [x, z]
    }
}

function quantize(value: number): string {
    return (Math.round(value * 1e5) / 1e5).toFixed(5)
}
