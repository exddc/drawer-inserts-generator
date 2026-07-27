'use client'

import {
    createLayoutPersistenceController,
    PERSIST_DEBOUNCE_MS,
} from '@/lib/layoutPersistenceController'
import { reportPersistFailure } from '@/lib/shareLink'
import { useStore } from '@/lib/store'
import { useLayoutEffect, useRef } from 'react'
import { toast } from 'sonner'

export { PERSIST_DEBOUNCE_MS }

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
