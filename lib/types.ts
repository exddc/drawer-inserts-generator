export type Visibility = 'visible' | 'hidden'

export type GridCell = {
    group: number
    width: number
    depth: number
    visibility?: Visibility
    color?: number
}

/** @deprecated Use GridCell. */
export type Cell = GridCell

export type Grid = GridCell[][]

export type GridCoordinate = {
    x: number
    z: number
}

export type SelectionId = `group:${number}` | `cell:${number}:${number}`

export type BoxDimensions = {
    width: number
    depth: number
    height: number
}

export type Box = {
    id: SelectionId
    index: number
    group: number
    cells: GridCoordinate[]
    visibility: Visibility
}

/** Pure metadata produced from a grid before any Three.js objects are built. */
export type GeneratedBoxMetadata = Box & {
    dimensions: BoxDimensions
    isCombined: boolean
}

export type ModelConfig = {
    totalWidth: number
    totalDepth: number
    wallThickness: number
    cornerRadius: number
    wallHeight: number
    generateBottom: boolean
    maxBoxWidth: number
    maxBoxDepth: number
}

export type DrawerInsert = {
    config: ModelConfig
    grid: Grid
    selectedBoxIds: SelectionId[]
}

export interface StoreState extends ModelConfig {
    grid: Grid
    setGrid: (grid: Grid) => void

    /** False until layout persistence has hydrated (or decided defaults). */
    layoutHydrated: boolean
    setLayoutHydrated: (hydrated: boolean) => void

    selectedBoxIds: SelectionId[]
    setSelectedBoxIds: (ids: SelectionId[]) => void

    setTotalWidth: (width: number) => number
    setTotalDepth: (depth: number) => number
    setWallThickness: (thickness: number) => number
    setCornerRadius: (radius: number) => number
    setWallHeight: (height: number) => number
    setGenerateBottom: (generate: boolean) => void
    setMaxBoxWidth: (width: number) => number
    setMaxBoxDepth: (depth: number) => number

    actionsBarPosition: 'top' | 'bottom'
    setActionsBarPosition: (position: 'top' | 'bottom') => void

    showHelperGrid: boolean
    setShowHelperGrid: (show: boolean) => void

    standardColor: number
    selectedColor: number
    setStandardColor: (color: number) => void
    setSelectedColor: (color: number) => void

    redrawTrigger: number
    forceRedraw: () => void

    showCornerLines: boolean
    cornerLineColor: number
    cornerLineOpacity: number

    setShowCornerLines: (show: boolean) => void
    setCornerLineColor: (color: number) => void
    setCornerLineOpacity: (opacity: number) => void
}
