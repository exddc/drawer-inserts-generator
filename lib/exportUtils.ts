import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { FormInputs } from '@/components/ConfigSidebar';


/**
 * Export the model as an STL file
 * For multiple boxes, it can either combine them into one STL or create a zip with multiple files
 */
export function exportSTL(
    scene: THREE.Scene,
    boxMeshGroup: THREE.Group, 
    inputs: FormInputs,
    boxWidths: number[],
    boxDepths: number[],
): void {
    console.log('exportSTL function called');
    
    try {
        // Create exporter
        const exporter = new STLExporter();
        
        // Check if we're using a grid of boxes
        const boxCount = boxWidths.length * boxDepths.length;
        const useMultipleBoxes = boxCount > 1 && inputs.useMultipleBoxes;
        
        // If using multiple boxes, export the entire scene as a single object
        // but inform the user that STL doesn't support multiple objects
        if (useMultipleBoxes && boxMeshGroup.children.length > 0) {
            console.log('Exporting multi-box model as a single STL object');
            
            // Export the entire scene as a single object
            let stlString;
            try {
                stlString = exporter.parse(scene, { binary: false });
            } catch (e) {
                // Fallback for different API versions
                stlString = exporter.parse(scene);
            }
            
            // Create the STL file for download
            const blob = new Blob([stlString], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            
            // Name the file
            const filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.stl`;
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
            }, 100);
        } else {
            // Single box export - straightforward STL export
            let stlString;
            try {
                stlString = exporter.parse(scene, { binary: false });
            } catch (e) {
                stlString = exporter.parse(scene);
            }
            
            // Download the file
            const blob = new Blob([stlString], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            
            // Name the file
            const filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-single-box.stl`;
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
            }, 100);
        }
        
        console.log('Export completed successfully');
    } catch (error) {
        console.error('Unexpected error during STL export:', error);
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
    console.log('exportOBJ function called');
    
    try {
        // Create OBJ exporter
        const exporter = new OBJExporter();
        
        // Check if we're using a grid of boxes
        const boxCount = boxWidths.length * boxDepths.length;
        const useMultipleBoxes = boxCount > 1 && inputs.useMultipleBoxes;
        
        // Export to OBJ format
        let objString = exporter.parse(scene);
        
        // Create the OBJ file for download
        const blob = new Blob([objString], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        // Name the file
        let filename;
        if (useMultipleBoxes) {
            filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.obj`;
        } else {
            filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-single-box.obj`;
        }
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
        }, 100);
        
        // If using multiple boxes, inform the user about the advantage of OBJ format
        if (useMultipleBoxes) {
            console.log('Exported as OBJ with multiple objects');
        }
        
        console.log('OBJ export completed successfully');
    } catch (error) {
        console.error('Unexpected error during OBJ export:', error);
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
    console.log('exportMultipleSTLs function called');
    
    try {
        // Dynamic import of JSZip
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Create exporter
        const exporter = new STLExporter();
        
        // Export each box as a separate STL file
        boxMeshGroup.children.forEach((box, index) => {
            try {
                // Create a temporary scene with just this box
                const tempScene = new THREE.Scene();
                const boxClone = box.clone();
                tempScene.add(boxClone);
                
                // Export to STL
                let stlString;
                try {
                    stlString = exporter.parse(tempScene, { binary: false });
                } catch (e) {
                    stlString = exporter.parse(tempScene);
                }
                
                // Get box dimensions from userData
                let boxWidth = 0;
                let boxDepth = 0;
                let boxHeight = 0;
                
                if (box.userData && box.userData.dimensions) {
                    boxWidth = box.userData.dimensions.width || 0;
                    boxDepth = box.userData.dimensions.depth || 0;
                    boxHeight = box.userData.dimensions.height || 0;
                }
                
                // Add to zip
                const filename = `box_${index + 1}_${boxWidth.toFixed(0)}x${boxDepth.toFixed(0)}x${boxHeight.toFixed(0)}mm.stl`;
                zip.file(filename, stlString);
                
            } catch (error) {
                console.error(`Error exporting box ${index}:`, error);
            }
        });
        
        // Generate the zip file
        zip.generateAsync({ type: 'blob' }).then((content) => {
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            
            // Name the zip file
            const filename = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxWidths.length}x${boxDepths.length}-grid.zip`;
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
            }, 100);
            
            console.log('Multiple STL export completed successfully');
        });
    } catch (error) {
        console.error('Error in multiple STL export:', error);
        alert('Error exporting multiple STL files. The JSZip library might be missing. Please try the OBJ export instead.');
    }
}