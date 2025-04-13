// src/hooks/useSelectionHighlight.ts
import { useBoxStore, useGridStore } from '@/lib/store';
import { RefObject, useEffect } from 'react';
import * as THREE from 'three';

export function useSelectionHighlight(boxMeshGroupRef: RefObject<THREE.Group>) {
    const { getHighlightHexColor, getBoxHexColor } = useBoxStore(); // Also get default color
    const { selectedIndices } = useGridStore();

    useEffect(() => {
        const boxMeshGroup = boxMeshGroupRef.current;
        if (boxMeshGroup) {
            // console.log('Updating highlights for indices:', selectedIndices); // Debug log
            boxMeshGroup.children.forEach((box) => {
                // Check if box is a Group and has userData and dimensions
                if (box instanceof THREE.Group && box.userData?.dimensions) {
                    const dimensions = box.userData.dimensions;
                    const index = dimensions.index;
                    const originalColor = dimensions.color || getBoxHexColor(); // Use stored color or default

                    // Ensure index is a number before checking includes
                    if (typeof index === 'number') {
                        const isSelected = selectedIndices.includes(index);
                        const targetColorHex = isSelected ? getHighlightHexColor() : originalColor;

                        // Traverse only if necessary (e.g., color needs changing)
                        // This is a micro-optimization, might not be needed
                        let needsUpdate = false;
                        box.traverse((object) => {
                            if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
                                if (object.material.color.getHex() !== targetColorHex) {
                                    needsUpdate = true;
                                }
                            }
                        });

                        if (needsUpdate) {
                            // console.log(`Updating color for index ${index} to ${targetColorHex.toString(16)} (Selected: ${isSelected})`); // Debug log
                            box.traverse((object) => {
                                if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
                                    // Clone material before changing color if you want unique materials per state
                                    // object.material = object.material.clone();
                                    object.material.color.setHex(targetColorHex);
                                }
                            });
                        }
                    }
                }
            });
        }
    }, [selectedIndices, getHighlightHexColor, getBoxHexColor, boxMeshGroupRef]); // Add getBoxHexColor dependency
}
