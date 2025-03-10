// lib/urlUtils.ts
import { BoxState } from '@/lib/store'

/**
 * Encode the current box configuration into a URL parameter
 */
export function encodeBoxConfig(config: BoxState): string {
    // Extract relevant values from the config
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

    // Create simplified object with all the values we want to encode
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

    // Convert to JSON and encode
    const jsonConfig = JSON.stringify(configToEncode)
    return btoa(jsonConfig)
}

/**
 * Decode URL parameter into box configuration
 */
export function decodeBoxConfig(encoded: string): Partial<BoxState> {
    try {
        // Decode base64 string and parse JSON
        const jsonConfig = atob(encoded)
        const config = JSON.parse(jsonConfig)

        // Map back to BoxState format
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
        // Create URL with encoded configuration
        const encoded = encodeBoxConfig(config)
        const url = new URL(window.location.href)
        url.searchParams.set('config', encoded)

        // Copy to clipboard
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
