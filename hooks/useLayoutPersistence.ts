'use client'

import { persistLayout } from '@/lib/layoutPersistence'
import { useStore } from '@/lib/store'
import type { StoreState } from '@/lib/types'
import { useEffect, useRef } from 'react'

const PERSIST_DEBOUNCE_MS = 300

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

function hasPersistenceChanges(
    current: StoreState,
    previous: StoreState
): boolean {
    if (current.grid !== previous.grid) return true

    return PERSISTENCE_KEYS.some((key) => {
        if (key === 'grid') return false
        return current[key] !== previous[key]
    })
}

export function useLayoutPersistence(): void {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const persistNow = (state: StoreState) => {
            persistLayout(state)
        }

        const schedulePersist = (state: StoreState) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => {
                persistNow(state)
            }, PERSIST_DEBOUNCE_MS)
        }

        persistNow(useStore.getState())

        const unsubscribe = useStore.subscribe((state, previousState) => {
            if (!hasPersistenceChanges(state, previousState)) return
            schedulePersist(state)
        })

        return () => {
            unsubscribe()
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])
}

export function copyShareLink(): {
    copied: boolean
    tooLarge: boolean
} {
    const { encoded, hashWritten } = persistLayout(useStore.getState())
    const shareUrl = hashWritten
        ? new URL(window.location.href).toString()
        : null

    if (!shareUrl) {
        return { copied: false, tooLarge: encoded.length > 0 }
    }

    void navigator.clipboard.writeText(shareUrl)
    return { copied: true, tooLarge: false }
}
