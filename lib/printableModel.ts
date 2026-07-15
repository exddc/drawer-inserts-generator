import { generateCustomBox } from '@/lib/boxHelper'
import { getGridBoxes } from '@/lib/gridVisibility'
import { getOutline } from '@/lib/lineHelper'
import { disposeObject } from '@/lib/threeDisposal'
import type {
    GeneratedBoxMetadata,
    Grid,
    ModelConfig,
    StoreState,
} from '@/lib/types'
import * as THREE from 'three'

export type PrintableModel = Pick<
    ModelConfig,
    | 'totalWidth'
    | 'totalDepth'
    | 'wallThickness'
    | 'cornerRadius'
    | 'wallHeight'
    | 'generateBottom'
> & { grid: Grid }

export type PrintablePart = {
    metadata: GeneratedBoxMetadata
    object: THREE.Object3D
    shapeSignature: string
}

export type PrintablePartGroup = {
    representative: PrintablePart
    count: number
}

export const exportLimits = {
    maxCells: 2_500,
    maxVisibleParts: 250,
    maxOutputBytes: 32 * 1024 * 1024,
    workerMemoryBudgetBytes: 128 * 1024 * 1024,
} as const

export type ExportModelErrorCode =
    'no-visible-parts' | 'cell-limit' | 'part-limit' | 'output-limit'

export class ExportModelError extends Error {
    constructor(
        readonly code: ExportModelErrorCode,
        message: string
    ) {
        super(message)
        this.name = 'ExportModelError'
    }
}

/** Capture an immutable domain snapshot before an asynchronous export starts. */
export function snapshotPrintableModel(state: StoreState): PrintableModel {
    return {
        totalWidth: state.totalWidth,
        totalDepth: state.totalDepth,
        wallThickness: state.wallThickness,
        cornerRadius: state.cornerRadius,
        wallHeight: state.wallHeight,
        generateBottom: state.generateBottom,
        grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
    }
}

/**
 * Generate export parts directly from domain data. Scene helpers, selection
 * materials, cameras, and the currently rendered Three.js scene are not read.
 */
export function buildPrintableParts(model: PrintableModel): PrintablePart[] {
    validatePrintableModel(model)

    const generated = generateCustomBox(model.grid, {
        wallThickness: model.wallThickness,
        cornerRadius: model.cornerRadius,
        wallHeight: model.wallHeight,
        generateBottom: model.generateBottom,
        includeHidden: false,
        cornerLines: { show: false, color: 0, opacity: 0 },
    })
    const metadataById = new Map(
        getGridBoxes(model.grid, model.wallHeight).map((entry) => [
            entry.id,
            entry,
        ])
    )
    const parts: PrintablePart[] = []

    for (const object of [...generated.children]) {
        generated.remove(object)
        const metadata = metadataById.get(
            object.name as GeneratedBoxMetadata['id']
        )
        if (!metadata || metadata.visibility === 'hidden') {
            disposeObject(object)
            continue
        }

        parts.push({
            metadata,
            object,
            shapeSignature: createShapeSignature(model, metadata),
        })
    }

    return parts
}

export function validatePrintableModel(model: PrintableModel): void {
    const cellCount = model.grid.reduce((sum, row) => sum + row.length, 0)
    if (cellCount > exportLimits.maxCells) {
        throw new ExportModelError(
            'cell-limit',
            `This model has ${cellCount.toLocaleString()} cells; exports support up to ${exportLimits.maxCells.toLocaleString()}. Reduce the grid density before exporting.`
        )
    }

    const visibleParts = getGridBoxes(model.grid, model.wallHeight).filter(
        (part) => part.visibility === 'visible'
    ).length
    if (visibleParts === 0) {
        throw new ExportModelError(
            'no-visible-parts',
            'There are no visible boxes to export.'
        )
    }
    if (visibleParts > exportLimits.maxVisibleParts) {
        throw new ExportModelError(
            'part-limit',
            `This model has ${visibleParts.toLocaleString()} visible boxes; exports support up to ${exportLimits.maxVisibleParts.toLocaleString()}. Combine or hide boxes before exporting.`
        )
    }
}

/** Group rotationally equivalent meshes while keeping distinct footprints. */
export function groupPrintableParts(
    parts: PrintablePart[]
): PrintablePartGroup[] {
    const groups = new Map<string, PrintablePartGroup>()
    parts.forEach((part) => {
        const group = groups.get(part.shapeSignature)
        if (group) group.count++
        else groups.set(part.shapeSignature, { representative: part, count: 1 })
    })
    return [...groups.values()]
}

/**
 * Canonicalize the union boundary and every mesh-affecting option under quarter
 * turns around the print axis. Collinear cell seams are removed, so equivalent
 * designs deduplicate regardless of how their source grid was partitioned.
 */
export function createShapeSignature(
    model: PrintableModel,
    metadata: GeneratedBoxMetadata
): string {
    const cumulativeWidths = cumulative(model.grid[0].map((cell) => cell.width))
    const cumulativeDepths = cumulative(model.grid.map((row) => row[0].depth))
    const rawOutline = metadata.isCombined
        ? getOutline(model.grid, metadata.group)
        : [
              new THREE.Vector2(
                  cumulativeWidths[metadata.cells[0].x],
                  cumulativeDepths[metadata.cells[0].z]
              ),
              new THREE.Vector2(
                  cumulativeWidths[metadata.cells[0].x + 1],
                  cumulativeDepths[metadata.cells[0].z]
              ),
              new THREE.Vector2(
                  cumulativeWidths[metadata.cells[0].x + 1],
                  cumulativeDepths[metadata.cells[0].z + 1]
              ),
              new THREE.Vector2(
                  cumulativeWidths[metadata.cells[0].x],
                  cumulativeDepths[metadata.cells[0].z + 1]
              ),
          ]
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
        model.wallThickness,
        model.cornerRadius,
        model.wallHeight,
        model.generateBottom ? 1 : 0,
    ]
        .map(quantize)
        .join('|')
    return `${options}|${footprint}`
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
