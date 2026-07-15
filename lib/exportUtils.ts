import {
    buildExportAssembly,
    buildExportBoxMeshes,
    type ExportBoxMesh,
} from '@/lib/exportModel'
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
 * Export unique boxes (deduped by W×D×H, swap-insensitive) as separate STLs
 * with a `_qtyN` suffix and pack into a ZIP.
 */
export async function handleExportMultipleSTLs(): Promise<void> {
    const model = createExportModelSnapshot(useStore.getState())
    if (model.grid.length === 0) return

    const exportMeshes = buildExportBoxMeshes(model)

    // group boxes by dimensions (ignoring width↔depth swap)
    type GroupInfo = {
        representative: ExportBoxMesh
        count: number
        w: number
        d: number
        h: number
        isCombined: boolean
    }
    const groups = new Map<string, GroupInfo>()

    exportMeshes.forEach((entry) => {
        const metadata = entry.metadata
        const rawW = metadata.dimensions.width
        const rawD = metadata.dimensions.depth
        const h = metadata.dimensions.height
        const isCombined = metadata.isCombined
        const [w, d] = [rawW, rawD].sort((a, b) => a - b)
        const prefix = isCombined ? 'combined_box' : 'box'
        const key = `${prefix}_${w.toFixed(2)}_${d.toFixed(2)}_${h.toFixed(2)}`

        if (groups.has(key)) {
            groups.get(key)!.count++
        } else {
            groups.set(key, {
                representative: entry,
                count: 1,
                w,
                d,
                h,
                isCombined,
            })
        }
    })

    try {
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        let uniqIndex = 1

        for (const [, info] of groups) {
            const { representative, count, w, d, h, isCombined } = info
            const qtySuffix = count > 1 ? `_qty${count}` : ''
            const filename = `${isCombined ? 'combined_box' : 'box'}_${uniqIndex}_${w.toFixed(0)}x${d.toFixed(0)}x${h.toFixed(0)}mm${qtySuffix}.stl`
            zip.file(filename, serializeStl(representative.mesh))
            uniqIndex++
        }

        const readme = `# Box Grid Export

This ZIP contains ${groups.size} unique box designs (_qtyN suffix shows multiples_).

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
    return {
        config: {
            totalWidth: state.totalWidth,
            totalDepth: state.totalDepth,
            wallThickness: state.wallThickness,
            cornerRadius: state.cornerRadius,
            wallHeight: state.wallHeight,
            generateBottom: state.generateBottom,
            maxBoxWidth: state.maxBoxWidth,
            maxBoxDepth: state.maxBoxDepth,
        },
        grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
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
