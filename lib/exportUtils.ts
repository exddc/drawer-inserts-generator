import {
    buildPrintableParts,
    groupPrintableParts,
    snapshotPrintableModel,
    type PrintableModel,
    type PrintablePart,
} from '@/lib/printableModel'
import { useStore } from '@/lib/store'
import { disposeObject } from '@/lib/threeDisposal'
import { exportThreeMf } from '@/lib/threeMfExporter'
import JSZip from 'jszip'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

const printPlateGap = 5

export function generateStl(model: PrintableModel): ArrayBuffer {
    const parts = buildPrintableParts(model)
    if (parts.length === 0) throw new Error('Cannot export an empty STL model.')
    layoutPartsOnPrintPlate(parts, printPlateWidth(model))
    return exportPartsAsStl(parts)
}

export async function generateThreeMf(
    model: PrintableModel
): Promise<Uint8Array> {
    const parts = buildPrintableParts(model)
    if (parts.length === 0) throw new Error('Cannot export an empty 3MF model.')
    layoutPartsOnPrintPlate(parts, printPlateWidth(model))
    const printable = orientForPrinting(parts.map((part) => part.object))
    try {
        return await exportThreeMf(printable, exportBaseName(model))
    } finally {
        disposeObject(printable)
    }
}

export async function generateSeparateStlZip(
    model: PrintableModel
): Promise<Uint8Array> {
    const parts = buildPrintableParts(model)
    const groups = groupPrintableParts(parts)
    if (groups.length === 0)
        throw new Error('Cannot export an empty STL archive.')

    const zip = new JSZip()
    let uniqueIndex = 1
    for (const group of groups) {
        const { representative, count } = group
        const { dimensions, isCombined } = representative.metadata
        const [width, depth] = [dimensions.width, dimensions.depth].sort(
            (a, b) => a - b
        )
        const quantity = count > 1 ? `_qty${count}` : ''
        const filename = `${isCombined ? 'combined_box' : 'box'}_${uniqueIndex}_${width.toFixed(0)}x${depth.toFixed(0)}x${dimensions.height.toFixed(0)}mm${quantity}.stl`
        zip.file(filename, exportPartsAsStl([representative]))
        uniqueIndex++
    }

    zip.file('README.txt', archiveReadme(model, groups.length))
    parts.forEach((part) => {
        if (part.object.parent === null) disposeObject(part.object)
    })
    return zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    })
}

export function handleStlExport(): void {
    const model = snapshotPrintableModel(useStore.getState())
    if (model.grid.length === 0) return
    download(
        generateStl(model),
        `${exportBaseName(model)}-print-plate.stl`,
        'model/stl'
    )
}

export async function handleThreeMfExport(): Promise<void> {
    const model = snapshotPrintableModel(useStore.getState())
    if (model.grid.length === 0) return
    download(
        await generateThreeMf(model),
        `${exportBaseName(model)}.3mf`,
        'model/3mf'
    )
}

export async function handleExportMultipleSTLs(): Promise<void> {
    const model = snapshotPrintableModel(useStore.getState())
    if (model.grid.length === 0) return
    download(
        await generateSeparateStlZip(model),
        `${exportBaseName(model)}-grid.zip`,
        'application/zip'
    )
}

function exportPartsAsStl(parts: PrintablePart[]): ArrayBuffer {
    const objects = parts.map((part) => part.object)
    const printable = orientForPrinting(objects)
    try {
        const output: unknown = new STLExporter().parse(printable, {
            binary: true,
        })
        if (output instanceof ArrayBuffer) return output
        if (ArrayBuffer.isView(output)) {
            return new Uint8Array(
                output.buffer,
                output.byteOffset,
                output.byteLength
            ).slice().buffer
        }
        throw new Error('STL exporter did not return binary output.')
    } finally {
        disposeObject(printable)
    }
}

function layoutPartsOnPrintPlate(
    parts: PrintablePart[],
    maximumRowWidth: number
): void {
    let x = 0
    let z = 0
    let rowDepth = 0

    parts.forEach((part) => {
        part.object.updateMatrixWorld(true)
        let bounds = new THREE.Box3().setFromObject(part.object)
        const size = bounds.getSize(new THREE.Vector3())
        if (x > 0 && x + size.x > maximumRowWidth + 1e-5) {
            x = 0
            z += rowDepth + printPlateGap
            rowDepth = 0
        }

        part.object.position.x += x - bounds.min.x
        part.object.position.z += z - bounds.min.z
        part.object.updateMatrixWorld(true)
        bounds = new THREE.Box3().setFromObject(part.object)
        x = bounds.max.x + printPlateGap
        rowDepth = Math.max(rowDepth, size.z)
    })
}

function orientForPrinting(objects: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group()
    objects.forEach((object) => group.add(object))
    group.rotation.x = Math.PI / 2
    group.updateMatrixWorld(true)

    const bounds = new THREE.Box3().setFromObject(group)
    group.position.set(-bounds.min.x, -bounds.min.y, -bounds.min.z)
    group.updateMatrixWorld(true)
    return group
}

function exportBaseName(model: PrintableModel): string {
    return `drawer-inserts-${model.totalWidth}x${model.totalDepth}x${model.wallHeight}`
}

function printPlateWidth(model: PrintableModel): number {
    return (
        model.totalWidth + printPlateGap * Math.max(0, model.grid[0].length - 1)
    )
}

function archiveReadme(model: PrintableModel, uniqueCount: number): string {
    return `# Box Grid Export

This ZIP contains ${uniqueCount} unique box designs (_qtyN suffix shows multiples_).
Designs are deduplicated by their generated mesh shape, including non-rectangular outlines.

## File Naming Convention
- Regular boxes: box_[i]_[W]x[D]x[H]mm[_qtyN].stl
- Combined boxes: combined_box_[i]_[W]x[D]x[H]mm[_qtyN].stl

## Grid Layout
- Grid size: ${model.grid[0].length}×${model.grid.length}
- Total width: ${model.totalWidth} mm
- Total depth: ${model.totalDepth} mm
- Box height: ${model.wallHeight} mm
- Wall thickness: ${model.wallThickness} mm

Thanks for using Box Grid Generator by timoweiss.me!
Happy printing!
`
}

function download(
    data: ArrayBuffer | Uint8Array,
    filename: string,
    contentType: string
): void {
    const blobData =
        data instanceof Uint8Array ? new Uint8Array(data).buffer : data
    const href = URL.createObjectURL(
        new Blob([blobData], { type: contentType })
    )
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(href), 100)
}
