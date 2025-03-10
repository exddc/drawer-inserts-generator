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
        // Sort width and depth so we consider rotated boxes as identical
        const [smallerDimension, largerDimension] = [width, depth].sort(
            (a, b) => a - b
        )

        // Round to 2 decimal places to avoid floating point issues
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
    console.log('exportSTL function called')

    try {
        // Create exporter
        const exporter = new STLExporter()

        // Check if we're using a grid of boxes
        const boxCount = boxWidths.length * boxDepths.length
        const useMultipleBoxes = boxCount > 1 && inputs.useMultipleBoxes

        // If using multiple boxes, export the entire scene as a single object
        // but inform the user that STL doesn't support multiple objects
        if (useMultipleBoxes && boxMeshGroup.children.length > 0) {
            console.log('Exporting multi-box model as a single STL object')

            // Export the entire scene as a single object
            let stlString
            try {
                stlString = exporter.parse(scene, { binary: false })
            } catch (e) {
                // Fallback for different API versions
                stlString = exporter.parse(scene)
            }

            // Create the STL file for download
            const blob = new Blob([stlString], { type: 'text/plain' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)

            // Name the file
            const filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.stl`
            link.download = filename

            // Trigger download
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href)
            }, 100)
        } else {
            // Single box export - straightforward STL export
            let stlString
            try {
                stlString = exporter.parse(scene, { binary: false })
            } catch (e) {
                stlString = exporter.parse(scene)
            }

            // Download the file
            const blob = new Blob([stlString], { type: 'text/plain' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)

            // Name the file
            const filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-single-box.stl`
            link.download = filename

            // Trigger download
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href)
            }, 100)
        }

        console.log('Export completed successfully')
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
    console.log('exportOBJ function called')

    try {
        // Create OBJ exporter
        const exporter = new OBJExporter()

        // Check if we're using a grid of boxes
        const boxCount = boxWidths.length * boxDepths.length
        const useMultipleBoxes = boxCount > 1 && inputs.useMultipleBoxes

        // Export to OBJ format
        let objString = exporter.parse(scene)

        // Create the OBJ file for download
        const blob = new Blob([objString], { type: 'text/plain' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)

        // Name the file
        let filename
        if (useMultipleBoxes) {
            filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.obj`
        } else {
            filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-single-box.obj`
        }
        link.download = filename

        // Trigger download
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(link.href)
        }, 100)

        // If using multiple boxes, inform the user about the advantage of OBJ format
        if (useMultipleBoxes) {
            console.log('Exported as OBJ with multiple objects')
        }

        console.log('OBJ export completed successfully')
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
    console.log('exportMultipleSTLs function called')

    try {
        // Dynamic import of JSZip
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()

        // Create exporter
        const exporter = new STLExporter()

        // Map to track unique boxes if we're only exporting unique dimensions
        const uniqueBoxes = new Map<
            string,
            { box: THREE.Object3D; count: number; index: number }
        >()

        // First pass: identify unique boxes and count occurrences
        if (inputs.uniqueBoxesExport) {
            boxMeshGroup.children.forEach((box, index) => {
                const boxKey = getBoxKey(box)
                if (boxKey) {
                    if (uniqueBoxes.has(boxKey)) {
                        // Increment count for this box dimension
                        const boxInfo = uniqueBoxes.get(boxKey)!
                        boxInfo.count++
                    } else {
                        // Add new unique box
                        uniqueBoxes.set(boxKey, { box, count: 1, index })
                    }
                }
            })

            console.log(
                `Found ${uniqueBoxes.size} unique box dimensions out of ${boxMeshGroup.children.length} total boxes`
            )
        }

        // Handle exporting based on uniqueness setting
        if (inputs.uniqueBoxesExport && uniqueBoxes.size > 0) {
            // Export only unique boxes
            let uniqueIndex = 1
            for (const [boxKey, boxInfo] of uniqueBoxes.entries()) {
                try {
                    // Create a temporary scene with just this box
                    const tempScene = new THREE.Scene()
                    const boxClone = boxInfo.box.clone()
                    tempScene.add(boxClone)

                    // Export to STL
                    let stlString
                    try {
                        stlString = exporter.parse(tempScene, { binary: false })
                    } catch (e) {
                        stlString = exporter.parse(tempScene)
                    }

                    // Get box dimensions from userData
                    if (
                        boxInfo.box.userData &&
                        boxInfo.box.userData.dimensions
                    ) {
                        const { width, depth, height } =
                            boxInfo.box.userData.dimensions

                        // Add to zip with count in filename if more than one
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
            // Export all boxes individually (original behavior)
            boxMeshGroup.children.forEach((box, index) => {
                try {
                    // Create a temporary scene with just this box
                    const tempScene = new THREE.Scene()
                    const boxClone = box.clone()
                    tempScene.add(boxClone)

                    // Export to STL
                    let stlString
                    try {
                        stlString = exporter.parse(tempScene, { binary: false })
                    } catch (e) {
                        stlString = exporter.parse(tempScene)
                    }

                    // Get box dimensions from userData
                    let boxWidth = 0
                    let boxDepth = 0
                    let boxHeight = 0

                    if (box.userData && box.userData.dimensions) {
                        boxWidth = box.userData.dimensions.width || 0
                        boxDepth = box.userData.dimensions.depth || 0
                        boxHeight = box.userData.dimensions.height || 0
                    }

                    // Add to zip
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

        // Generate the zip file
        zip.generateAsync({ type: 'blob' }).then((content) => {
            // Create download link
            const link = document.createElement('a')
            link.href = URL.createObjectURL(content)

            // Name the zip file
            let filename
            if (inputs.uniqueBoxesExport) {
                filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-unique-boxes.zip`
            } else {
                filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.zip`
            }
            link.download = filename

            // Trigger download
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href)
            }, 100)

            console.log('Multiple STL export completed successfully')
        })
    } catch (error) {
        console.error('Error in multiple STL export:', error)
        alert(
            'Error exporting multiple STL files. The JSZip library might be missing. Please try the OBJ export instead.'
        )
    }
}
