import { BoxState } from '@/lib/types'

/**
 * Encode the current box configuration into a URL parameter
 */
export function encodeBoxConfig(config: BoxState): string {
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        minBoxWidth,
        maxBoxWidth,
        minBoxDepth,
        maxBoxDepth,
        useMultipleBoxes,
    } = config

    const configToEncode = {
        w: width,
        d: depth,
        h: height,
        wt: wallThickness,
        cr: cornerRadius,
        b: hasBottom ? 1 : 0,
        mbw: minBoxWidth,
        xbw: maxBoxWidth,
        mbd: minBoxDepth,
        xbd: maxBoxDepth,
        mb: useMultipleBoxes ? 1 : 0,
    }

    const jsonConfig = JSON.stringify(configToEncode)
    return btoa(jsonConfig)
}

/**
 * Decode URL parameter into box configuration
 */
export function decodeBoxConfig(encoded: string): Partial<BoxState> {
    try {
        const jsonConfig = atob(encoded)
        const config = JSON.parse(jsonConfig)

        return {
            width: config.w,
            depth: config.d,
            height: config.h,
            wallThickness: config.wt,
            cornerRadius: config.cr,
            hasBottom: config.b === 1,
            minBoxWidth: config.mbw,
            maxBoxWidth: config.xbw,
            minBoxDepth: config.mbd,
            maxBoxDepth: config.xbd,
            useMultipleBoxes: config.mb === 1,
        }
    } catch (error) {
        console.error('Error decoding configuration:', error)
        return {}
    }
}

/**
 * Share the current configuration by copying a link to the clipboard
 */
export async function shareConfiguration(config: BoxState): Promise<boolean> {
    try {
        const encoded = encodeBoxConfig(config)
        const url = new URL(window.location.href)
        url.searchParams.set('config', encoded)

        await navigator.clipboard.writeText(url.toString())
        return true
    } catch (error) {
        console.error('Error sharing configuration:', error)
        return false
    }
}

/**
 * Extract configuration from URL if present
 */
export function getConfigFromUrl(): Partial<BoxState> | null {
    try {
        if (typeof window === 'undefined') return null

        const url = new URL(window.location.href)
        const encoded = url.searchParams.get('config')

        if (!encoded) return null

        return decodeBoxConfig(encoded)
    } catch (error) {
        console.error('Error getting configuration from URL:', error)
        return null
    }
}
