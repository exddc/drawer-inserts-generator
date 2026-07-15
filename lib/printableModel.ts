import { generateCustomBox } from '@/lib/boxHelper'
import { getGridBoxes } from '@/lib/gridVisibility'
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
    if (model.grid.length === 0) return []

    const generated = generateCustomBox(model.grid, {
        wallThickness: model.wallThickness,
        cornerRadius: model.cornerRadius,
        wallHeight: model.wallHeight,
        generateBottom: model.generateBottom,
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
 * Canonicalize the physical cell footprint and every mesh-affecting option
 * under quarter turns around the print axis. Translation and a width/depth swap
 * do not create a new design; different outlines with the same bounds do.
 */
export function createShapeSignature(
    model: PrintableModel,
    metadata: GeneratedBoxMetadata
): string {
    const cumulativeWidths = cumulative(model.grid[0].map((cell) => cell.width))
    const cumulativeDepths = cumulative(model.grid.map((row) => row[0].depth))
    const rectangles = metadata.cells.map(({ x, z }) => [
        [cumulativeWidths[x], cumulativeDepths[z]],
        [cumulativeWidths[x + 1], cumulativeDepths[z + 1]],
    ])
    const footprint = Array.from({ length: 4 }, (_, turns) => {
        const rotated = rectangles.map(([minimum, maximum]) => {
            const corners = [
                rotateQuarterTurn(minimum[0], minimum[1], turns),
                rotateQuarterTurn(maximum[0], minimum[1], turns),
                rotateQuarterTurn(maximum[0], maximum[1], turns),
                rotateQuarterTurn(minimum[0], maximum[1], turns),
            ]
            return [
                Math.min(...corners.map(([x]) => x)),
                Math.min(...corners.map(([, z]) => z)),
                Math.max(...corners.map(([x]) => x)),
                Math.max(...corners.map(([, z]) => z)),
            ]
        })
        const minimumX = Math.min(...rotated.map(([x]) => x))
        const minimumZ = Math.min(...rotated.map(([, z]) => z))
        return rotated
            .map(([x1, z1, x2, z2]) =>
                [x1 - minimumX, z1 - minimumZ, x2 - minimumX, z2 - minimumZ]
                    .map(quantize)
                    .join(',')
            )
            .sort()
            .join(';')
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
