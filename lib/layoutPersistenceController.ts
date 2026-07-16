import {
    clearLayoutHash,
    persistLayout,
    resolvePersistedLayout,
    type PersistLayoutResult,
} from '@/lib/layoutPersistence'
import { hydrateStoreFromSnapshot } from '@/lib/store'
import type { StoreState } from '@/lib/types'

export const PERSIST_DEBOUNCE_MS = 300

export type LayoutPersistenceControllerOptions = {
    getState: () => StoreState
    subscribe: (
        listener: (state: StoreState, previousState: StoreState) => void
    ) => () => void
    onPersistResult?: (result: PersistLayoutResult) => void
    onInvalidHash?: (reason: string) => void
    debounceMs?: number
}

const PERSISTENCE_KEYS: (keyof StoreState)[] = [
    'totalWidth',
    'totalDepth',
    'wallThickness',
    'cornerRadius',
    'wallHeight',
    'generateBottom',
    'maxBoxWidth',
    'maxBoxDepth',
    'grid',
]

export function hasPersistenceChanges(
    current: StoreState,
    previous: StoreState
): boolean {
    if (current.grid !== previous.grid) return true

    return PERSISTENCE_KEYS.some((key) => {
        if (key === 'grid') return false
        return current[key] !== previous[key]
    })
}

export function createLayoutPersistenceController(
    options: LayoutPersistenceControllerOptions
) {
    const debounceMs = options.debounceMs ?? PERSIST_DEBOUNCE_MS
    let timeout: ReturnType<typeof setTimeout> | null = null
    let pendingState: StoreState | null = null
    let unsubscribe: (() => void) | null = null

    const persistNow = (state: StoreState) => {
        pendingState = null
        const result = persistLayout(state)
        options.onPersistResult?.(result)
        return result
    }

    const flushPending = () => {
        if (timeout) {
            clearTimeout(timeout)
            timeout = null
        }
        if (pendingState) {
            persistNow(pendingState)
        }
    }

    const schedulePersist = (state: StoreState) => {
        pendingState = state
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
            timeout = null
            if (pendingState) persistNow(pendingState)
        }, debounceMs)
    }

    return {
        hydrate() {
            const hydration = resolvePersistedLayout()
            if (hydration.status === 'hash' || hydration.status === 'local') {
                hydrateStoreFromSnapshot(hydration.snapshot)
            } else if (hydration.status === 'invalid-hash') {
                clearLayoutHash()
                options.onInvalidHash?.(hydration.reason)
            }
            return hydration
        },
        start() {
            unsubscribe = options.subscribe((state, previousState) => {
                if (!hasPersistenceChanges(state, previousState)) return
                schedulePersist(state)
            })
        },
        flush: flushPending,
        dispose() {
            unsubscribe?.()
            unsubscribe = null
            flushPending()
        },
    }
}
