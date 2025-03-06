import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { FormInputs } from '@/components/ConfigSidebar';

/**
 * Export the model as an STL file
 */
export function exportSTL(
    scene: THREE.Scene | null, 
    boxMeshGroup: THREE.Group | null, 
    inputs: FormInputs,
    boxWidths: number[],
    boxDepths: number[]
): void {
    if (!boxMeshGroup || !scene) return;

    const exporter = new STLExporter();
    const stlString = exporter.parse(scene);

    const blob = new Blob([stlString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Name the file based on total dimensions and grid layout
    const boxCount = boxWidths.length * boxDepths.length;
    let filenameParts = [
        'drawer-inserts',
        `${inputs.width}x${inputs.depth}x${inputs.height}`
    ];
    
    if (boxCount > 1) {
        // Add grid dimensions to filename
        filenameParts.push(`${boxWidths.length}x${boxDepths.length}-grid`);
    } else {
        filenameParts.push('single-box');
    }
    
    link.download = `${filenameParts.join('-')}.stl`;
    
    link.click();
}