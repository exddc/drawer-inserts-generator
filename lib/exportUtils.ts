import {
    buildExportAssembly,
    buildExportBoxMeshes,
    groupExportBoxMeshes,
} from '@/lib/exportModel'
import { createModelSnapshot } from '@/lib/modelSnapshot'
import { useStore } from '@/lib/store'
import { disposeObject } from '@/lib/threeDisposal'
import type { DrawerInsert, StoreState } from '@/lib/types'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

/**
 * Export the domain model as one single STL.
 */
export function handleStlExport(): void {
    const model = createExportModelSnapshot(useStore.getState())
    if (model.grid.length === 0) return

    const assembly = buildExportAssembly(model)
    try {
        downloadBlob(
            new Blob([serializeStl(assembly)], { type: 'text/plain' }),
            `drawer-inserts-${model.config.totalWidth}x${model.config.totalDepth}x${model.config.wallHeight}-single-box.stl`
        )
    } finally {
        disposeObject(assembly)
    }
}

/**
 * Export unique box shapes as separate STLs with a `_qtyN` suffix in a ZIP.
 */
export async function handleExportMultipleSTLs(): Promise<void> {
    const model = createExportModelSnapshot(useStore.getState())
    if (model.grid.length === 0) return

    const exportMeshes = buildExportBoxMeshes(model)

    const groups = groupExportBoxMeshes(exportMeshes)

    try {
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        let uniqIndex = 1

        for (const { representative, count } of groups) {
            const { dimensions, isCombined } = representative.metadata
            const [w, d] = [dimensions.width, dimensions.depth].sort(
                (a, b) => a - b
            )
            const qtySuffix = count > 1 ? `_qty${count}` : ''
            const filename = `${isCombined ? 'combined_box' : 'box'}_${uniqIndex}_${w.toFixed(0)}x${d.toFixed(0)}x${dimensions.height.toFixed(0)}mm${qtySuffix}.stl`
            zip.file(filename, serializeStl(representative.mesh))
            uniqIndex++
        }

        const readme = `# Box Grid Export

This ZIP contains ${groups.length} unique box designs (_qtyN suffix shows multiples_).
Designs are deduplicated by their actual footprint, including non-rectangular shapes.

## File Naming Convention
- Regular boxes: box_[i]_[W]x[D]x[H]mm[_qtyN].stl  
- Combined boxes: combined_box_[i]_[W]x[D]x[H]mm[_qtyN].stl  

## Grid Layout
- Grid size: ${model.grid[0].length}×${model.grid.length}
- Total width: ${model.config.totalWidth} mm
- Total depth: ${model.config.totalDepth} mm
- Box height: ${model.config.wallHeight} mm
- Wall thickness: ${model.config.wallThickness} mm

Thanks for using Box Grid Generator by timoweiss.me!
Happy printing!
`
        zip.file('README.txt', readme)

        const content = await zip.generateAsync({ type: 'blob' })
        downloadBlob(
            content,
            `drawer-inserts-${model.config.totalWidth}x${model.config.totalDepth}x${model.config.wallHeight}-grid.zip`
        )
    } finally {
        exportMeshes.forEach(({ mesh }) => disposeObject(mesh))
    }
}

/** Capture only domain state so later UI/store changes cannot affect an export. */
export function createExportModelSnapshot(state: StoreState): DrawerInsert {
    const snapshot = createModelSnapshot(state)
    return {
        ...snapshot,
        selectedBoxIds: [...state.selectedBoxIds],
    }
}

/** Serialize a generated mesh using the fixed Y-up to STL Z-up transform. */
export function serializeStl(object: THREE.Object3D): string {
    const exportRoot = new THREE.Group()
    exportRoot.rotation.set(Math.PI / 2, 0, 0)
    exportRoot.add(object)
    exportRoot.updateMatrixWorld(true)

    const exporter = new STLExporter()
    try {
        try {
            return exporter.parse(exportRoot, { binary: false }) as string
        } catch {
            return exporter.parse(exportRoot) as string
        }
    } finally {
        exportRoot.remove(object)
    }
}

function downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(link.href), 100)
}
