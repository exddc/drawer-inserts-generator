import {
    copyShareLink,
    reportPersistFailure,
} from '@/hooks/useLayoutPersistence'
import { resizeGrid } from '@/lib/gridHelper'
import { encodeLayout, V1_DEFAULT_CONFIG } from '@/lib/layoutCodec'
import { LAYOUT_HASH_PARAM, LAYOUT_STORAGE_KEY } from '@/lib/layoutPersistence'
import {
    createLayoutPersistenceController,
    PERSIST_DEBOUNCE_MS,
} from '@/lib/layoutPersistenceController'
import { createModelSnapshot } from '@/lib/modelSnapshot'
import { getMinimumBoxSize } from '@/lib/parameterValidation'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}))

function defaultGrid() {
    return resizeGrid(
        [],
        V1_DEFAULT_CONFIG.totalWidth,
        V1_DEFAULT_CONFIG.totalDepth,
        V1_DEFAULT_CONFIG.maxBoxWidth,
        V1_DEFAULT_CONFIG.maxBoxDepth,
        getMinimumBoxSize(
            V1_DEFAULT_CONFIG.wallThickness,
            V1_DEFAULT_CONFIG.cornerRadius
        )
    )
}

function installBrowserMocks() {
    const storage = new Map<string, string>()
    const localStorageMock = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
            storage.set(key, value)
        },
        removeItem: (key: string) => {
            storage.delete(key)
        },
        clear: () => storage.clear(),
    }

    let href = 'https://box-grid.example/'
    const location = {
        get href() {
            return href
        },
        set href(value: string) {
            href = value
        },
        get hash() {
            return new URL(href).hash
        },
        get pathname() {
            return new URL(href).pathname
        },
        get search() {
            return new URL(href).search
        },
    }

    const history = {
        replaceState: (_state: unknown, _title: string, url: string) => {
            href = new URL(url, href).toString()
        },
    }

    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('location', location)
    vi.stubGlobal('history', history)
    vi.stubGlobal('window', {
        localStorage: localStorageMock,
        location,
        history,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })
    vi.stubGlobal('document', {
        visibilityState: 'visible' as DocumentVisibilityState,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })

    return {
        setHref: (value: string) => {
            href = value
        },
    }
}

describe('layout persistence controller', () => {
    beforeEach(() => {
        installBrowserMocks()
        useStore.setState({
            ...V1_DEFAULT_CONFIG,
            grid: [],
            selectedBoxIds: [],
            layoutHydrated: false,
        })
        vi.mocked(toast.error).mockClear()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('hydrates identical default store state from local storage after start', () => {
        const grid = resizeGrid(
            [],
            200,
            V1_DEFAULT_CONFIG.totalDepth,
            V1_DEFAULT_CONFIG.maxBoxWidth,
            V1_DEFAULT_CONFIG.maxBoxDepth,
            getMinimumBoxSize(
                V1_DEFAULT_CONFIG.wallThickness,
                V1_DEFAULT_CONFIG.cornerRadius
            )
        )
        const model = createModelSnapshot({
            ...V1_DEFAULT_CONFIG,
            totalWidth: 200,
            grid,
        })
        localStorage.setItem(LAYOUT_STORAGE_KEY, encodeLayout(model))

        expect(useStore.getState().totalWidth).toBe(
            V1_DEFAULT_CONFIG.totalWidth
        )

        const controller = createLayoutPersistenceController({
            getState: () => useStore.getState(),
            subscribe: (listener) => useStore.subscribe(listener),
        })
        controller.hydrate()

        expect(useStore.getState().totalWidth).toBe(200)
        expect(useStore.getState().grid).toEqual(grid)
    })

    it('does not apply local storage when the share hash is corrupt', () => {
        const localModel = createModelSnapshot({
            ...V1_DEFAULT_CONFIG,
            totalWidth: 180,
            grid: defaultGrid(),
        })
        localStorage.setItem(LAYOUT_STORAGE_KEY, encodeLayout(localModel))
        history.replaceState(
            null,
            '',
            `https://box-grid.example/#${LAYOUT_HASH_PARAM}=not-valid`
        )

        const onInvalidHash = vi.fn()
        const controller = createLayoutPersistenceController({
            getState: () => useStore.getState(),
            subscribe: (listener) => useStore.subscribe(listener),
            onInvalidHash,
        })
        const result = controller.hydrate()

        expect(result).toEqual({ status: 'invalid-hash', reason: 'corrupt' })
        expect(onInvalidHash).toHaveBeenCalledWith('corrupt')
        expect(useStore.getState().totalWidth).toBe(
            V1_DEFAULT_CONFIG.totalWidth
        )
        expect(location.hash).toBe('')
    })

    it('flushes the latest debounced edit on dispose', () => {
        const controller = createLayoutPersistenceController({
            getState: () => useStore.getState(),
            subscribe: (listener) => useStore.subscribe(listener),
        })
        controller.hydrate()
        controller.start()

        useStore.setState({ totalWidth: 220 })
        expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull()

        controller.dispose()

        const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
        expect(saved).toBeTruthy()
        const decodedJson = Buffer.from(
            saved!.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
        ).toString('utf8')
        expect(decodedJson).toContain('"w":220')
    })

    it('flushes pending edits when flush is called before debounce elapses', () => {
        const controller = createLayoutPersistenceController({
            getState: () => useStore.getState(),
            subscribe: (listener) => useStore.subscribe(listener),
        })
        controller.hydrate()
        controller.start()

        useStore.setState({ totalWidth: 230 })
        controller.flush()

        const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
        expect(saved).toBeTruthy()
        const decodedJson = Buffer.from(
            saved!.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
        ).toString('utf8')
        expect(decodedJson).toContain('"w":230')
    })

    it('persists after the debounce interval', () => {
        const controller = createLayoutPersistenceController({
            getState: () => useStore.getState(),
            subscribe: (listener) => useStore.subscribe(listener),
        })
        controller.hydrate()
        controller.start()

        useStore.setState({ totalWidth: 240 })
        expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull()

        vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS)

        expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeTruthy()
        controller.dispose()
    })

    it('surfaces storage failures once via reportPersistFailure', () => {
        expect(
            reportPersistFailure(
                {
                    encoded: 'abc',
                    hashWritten: false,
                    localStorageWritten: false,
                    oversized: false,
                },
                { alreadyReported: false }
            )
        ).toBe(true)
        expect(toast.error).toHaveBeenCalledTimes(1)

        expect(
            reportPersistFailure(
                {
                    encoded: 'abc',
                    hashWritten: false,
                    localStorageWritten: false,
                    oversized: false,
                },
                { alreadyReported: true }
            )
        ).toBe(true)
        expect(toast.error).toHaveBeenCalledTimes(1)
    })
})

describe('copyShareLink', () => {
    beforeEach(() => {
        installBrowserMocks()
        useStore.setState({
            ...V1_DEFAULT_CONFIG,
            grid: defaultGrid(),
            selectedBoxIds: [],
            layoutHydrated: true,
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('reports success only after clipboard write fulfills', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { clipboard: { writeText } })

        await expect(copyShareLink()).resolves.toEqual({ status: 'copied' })
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#l='))
    })

    it('reports clipboard rejection', async () => {
        vi.stubGlobal('navigator', {
            clipboard: {
                writeText: vi.fn().mockRejectedValue(new Error('denied')),
            },
        })

        await expect(copyShareLink()).resolves.toEqual({
            status: 'clipboard-failed',
        })
    })

    it('reports missing clipboard API', async () => {
        vi.stubGlobal('navigator', {})

        await expect(copyShareLink()).resolves.toEqual({
            status: 'clipboard-unavailable',
        })
    })

    it('reports hash-failed when history.replaceState throws', async () => {
        vi.stubGlobal('navigator', {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        })
        vi.stubGlobal('history', {
            replaceState: () => {
                throw new Error('blocked')
            },
        })
        vi.stubGlobal('window', {
            ...window,
            history: {
                replaceState: () => {
                    throw new Error('blocked')
                },
            },
        })

        await expect(copyShareLink()).resolves.toEqual({
            status: 'hash-failed',
        })
    })
})
