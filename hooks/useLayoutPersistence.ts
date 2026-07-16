'use client'

import {
    getShareUrl,
    persistLayout,
    type PersistLayoutResult,
} from '@/lib/layoutPersistence'
import {
    createLayoutPersistenceController,
    PERSIST_DEBOUNCE_MS,
} from '@/lib/layoutPersistenceController'
import { useStore } from '@/lib/store'
import { useLayoutEffect, useRef } from 'react'
import { toast } from 'sonner'

export { PERSIST_DEBOUNCE_MS }

export function reportPersistFailure(
    result: PersistLayoutResult,
    options: { alreadyReported: boolean }
): boolean {
    if (result.localStorageWritten) return false

    if (!options.alreadyReported) {
        if (!result.hashWritten) {
            toast.error(
                'Could not save layout. Changes may be lost on refresh.'
            )
        } else {
            toast.error(
                'Could not save layout locally. Share link may still work.'
            )
        }
    }

    return true
}

export function useLayoutPersistence(): void {
    const storageFailureReportedRef = useRef(false)

    useLayoutEffect(() => {
        const controller = createLayoutPersistenceController({
            getState: () => useStore.getState(),
            subscribe: (listener) => useStore.subscribe(listener),
            onInvalidHash: () => {
                toast.error(
                    'Invalid share link. Loaded the default layout instead.'
                )
            },
            onPersistResult: (result) => {
                storageFailureReportedRef.current = reportPersistFailure(
                    result,
                    { alreadyReported: storageFailureReportedRef.current }
                )
            },
        })

        controller.hydrate()
        controller.start()

        const onPageHide = () => controller.flush()
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') controller.flush()
        }

        window.addEventListener('pagehide', onPageHide)
        document.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            window.removeEventListener('pagehide', onPageHide)
            document.removeEventListener('visibilitychange', onVisibilityChange)
            controller.dispose()
        }
    }, [])
}

export type CopyShareLinkResult =
    | { status: 'copied' }
    | { status: 'too-large' }
    | { status: 'clipboard-unavailable' }
    | { status: 'clipboard-failed' }

export async function copyShareLink(): Promise<CopyShareLinkResult> {
    const result = persistLayout(useStore.getState())
    const shareUrl = getShareUrl(result.encoded)
    if (!shareUrl || !result.hashWritten) {
        return { status: 'too-large' }
    }

    if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== 'function'
    ) {
        return { status: 'clipboard-unavailable' }
    }

    try {
        await navigator.clipboard.writeText(shareUrl)
        return { status: 'copied' }
    } catch {
        return { status: 'clipboard-failed' }
    }
}
