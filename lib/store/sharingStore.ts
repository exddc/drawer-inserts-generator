import { StateCreator } from 'zustand'
import { SharingState, StoreState } from '../types'
import { encodeBoxConfig, getConfigFromUrl } from '../urlUtils'

export const createSharingSlice: StateCreator<
    StoreState,
    [],
    [],
    SharingState
> = (set, get, store) => ({
    // URL sharing functionality
    loadFromUrl: () => {
        const config = getConfigFromUrl()
        if (!config) return

        // Apply configuration from URL
        Object.entries(config).forEach(([key, value]) => {
            get().updateInput(key, value)
        })
    },

    shareConfiguration: async () => {
        try {
            const boxState = {
                width: get().width,
                depth: get().depth,
                height: get().height,
                wallThickness: get().wallThickness,
                cornerRadius: get().cornerRadius,
                hasBottom: get().hasBottom,
                minBoxWidth: get().minBoxWidth,
                maxBoxWidth: get().maxBoxWidth,
                minBoxDepth: get().minBoxDepth,
                maxBoxDepth: get().maxBoxDepth,
                useMultipleBoxes: get().useMultipleBoxes,
            }

            const encoded = encodeBoxConfig(boxState)
            const url = new URL(window.location.href)
            url.searchParams.set('config', encoded)

            await navigator.clipboard.writeText(url.toString())
            return true
        } catch (error) {
            console.error('Error sharing configuration:', error)
            return false
        }
    },
})
