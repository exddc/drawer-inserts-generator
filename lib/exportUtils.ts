import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

interface ExportInputs {
    width: number;
    depth: number;
    height: number;
    wallThickness: number;
    cornerRadius: number;
    hasBottom: boolean;
    useMultipleBoxes: boolean;
    minBoxWidth?: number;
    maxBoxWidth?: number;
    debugMode?: boolean;
}

/**
 * Export the model as an STL file
 */
export function exportSTL(
    scene: THREE.Scene | null, 
    boxMeshGroup: THREE.Group | null, 
    inputs: ExportInputs,
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