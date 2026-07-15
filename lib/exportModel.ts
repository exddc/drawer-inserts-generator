import { generateCustomBox } from '@/lib/boxHelper'
import { getGridBoxes } from '@/lib/gridVisibility'
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
            return { metadata, mesh }
        })

    disposeObject(assembly)
    return result
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
