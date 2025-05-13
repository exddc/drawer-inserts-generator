export type Cell = {
    group: number
    width: number
    depth: number
    color?: number
}

export interface StoreState {
    totalWidth: number
    totalDepth: number
    wallThickness: number
    cornerRadius: number
    wallHeight: number
    generateBottom: boolean

    setTotalWidth: (width: number) => void
    setTotalDepth: (depth: number) => void
    setWallThickness: (thickness: number) => void
    setCornerRadius: (radius: number) => void
    setWallHeight: (height: number) => void
    setGenerateBottom: (generate: boolean) => void
}