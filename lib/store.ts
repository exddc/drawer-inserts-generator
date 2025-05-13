import { create } from 'zustand'
import { StoreState, Cell, Grid } from '@/lib/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { generateGrid } from '@/lib/gridHelper'

const defaultParameters = {
    totalWidth: 4,
    totalDepth: 4,
    wallThickness: 0.05,
    cornerRadius: 0.2,
    wallHeight: 1,
    generateBottom: true,
}

export const useStore = create<StoreState>((set) => ({
    totalWidth: defaultParameters.totalWidth,
    totalDepth: defaultParameters.totalDepth,
    wallThickness: defaultParameters.wallThickness,
    cornerRadius: defaultParameters.cornerRadius,
    wallHeight: defaultParameters.wallHeight,
    generateBottom: defaultParameters.generateBottom,

    setTotalWidth: (width: number) => set({ totalWidth: width }),
    setTotalDepth: (depth: number) => set({ totalDepth: depth }),
    setWallThickness: (thickness: number) => set({ wallThickness: thickness }),
    setCornerRadius: (radius: number) => set({ cornerRadius: radius }),
    setWallHeight: (height: number) => set({ wallHeight: height }),
    setGenerateBottom: (generate: boolean) => set({ generateBottom: generate }),

    // Refs
    containerRef: { current: null as HTMLDivElement | null },
    sceneRef: { current: null as THREE.Scene | null },
    cameraRef: { current: null as THREE.PerspectiveCamera | null },
    rendererRef: { current: null as THREE.WebGLRenderer | null },
    controlsRef: { current: null as OrbitControls | null },
    boxRef: { current: null as THREE.Group | null },
    gridRef: {
        current: generateGrid(
            defaultParameters.totalWidth,
            defaultParameters.totalDepth
        ) as Grid,
      },
}))