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
    boxWidths: number[]
): void {
    if (!boxMeshGroup || !scene) return;

    const exporter = new STLExporter();
    const stlString = exporter.parse(scene);

    const blob = new Blob([stlString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Name the file based on total dimensions and number of boxes
    const boxCount = boxWidths.length;
    const boxLabel = boxCount > 1 ? `${boxCount}boxes` : 'box';
    link.download = `drawer-inserts-${inputs.width}x${inputs.depth}x${inputs.height}-${boxLabel}.stl`;
    
    link.click();
}