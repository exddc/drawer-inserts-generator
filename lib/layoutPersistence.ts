import {
    decodeLayout,
    MAX_LAYOUT_STORAGE_CHARS,
    tryEncodeLayout,
    type LayoutEncodeResult,
} from '@/lib/layoutCodec'
import { createModelSnapshot, type ModelSnapshot } from '@/lib/modelSnapshot'
import type { ModelConfig, StoreState } from '@/lib/types'

export type PersistableState = Pick<StoreState, keyof ModelConfig | 'grid'>

export const LAYOUT_STORAGE_KEY = 'box-grid:layout:v1'
export const LAYOUT_HASH_PARAM = 'l'
export const MAX_LAYOUT_HASH_LENGTH = 8000

/** Why persist failed or was partial. Null when encode + both writes succeed. */
export type PersistFailureReason =
    | 'oversized'
    | 'invalid'
    | 'invalid-topology'
    | 'storage-failed'
    | 'hash-failed'

export type PersistLayoutResult = {
    encoded: string
    hashWritten: boolean
    localStorageWritten: boolean
    /** Primary failure when anything failed; null on full success. */
    failureReason: PersistFailureReason | null
}

export type HydrationResult =
    | { status: 'hash'; snapshot: ModelSnapshot }
    | { status: 'local'; snapshot: ModelSnapshot }
    | { status: 'default' }
    | { status: 'invalid-hash'; reason: string }

export function encodePersistableLayout(
    state: PersistableState
): LayoutEncodeResult {
    return tryEncodeLayout(createModelSnapshot(state))
}

export function resolvePersistedLayout(): HydrationResult {
    if (typeof window === 'undefined') return { status: 'default' }

    const hashPayload = getHashPayload()
    if (hashPayload !== null) {
        const decoded = decodeLayout(hashPayload)
        if (decoded.ok) {
            return { status: 'hash', snapshot: decoded.snapshot }
        }
        return { status: 'invalid-hash', reason: decoded.reason }
    }

    const local = readLayoutFromLocalStorage()
    if (local) return { status: 'local', snapshot: local }

    return { status: 'default' }
}

export function readLayoutFromLocalStorage(): ModelSnapshot | null {
    try {
        const encoded = localStorage.getItem(LAYOUT_STORAGE_KEY)
        if (!encoded) return null
        const decoded = decodeLayout(encoded)
        return decoded.ok ? decoded.snapshot : null
    } catch {
        return null
    }
}

/**
 * Encode and write layout to localStorage and the URL hash.
 * On encode failure the hash is cleared so reload does not keep a stale share;
 * the previous localStorage value is left untouched.
 */
export function persistLayout(state: PersistableState): PersistLayoutResult {
    const encodedResult = encodePersistableLayout(state)
    if (!encodedResult.ok) {
        clearLayoutHash()
        return {
            encoded: '',
            hashWritten: false,
            localStorageWritten: false,
            failureReason: encodedResult.reason,
        }
    }

    const encoded = encodedResult.encoded
    const localStorageWritten = writeLayoutToLocalStorage(encoded)
    const hashWritten = writeLayoutToHash(encoded)

    let failureReason: PersistFailureReason | null = null
    if (!localStorageWritten) {
        failureReason = 'storage-failed'
    } else if (!hashWritten) {
        failureReason = 'hash-failed'
    }

    return {
        encoded,
        hashWritten,
        localStorageWritten,
        failureReason,
    }
}

export function writeLayoutToLocalStorage(encoded: string): boolean {
    // Guard direct callers; tryEncodeLayout already enforces this ceiling.
    if (encoded.length > MAX_LAYOUT_STORAGE_CHARS) return false

    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, encoded)
        return true
    } catch {
        return false
    }
}

export function writeLayoutToHash(encoded: string): boolean {
    if (typeof window === 'undefined') return false

    if (encoded.length > MAX_LAYOUT_HASH_LENGTH) {
        // Drop a stale smaller hash so reload uses the latest local save.
        clearLayoutHash()
        return false
    }

    try {
        const url = new URL(window.location.href)
        const hashParams = getHashParams(url)
        hashParams.set(LAYOUT_HASH_PARAM, encoded)
        url.hash = hashParams.toString()
        replaceCurrentUrl(url)
        return true
    } catch {
        return false
    }
}

export function clearLayoutHash(): void {
    if (typeof window === 'undefined') return

    try {
        const url = new URL(window.location.href)
        const hashParams = getHashParams(url)
        if (!hashParams.has(LAYOUT_HASH_PARAM)) return

        hashParams.delete(LAYOUT_HASH_PARAM)
        url.hash = hashParams.toString()
        replaceCurrentUrl(url)
    } catch {
        // Ignore history failures; callers treat hash as not written.
    }
}

export function getShareUrl(encoded: string): string | null {
    if (typeof window === 'undefined') return null
    if (encoded.length > MAX_LAYOUT_HASH_LENGTH) return null

    try {
        const url = new URL(window.location.href)
        const hashParams = getHashParams(url)
        hashParams.set(LAYOUT_HASH_PARAM, encoded)
        url.hash = hashParams.toString()
        return url.toString()
    } catch {
        return null
    }
}

export function getHashPayload(): string | null {
    if (typeof window === 'undefined') return null

    const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
    if (!hash) return null

    // Present but empty `l=` still counts as an explicit share payload.
    const hashParams = new URLSearchParams(hash)
    if (!hashParams.has(LAYOUT_HASH_PARAM)) return null
    return hashParams.get(LAYOUT_HASH_PARAM) ?? ''
}

function getHashParams(url: URL): URLSearchParams {
    return new URLSearchParams(
        url.hash.startsWith('#') ? url.hash.slice(1) : ''
    )
}

function replaceCurrentUrl(url: URL): void {
    window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`
    )
}
