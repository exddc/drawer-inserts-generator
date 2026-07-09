import { cornerLine, material, parameters } from '@/lib/defaults'
import type { ModelParameters } from '@/lib/parameterValidation'
import { sanitizeModelParameters } from '@/lib/parameterValidation'
import { Grid, StoreState } from '@/lib/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { create } from 'zustand'

export const useStore = create<StoreState>((set, get) => ({
    totalWidth: parameters.totalWidth.default,
    totalDepth: parameters.totalDepth.default,
    wallThickness: parameters.wallThickness.default,
    cornerRadius: parameters.cornerRadius.default,
    wallHeight: parameters.wallHeight.default,
    generateBottom: true,
    maxBoxWidth: parameters.maxBoxWidth.default,
    maxBoxDepth: parameters.maxBoxDepth.default,

    setTotalWidth: (width: number) =>
        setModelParameter(set, get, 'totalWidth', width),
    setTotalDepth: (depth: number) =>
        setModelParameter(set, get, 'totalDepth', depth),
    setWallThickness: (thickness: number) =>
        setModelParameter(set, get, 'wallThickness', thickness),
    setCornerRadius: (radius: number) =>
        setModelParameter(set, get, 'cornerRadius', radius),
    setWallHeight: (height: number) =>
        setModelParameter(set, get, 'wallHeight', height),
    setGenerateBottom: (generate: boolean) => set({ generateBottom: generate }),
    setMaxBoxWidth: (width: number) =>
        setModelParameter(set, get, 'maxBoxWidth', width),
    setMaxBoxDepth: (depth: number) =>
        setModelParameter(set, get, 'maxBoxDepth', depth),

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

    // Helpers
    selectedGroups: [] as THREE.Group[],
    setSelectedGroups: (groups) => set({ selectedGroups: groups }),
    // General
    showHelperGrid: true,
    setShowHelperGrid: (show: boolean) => set({ showHelperGrid: show }),

    actionsBarPosition: 'bottom',
    setActionsBarPosition: (position: 'top' | 'bottom') =>
        set({ actionsBarPosition: position }),

    standardColor: material.standard.color,
    selectedColor: material.selected.color,
    setStandardColor: (color: number) => set({ standardColor: color }),
    setSelectedColor: (color: number) => set({ selectedColor: color }),

    redrawTrigger: 0,
    forceRedraw: () =>
        set((state) => ({ redrawTrigger: state.redrawTrigger + 1 })),

    // Corner Lines
    showCornerLines: cornerLine.show,
    cornerLineColor: cornerLine.color,
    cornerLineOpacity: cornerLine.opacity,

    setShowCornerLines: (show: boolean) => set({ showCornerLines: show }),
    setCornerLineColor: (color: number) => set({ cornerLineColor: color }),
    setCornerLineOpacity: (opacity: number) =>
        set({ cornerLineOpacity: opacity }),
}))

function setModelParameter<K extends keyof ModelParameters>(
    set: (
        partial:
            Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)
    ) => void,
    get: () => StoreState,
    key: K,
    value: number
): number {
    const next = sanitizeModelParameters({ ...get(), [key]: value }, get())
    set(next)
    return next[key]
}
