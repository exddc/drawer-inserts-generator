import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type Cell = {
    group: number
    width: number
    depth: number
    color?: number
    visible?: boolean
}

export type Grid = Cell[][]

export interface StoreState {
    // Parameters
    totalWidth: number
    totalDepth: number
    wallThickness: number
    cornerRadius: number
    wallHeight: number
    generateBottom: boolean
    maxBoxWidth: number
    maxBoxDepth: number

    setTotalWidth: (width: number) => void
    setTotalDepth: (depth: number) => void
    setWallThickness: (thickness: number) => void
    setCornerRadius: (radius: number) => void
    setWallHeight: (height: number) => void
    setGenerateBottom: (generate: boolean) => void
    setMaxBoxWidth: (width: number) => void
    setMaxBoxDepth: (depth: number) => void

    // Refs
    containerRef: { current: HTMLDivElement | null }
    sceneRef: { current: THREE.Scene | null }
    cameraRef: { current: THREE.PerspectiveCamera | null }
    rendererRef: { current: THREE.WebGLRenderer | null }
    controlsRef: { current: OrbitControls | null }
    boxRef: { current: THREE.Group | null }
    gridRef: { current: Grid }
    helperGridRef: { current: THREE.GridHelper | null }

    // Helpers
    selectedGroups: THREE.Group[]
    setSelectedGroups: (groups: THREE.Group[]) => void
    hiddenBoxIds: Set<number>
    setHiddenBoxIds: (ids: Set<number>) => void

    // General
    actionsBarPosition: 'top' | 'bottom'
    setActionsBarPosition: (position: 'top' | 'bottom') => void

    showHelperGrid: boolean
    setShowHelperGrid: (show: boolean) => void

    standardColor: number
    selectedColor: number
    setStandardColor: (color: number) => void
    setSelectedColor: (color: number) => void

    redrawTrigger: number;
    forceRedraw: () => void;

    // Corner Lines
    showCornerLines: boolean
    cornerLineColor: number
    cornerLineOpacity: number
    
    setShowCornerLines: (show: boolean) => void
    setCornerLineColor: (color: number) => void
    setCornerLineOpacity: (opacity: number) => void
}

export interface BoxInfo {
    id: number
    group: number
    dimensions?: {
        width: number
        depth: number
        height: number
    }
    cells: Array<{ x: number; z: number }>
    visible?: boolean
}

export type ValidKey = 's' | 'c' | 'h' | string;

export type ResizingState = {
    side: 'left' | 'right' | 'top' | 'bottom'
    boundaryIndex: number
    startPointer: { x: number, z: number }
    initSizes: { a: number, b: number }
}