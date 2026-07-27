import {
    encodePersistableLayout,
    getShareUrl,
    MAX_LAYOUT_HASH_LENGTH,
    persistLayout,
    type PersistLayoutResult,
} from '@/lib/layoutPersistence'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'

/**
 * Report auto-persist failures once until a successful local write resets the flag.
 * Returns whether a storage failure is currently latched (for the caller's ref).
 */
export function reportPersistFailure(
    result: PersistLayoutResult,
    options: { alreadyReported: boolean }
): boolean {
    if (result.localStorageWritten) return false

    if (!options.alreadyReported) {
        if (result.failureReason === 'oversized') {
            toast.error('Layout is too large to save.')
        } else if (
            result.failureReason === 'invalid' ||
            result.failureReason === 'invalid-topology'
        ) {
            toast.error(
                'Could not save layout. Changes may be lost on refresh.'
            )
        } else if (result.hashWritten) {
            toast.error(
                'Could not save layout locally. Share link may still work.'
            )
        } else {
            toast.error(
                'Could not save layout. Changes may be lost on refresh.'
            )
        }
    }

    return true
}

export type CopyShareLinkResult =
    | { status: 'copied' }
    | { status: 'too-large' }
    | { status: 'invalid-layout' }
    | { status: 'hash-failed' }
    | { status: 'clipboard-unavailable' }
    | { status: 'clipboard-failed' }

/**
 * Encode the current layout, flush it to storage + hash (intentional Share
 * side effect), then copy the share URL. Pure encode runs first so invalid
 * layouts never clear a previous good hash.
 */
export async function copyShareLink(): Promise<CopyShareLinkResult> {
    const state = useStore.getState()
    const encodedResult = encodePersistableLayout(state)

    if (!encodedResult.ok) {
        if (encodedResult.reason === 'oversized') {
            return { status: 'too-large' }
        }
        return { status: 'invalid-layout' }
    }

    if (encodedResult.encoded.length > MAX_LAYOUT_HASH_LENGTH) {
        return { status: 'too-large' }
    }

    // Share commits the current layout so the address bar matches the clipboard.
    const result = persistLayout(state)
    if (!result.hashWritten || result.encoded.length === 0) {
        if (
            result.failureReason === 'oversized' ||
            result.encoded.length > MAX_LAYOUT_HASH_LENGTH
        ) {
            return { status: 'too-large' }
        }
        if (
            result.failureReason === 'invalid' ||
            result.failureReason === 'invalid-topology'
        ) {
            return { status: 'invalid-layout' }
        }
        return { status: 'hash-failed' }
    }

    const shareUrl = getShareUrl(result.encoded)
    if (!shareUrl) {
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
