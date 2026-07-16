import { cornerLine, material, parameters } from '@/lib/defaults'
import type { ModelSnapshot } from '@/lib/modelSnapshot'
import { applyModelSnapshot } from '@/lib/modelSnapshot'
import type { ModelParameters } from '@/lib/parameterValidation'
import { sanitizeModelParameters } from '@/lib/parameterValidation'
import { StoreState } from '@/lib/types'
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

    grid: [],
    setGrid: (grid) => set({ grid }),

    selectedBoxIds: [],
    setSelectedBoxIds: (selectedBoxIds) => set({ selectedBoxIds }),
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

export function hydrateStoreFromSnapshot(snapshot: ModelSnapshot): void {
    useStore.setState({
        ...applyModelSnapshot(snapshot),
        selectedBoxIds: [],
    })
}

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
