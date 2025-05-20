import { create } from 'zustand'
import { StoreState, Grid } from '@/lib/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { parameters, material } from '@/lib/defaults'

export const useStore = create<StoreState>((set) => ({
    totalWidth: parameters.totalWidth.default,
    totalDepth: parameters.totalDepth.default,
    wallThickness: parameters.wallThickness.default,
    cornerRadius: parameters.cornerRadius.default,
    wallHeight: parameters.wallHeight.default,
    generateBottom: true,
    maxBoxWidth: parameters.maxBoxWidth.default,
    maxBoxDepth: parameters.maxBoxDepth.default,

    setTotalWidth: (width: number) => set({ totalWidth: width }),
    setTotalDepth: (depth: number) => set({ totalDepth: depth }),
    setWallThickness: (thickness: number) => set({ wallThickness: thickness }),
    setCornerRadius: (radius: number) => set({ cornerRadius: radius }),
    setWallHeight: (height: number) => set({ wallHeight: height }),
    setGenerateBottom: (generate: boolean) => set({ generateBottom: generate }),
    setMaxBoxWidth: (width: number) => set({ maxBoxWidth: width }),
    setMaxBoxDepth: (depth: number) => set({ maxBoxDepth: depth }),

    // Refs
    containerRef: { current: null as HTMLDivElement | null },
    sceneRef: { current: null as THREE.Scene | null },
    cameraRef: { current: null as THREE.PerspectiveCamera | null },
    rendererRef: { current: null as THREE.WebGLRenderer | null },
    controlsRef: { current: null as OrbitControls | null },
    boxRef: { current: null as THREE.Group | null },
    gridRef: {
        current: [] as Grid,
      },
    helperGridRef: { current: null as THREE.GridHelper | null },

    // General
    showHelperGrid: true,
    setShowHelperGrid: (show: boolean) => set({ showHelperGrid: show }),

    actionsBarPosition: 'bottom',
    setActionsBarPosition: (position: 'top' | 'bottom') => set({ actionsBarPosition: position }),

    standardColor: material.standard.color,
    selectedColor: material.selected.color,
    setStandardColor: (color: number) => set({ standardColor: color }),
    setSelectedColor: (color: number) => set({ selectedColor: color }),
}))