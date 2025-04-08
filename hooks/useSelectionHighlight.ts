import { useBoxStore, useGridStore } from '@/lib/store';
import { RefObject, useEffect } from 'react';
import * as THREE from 'three';

export function useSelectionHighlight(boxMeshGroupRef: RefObject<THREE.Group>) {
    const { getHighlightHexColor } = useBoxStore();
    const { selectedIndices } = useGridStore();

    useEffect(() => {
        const boxMeshGroup = boxMeshGroupRef.current;
        if (boxMeshGroup) {
            boxMeshGroup.children.forEach((box) => {
                const index = (box.userData as any).dimensions.index;
                const isSelected = selectedIndices.includes(index);
                const color = isSelected ? getHighlightHexColor() : (box.userData as any).dimensions.color;

                box.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.material.color.setHex(color);
                    }
                });
            });
        }
    }, [selectedIndices, getHighlightHexColor, boxMeshGroupRef]);
}
