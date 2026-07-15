import { decodeLayout, encodeLayout } from '@/lib/layoutCodec'
import { createModelSnapshot, type ModelSnapshot } from '@/lib/modelSnapshot'
import type { StoreState } from '@/lib/types'

export const LAYOUT_STORAGE_KEY = 'box-grid:layout:v1'
export const LAYOUT_HASH_PARAM = 'l'
export const MAX_LAYOUT_HASH_LENGTH = 8000

export function loadPersistedLayout(): ModelSnapshot | null {
    if (typeof window === 'undefined') return null

    const fromHash = readLayoutFromHash()
    if (fromHash) return fromHash

    return readLayoutFromLocalStorage()
}

export function readLayoutFromHash(): ModelSnapshot | null {
    const encoded = getHashPayload()
    if (!encoded) return null
    return decodeLayout(encoded)
}

export function readLayoutFromLocalStorage(): ModelSnapshot | null {
    try {
        const encoded = localStorage.getItem(LAYOUT_STORAGE_KEY)
        if (!encoded) return null
        return decodeLayout(encoded)
    } catch {
        return null
    }
}

export function persistLayout(state: StoreState): {
    encoded: string
    hashWritten: boolean
} {
    const encoded = encodeLayout(createModelSnapshot(state))

    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, encoded)
    } catch {
        // Ignore quota or privacy-mode failures.
    }

    return {
        encoded,
        hashWritten: writeLayoutToHash(encoded),
    }
}

export function writeLayoutToHash(encoded: string): boolean {
    if (encoded.length > MAX_LAYOUT_HASH_LENGTH) return false

    const url = new URL(window.location.href)
    url.hash = `${LAYOUT_HASH_PARAM}=${encoded}`
    history.replaceState(null, '', url.toString())
    return true
}

export function getShareUrl(encoded: string): string | null {
    if (encoded.length > MAX_LAYOUT_HASH_LENGTH) return null

    const url = new URL(window.location.href)
    url.hash = `${LAYOUT_HASH_PARAM}=${encoded}`
    return url.toString()
}

function getHashPayload(): string | null {
    const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
    if (!hash) return null

    return new URLSearchParams(hash).get(LAYOUT_HASH_PARAM)
}
