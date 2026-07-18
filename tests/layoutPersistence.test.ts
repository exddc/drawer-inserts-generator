import { resizeGrid } from '@/lib/gridHelper'
import {
    encodeLayout,
    MAX_LAYOUT_STORAGE_CHARS,
    V1_DEFAULT_CONFIG,
} from '@/lib/layoutCodec'
import {
    clearLayoutHash,
    getShareUrl,
    LAYOUT_HASH_PARAM,
    LAYOUT_STORAGE_KEY,
    MAX_LAYOUT_HASH_LENGTH,
    persistLayout,
    resolvePersistedLayout,
    writeLayoutToHash,
    writeLayoutToLocalStorage,
} from '@/lib/layoutPersistence'
import { createModelSnapshot } from '@/lib/modelSnapshot'
import { getMinimumBoxSize } from '@/lib/parameterValidation'
import type { Grid, ModelConfig } from '@/lib/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function createGrid(config: Partial<ModelConfig> = {}): Grid {
    const full = { ...V1_DEFAULT_CONFIG, ...config }
    return resizeGrid(
        [],
        full.totalWidth,
        full.totalDepth,
        full.maxBoxWidth,
        full.maxBoxDepth,
        getMinimumBoxSize(full.wallThickness, full.cornerRadius)
    )
}

function snapshot(config: Partial<ModelConfig> = {}, grid?: Grid) {
    const full = { ...V1_DEFAULT_CONFIG, ...config }
    return createModelSnapshot({
        ...full,
        grid: grid ?? createGrid(full),
    })
}

function storeFromSnapshot(model = snapshot()) {
    return {
        ...model.config,
        grid: model.grid,
    }
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

    const initialHistoryState = { __NA: true, marker: 'preserve-me' }
    const history = {
        state: initialHistoryState as unknown,
        replaceState: (state: unknown, _title: string, url: string) => {
            history.state = state
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
    })

    return {
        storage,
        getHref: () => href,
        setHref: (value: string) => {
            href = value
        },
        initialHistoryState,
    }
}

describe('layoutPersistence', () => {
    beforeEach(() => {
        installBrowserMocks()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('prefers a valid hash layout over local storage', () => {
        const hashSnapshot = snapshot({ totalWidth: 220 })
        const localSnapshot = snapshot({ totalWidth: 180 })
        localStorage.setItem(LAYOUT_STORAGE_KEY, encodeLayout(localSnapshot))
        writeLayoutToHash(encodeLayout(hashSnapshot))

        expect(resolvePersistedLayout()).toEqual({
            status: 'hash',
            snapshot: hashSnapshot,
        })
    })

    it('falls back to local storage when the hash is absent', () => {
        const localSnapshot = snapshot({ totalWidth: 180 })
        localStorage.setItem(LAYOUT_STORAGE_KEY, encodeLayout(localSnapshot))

        expect(resolvePersistedLayout()).toEqual({
            status: 'local',
            snapshot: localSnapshot,
        })
    })

    it('treats a corrupt hash as invalid instead of loading local storage', () => {
        const localSnapshot = snapshot({ totalWidth: 180 })
        localStorage.setItem(LAYOUT_STORAGE_KEY, encodeLayout(localSnapshot))
        history.replaceState(
            null,
            '',
            `https://box-grid.example/#${LAYOUT_HASH_PARAM}=not-valid`
        )

        expect(resolvePersistedLayout()).toEqual({
            status: 'invalid-hash',
            reason: 'corrupt',
        })
    })

    it('clears a stale hash when the latest layout exceeds the URL limit', () => {
        const small = snapshot({ totalWidth: 160 })
        const largeConfig = {
            totalWidth: 500,
            totalDepth: 500,
            maxBoxWidth: 14,
            maxBoxDepth: 14,
            generateBottom: false,
            wallHeight: 55.5,
        }
        const largeGrid = createGrid(largeConfig)
        // Unique per-cell groups + hidden cells make a long, still-valid payload.
        let groupId = 1
        for (const row of largeGrid) {
            for (const cell of row) {
                cell.group = groupId++
                cell.visibility = 'hidden'
            }
        }
        const largeSnapshot = snapshot(largeConfig, largeGrid)
        const smallEncoded = encodeLayout(small)
        const largeEncoded = encodeLayout(largeSnapshot)

        expect(smallEncoded.length).toBeLessThanOrEqual(MAX_LAYOUT_HASH_LENGTH)
        expect(largeEncoded.length).toBeGreaterThan(MAX_LAYOUT_HASH_LENGTH)

        writeLayoutToHash(smallEncoded)
        expect(location.hash).toContain(`${LAYOUT_HASH_PARAM}=`)

        const persisted = persistLayout(storeFromSnapshot(largeSnapshot))
        expect(persisted.localStorageWritten).toBe(true)
        expect(persisted.hashWritten).toBe(false)
        expect(location.hash).toBe('')
        expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe(largeEncoded)

        expect(resolvePersistedLayout()).toEqual({
            status: 'local',
            snapshot: largeSnapshot,
        })
    })

    it('reports local storage write failures', () => {
        const failingStorage = {
            getItem: () => null,
            setItem: () => {
                throw new Error('quota')
            },
            removeItem: () => undefined,
            clear: () => undefined,
        }
        vi.stubGlobal('localStorage', failingStorage)
        vi.stubGlobal('window', {
            localStorage: failingStorage,
            location,
            history,
        })

        const result = persistLayout(storeFromSnapshot())
        expect(result.localStorageWritten).toBe(false)
        expect(result.hashWritten).toBe(true)
        expect(result.oversized).toBe(false)
    })

    it('keeps the last valid save when topology is stale for new dimensions', () => {
        const previous = encodeLayout(snapshot({ totalWidth: 180 }))
        localStorage.setItem(LAYOUT_STORAGE_KEY, previous)

        const staleGrid = createGrid()
        staleGrid[0][0].group = 1
        staleGrid[0][1].group = 1
        const result = persistLayout({
            ...V1_DEFAULT_CONFIG,
            totalWidth: 300,
            grid: staleGrid,
        })

        expect(result.encoded).toBe('')
        expect(result.localStorageWritten).toBe(false)
        expect(result.oversized).toBe(false)
        expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe(previous)
    })

    it('rejects local writes above the shared storage/decode ceiling', () => {
        const oversized = 'x'.repeat(MAX_LAYOUT_STORAGE_CHARS + 1)
        expect(writeLayoutToLocalStorage(oversized)).toBe(false)
        expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull()
    })

    it('returns hashWritten false when history.replaceState throws', () => {
        vi.stubGlobal('history', {
            replaceState: () => {
                throw new Error('history blocked')
            },
        })
        vi.stubGlobal('window', {
            localStorage,
            location,
            history: {
                replaceState: () => {
                    throw new Error('history blocked')
                },
            },
        })

        const result = writeLayoutToHash(encodeLayout(snapshot()))
        expect(result).toBe(false)

        const persisted = persistLayout(storeFromSnapshot())
        expect(persisted.localStorageWritten).toBe(true)
        expect(persisted.hashWritten).toBe(false)
        expect(persisted.oversized).toBe(false)
    })

    it('returns null share urls for oversized encodings', () => {
        expect(getShareUrl('x'.repeat(MAX_LAYOUT_HASH_LENGTH + 1))).toBeNull()
    })

    it('updates only the layout hash and preserves Next.js history state', () => {
        const browser = installBrowserMocks()
        browser.setHref('https://box-grid.example/?mode=edit#tab=settings')

        writeLayoutToHash(encodeLayout(snapshot()))
        expect(location.hash).toContain('l=')
        expect(location.hash).toContain('tab=settings')
        expect(history.state).toBe(browser.initialHistoryState)

        const shareUrl = getShareUrl(
            encodeLayout(snapshot({ totalWidth: 200 }))
        )
        expect(shareUrl).toContain('tab=settings')
        expect(shareUrl).toContain('l=')

        clearLayoutHash()
        expect(location.hash).toBe('#tab=settings')
        expect(history.state).toBe(browser.initialHistoryState)
    })

    it('writeLayoutToLocalStorage returns false when storage throws', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => null,
            setItem: () => {
                throw new DOMException('quota')
            },
            removeItem: () => undefined,
            clear: () => undefined,
        })

        expect(writeLayoutToLocalStorage('abc')).toBe(false)
    })
})
