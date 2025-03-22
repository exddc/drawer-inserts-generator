import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'

// Default settings
export const defaultConstraints: InputConstraints = {
    width: { min: 10, max: 500 },
    depth: { min: 10, max: 500 },
    height: { min: 5, max: 100 },
    wallThickness: { min: 1, max: 10 },
    cornerRadius: { min: 0, max: 50 },
    minBoxWidth: { min: 10, max: 500 },
    maxBoxWidth: { min: 10, max: 500 },
    minBoxDepth: { min: 10, max: 500 },
    maxBoxDepth: { min: 10, max: 500 },
}

export const boxDefaults = {
    width: 150,
    depth: 150,
    height: 30,
    wallThickness: 2,
    cornerRadius: 5,
    hasBottom: true,
    minBoxWidth: 10,
    maxBoxWidth: 100,
    minBoxDepth: 10,
    maxBoxDepth: 100,
    useMultipleBoxes: true,
    uniqueBoxesExport: true,
}

export const uiDefaults = {
    debugMode: false,
    showGrid: true,
    showAxes: false,
    selectedBoxIndex: null,
    boxColor: '#7a9cbf',
    highlightColor: '#f59e0b',
    actionsBarPosition: 'bottom',
    combinedBoxes: new Map<number, CombinedBoxInfo>(),
}

// Type definitions
export interface CombinedBoxInfo {
    indices: number[]
    direction: 'width' | 'depth'
}

export interface ActionsBarProps {
    camera: React.RefObject<THREE.PerspectiveCamera | null>
    controls: React.RefObject<OrbitControls | null>
}

export interface ColorPickerProps {
    color?: string
    onChange?: (value: string) => void
    defaultColor?: string
}

export interface DebugInfoProps {
    renderer: THREE.WebGLRenderer | null
    scene: THREE.Scene | null
    boxMeshGroup: THREE.Group | null
    enabled: boolean
}

export interface ExportButtonProps {
    scene: THREE.Scene
    boxMeshGroup: THREE.Group
}

export interface HeaderProps {
    title?: string
    sceneRef: React.MutableRefObject<THREE.Scene | null>
    boxMeshGroupRef: React.MutableRefObject<THREE.Group | null>
}

export interface BoxParameters {
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    isSelected?: boolean
    boxColor?: number
    highlightColor?: number
}

export interface FormInputs {
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    minBoxWidth: number
    maxBoxWidth: number
    minBoxDepth: number
    maxBoxDepth: number
    useMultipleBoxes: boolean
    debugMode: boolean
    uniqueBoxesExport: boolean
    showGrid: boolean
    showAxes: boolean
}

export interface BoxModelParams {
    boxWidths: number[]
    boxDepths: number[]
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    selectedBoxIndex?: number | null
    selectedBoxIndices?: Set<number>
    hiddenBoxes?: Set<number>
    boxColor?: number
    highlightColor?: number
    combinedBoxes?: Map<number, CombinedBoxInfo>
}

export interface InputConstraint {
    min: number
    max: number
}

export interface InputConstraints {
    width: InputConstraint
    depth: InputConstraint
    height: InputConstraint
    wallThickness: InputConstraint
    cornerRadius: InputConstraint
    minBoxWidth?: InputConstraint
    maxBoxWidth?: InputConstraint
    minBoxDepth?: InputConstraint
    maxBoxDepth?: InputConstraint
}

export interface BoxState {
    // Core dimensions
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean

    // Multi-box settings
    minBoxWidth: number
    maxBoxWidth: number
    minBoxDepth: number
    maxBoxDepth: number
    useMultipleBoxes: boolean
    boxWidths: number[]
    boxDepths: number[]

    // Export options
    uniqueBoxesExport: boolean

    // Box actions
    setWidth: (width: number) => void
    setDepth: (depth: number) => void
    setHeight: (height: number) => void
    setWallThickness: (thickness: number) => void
    setCornerRadius: (radius: number) => void
    setHasBottom: (hasBottom: boolean) => void
    setMinBoxWidth: (width: number) => void
    setMaxBoxWidth: (width: number) => void
    setMinBoxDepth: (depth: number) => void
    setMaxBoxDepth: (depth: number) => void
    setUseMultipleBoxes: (useMultiple: boolean) => void
    setUniqueBoxesExport: (uniqueExport: boolean) => void
    updateBoxInput: (name: string, value: number | boolean | string) => void
}

export interface StoreState extends BoxState, UIState {
    // Existing methods
    loadFromUrl: () => void
    shareConfiguration: () => Promise<boolean>
    updateInput: (name: string, value: number | boolean | string) => void

    // Adding box combining methods to make them available from the store
    canCombineSelectedBoxes: () => boolean
    combineSelectedBoxes: () => void
    isCombinedBox: (index: number) => boolean
    isPrimaryBox: (index: number) => boolean
    getCombinedBoxIndices: (index: number) => number[]
    resetCombinedBoxes: () => void
}

export interface UIState {
    // UI settings
    debugMode: boolean
    showGrid: boolean
    showAxes: boolean
    actionsBarPosition: string

    // Selection and visibility state
    selectedBoxIndex: number | null
    selectedBoxIndices: Set<number>
    hiddenBoxes: Set<number>

    // Combined boxes tracking (primary box index -> array of secondary box indexes)
    combinedBoxes: Map<number, CombinedBoxInfo>

    // Color settings
    boxColor: string
    highlightColor: string

    // UI actions
    setDebugMode: (debug: boolean) => void
    setShowGrid: (show: boolean) => void
    setShowAxes: (show: boolean) => void
    setActionsBarPosition: (position: 'top' | 'bottom') => void
    setSelectedBoxIndex: (index: number | null) => void
    toggleBoxSelection: (index: number, isMultiSelect: boolean) => void
    clearSelectedBoxes: () => void
    toggleBoxVisibility: (index: number) => void
    toggleSelectedBoxesVisibility: () => void
    isBoxVisible: (index: number) => boolean
    isBoxSelected: (index: number) => boolean
    setBoxColor: (color: string) => void
    setHighlightColor: (color: string) => void
    getBoxHexColor: () => number
    getHighlightHexColor: () => number
    updateUIInput: (name: string, value: number | boolean | string) => void

    // Box combining actions
    canCombineSelectedBoxes: () => boolean
    combineSelectedBoxes: () => void
    isCombinedBox: (index: number) => boolean
    isPrimaryBox: (index: number) => boolean
    getCombinedBoxIndices: (index: number) => number[]
    resetCombinedBoxes: () => void
}
