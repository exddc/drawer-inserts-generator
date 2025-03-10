import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { FormInputs } from '@/components/ConfigSidebar'

/**
 * Generate a unique key for a box based on its dimensions
 * Considers boxes with swapped width and depth as identical,
 * e.g., 100x50x30 and 50x100x30 are considered the same box
 */
function getBoxKey(box: THREE.Object3D): string {
    if (box.userData && box.userData.dimensions) {
        const { width, depth, height } = box.userData.dimensions
        const [smallerDimension, largerDimension] = [width, depth].sort(
            (a, b) => a - b
        )

        return `${smallerDimension.toFixed(2)}_${largerDimension.toFixed(2)}_${height.toFixed(2)}`
    }
    return ''
}

/**
 * Export the model as an STL file
 * For multiple boxes, it can either combine them into one STL or create a zip with multiple files
 */
export function exportSTL(
    scene: THREE.Scene,
    boxMeshGroup: THREE.Group,
    inputs: FormInputs,
    boxWidths: number[],
    boxDepths: number[]
): void {
    try {
        const exporter = new STLExporter()

        const boxCount = boxWidths.length * boxDepths.length
        const useMultipleBoxes = boxCount > 1 && inputs.useMultipleBoxes

        if (useMultipleBoxes && boxMeshGroup.children.length > 0) {

            let stlString
            try {
                stlString = exporter.parse(scene, { binary: false })
            } catch (e) {
                stlString = exporter.parse(scene)
            }

            const blob = new Blob([stlString], { type: 'text/plain' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)

            const filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.stl`
            link.download = filename

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setTimeout(() => {
                URL.revokeObjectURL(link.href)
            }, 100)
        } else {
            let stlString
            try {
                stlString = exporter.parse(scene, { binary: false })
            } catch (e) {
                stlString = exporter.parse(scene)
            }

            const blob = new Blob([stlString], { type: 'text/plain' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)

            const filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-single-box.stl`
            link.download = filename

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setTimeout(() => {
                URL.revokeObjectURL(link.href)
            }, 100)
        }
    } catch (error) {
        console.error('Unexpected error during STL export:', error)
    }
}

/**
 * Export the model as an OBJ file, which properly supports multiple objects
 */
export function exportOBJ(
    scene: THREE.Scene,
    boxMeshGroup: THREE.Group,
    inputs: FormInputs,
    boxWidths: number[],
    boxDepths: number[]
): void {
    try {
        const exporter = new OBJExporter()

        const boxCount = boxWidths.length * boxDepths.length
        const useMultipleBoxes = boxCount > 1 && inputs.useMultipleBoxes

        let objString = exporter.parse(scene)

        const blob = new Blob([objString], { type: 'text/plain' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)

        let filename
        if (useMultipleBoxes) {
            filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.obj`
        } else {
            filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-single-box.obj`
        }
        link.download = filename

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setTimeout(() => {
            URL.revokeObjectURL(link.href)
        }, 100)
    } catch (error) {
        console.error('Unexpected error during OBJ export:', error)
    }
}

/**
 * Export each box as a separate STL file and pack them into a zip archive
 * Note: This requires the JSZip library
 */
export async function exportMultipleSTLs(
    boxMeshGroup: THREE.Group,
    inputs: FormInputs,
    boxWidths: number[],
    boxDepths: number[]
): Promise<void> {

    try {
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()

        const exporter = new STLExporter()

        const uniqueBoxes = new Map<
            string,
            { box: THREE.Object3D; count: number; index: number }
        >()

        if (inputs.uniqueBoxesExport) {
            boxMeshGroup.children.forEach((box, index) => {
                const boxKey = getBoxKey(box)
                if (boxKey) {
                    if (uniqueBoxes.has(boxKey)) {
                        const boxInfo = uniqueBoxes.get(boxKey)!
                        boxInfo.count++
                    } else {
                        uniqueBoxes.set(boxKey, { box, count: 1, index })
                    }
                }
            })
        }

        if (inputs.uniqueBoxesExport && uniqueBoxes.size > 0) {
            let uniqueIndex = 1
            for (const [boxKey, boxInfo] of uniqueBoxes.entries()) {
                try {
                    const tempScene = new THREE.Scene()
                    const boxClone = boxInfo.box.clone()
                    tempScene.add(boxClone)

                    let stlString
                    try {
                        stlString = exporter.parse(tempScene, { binary: false })
                    } catch (e) {
                        stlString = exporter.parse(tempScene)
                    }

                    if (
                        boxInfo.box.userData &&
                        boxInfo.box.userData.dimensions
                    ) {
                        const { width, depth, height } =
                            boxInfo.box.userData.dimensions

                        let filename
                        if (boxInfo.count > 1) {
                            filename = `box_${uniqueIndex}_${width.toFixed(0)}x${depth.toFixed(0)}x${height.toFixed(0)}mm_qty${boxInfo.count}.stl`
                        } else {
                            filename = `box_${uniqueIndex}_${width.toFixed(0)}x${depth.toFixed(0)}x${height.toFixed(0)}mm.stl`
                        }

                        zip.file(filename, stlString)
                        uniqueIndex++
                    }
                } catch (error) {
                    console.error(
                        `Error exporting unique box ${uniqueIndex}:`,
                        error
                    )
                }
            }
        } else {
            boxMeshGroup.children.forEach((box, index) => {
                try {
                    const tempScene = new THREE.Scene()
                    const boxClone = box.clone()
                    tempScene.add(boxClone)

                    let stlString
                    try {
                        stlString = exporter.parse(tempScene, { binary: false })
                    } catch (e) {
                        stlString = exporter.parse(tempScene)
                    }

                    let boxWidth = 0
                    let boxDepth = 0
                    let boxHeight = 0

                    if (box.userData && box.userData.dimensions) {
                        boxWidth = box.userData.dimensions.width || 0
                        boxDepth = box.userData.dimensions.depth || 0
                        boxHeight = box.userData.dimensions.height || 0
                    }

                    const filename = `box_${index + 1}_${boxWidth.toFixed(0)}x${boxDepth.toFixed(0)}x${boxHeight.toFixed(0)}mm.stl`
                    zip.file(filename, stlString)
                } catch (error) {
                    console.error(`Error exporting box ${index}:`, error)
                }
            })
        }

        // Add a README file to explain the naming convention for unique boxes export
        if (inputs.uniqueBoxesExport && uniqueBoxes.size > 0) {
            const totalBoxes = boxMeshGroup.children.length
            const uniqueBoxCount = uniqueBoxes.size

            const readmeContent = `# Drawer Insert Box Export
            
This ZIP file contains ${uniqueBoxCount} unique box designs out of ${totalBoxes} total boxes.

## File Naming Convention
- Files are named: box_[number]_[width]x[depth]x[height]mm_qty[quantity].stl
- The "qty" suffix indicates how many identical boxes of this dimension you need to print
- For example, "box_1_100x50x30mm_qty4.stl" means you need to print 4 copies of this box

## Grid Layout
- Total grid size: ${boxWidths.length}x${boxDepths.length}
- Total width: ${inputs.width}mm
- Total depth: ${inputs.depth}mm
- Box height: ${inputs.height}mm
- Wall thickness: ${inputs.wallThickness}mm

Thanks for using Box Grid Generator by timoweiss.me!
Happy printing!
`

            zip.file('README.txt', readmeContent)
        }

        zip.generateAsync({ type: 'blob' }).then((content) => {
            const link = document.createElement('a')
            link.href = URL.createObjectURL(content)

            let filename
            if (inputs.uniqueBoxesExport) {
                filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-unique-boxes.zip`
            } else {
                filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.zip`
            }
            link.download = filename

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setTimeout(() => {
                URL.revokeObjectURL(link.href)
            }, 100)
        })
    } catch (error) {
        console.error('Error in multiple STL export:', error)
    }
}
