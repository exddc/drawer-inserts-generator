/**
 * @vitest-environment happy-dom
 */
import { useGridLayout } from '@/hooks/useGridLayout'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { encodeLayout, V1_DEFAULT_CONFIG } from '@/lib/layoutCodec'
import { v1GetMinimumBoxSize, v1ResizeGrid } from '@/lib/layoutCodecV1'
import { LAYOUT_STORAGE_KEY } from '@/lib/layoutPersistence'
import { createModelSnapshot } from '@/lib/modelSnapshot'
import { useStore } from '@/lib/store'
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}))

function PersistedHome() {
    useLayoutPersistence()
    const state = useStore()
    const minBoxSize = v1GetMinimumBoxSize(
        state.wallThickness,
        state.cornerRadius
    )
    useGridLayout({
        grid: state.grid,
        totalWidth: state.totalWidth,
        totalDepth: state.totalDepth,
        maxBoxWidth: state.maxBoxWidth,
        maxBoxDepth: state.maxBoxDepth,
        minBoxSize,
        setGrid: state.setGrid,
        layoutHydrated: state.layoutHydrated,
    })

    return (
        <div data-testid="hydrated">
            {state.layoutHydrated ? 'ready' : 'pending'}
        </div>
    )
}

describe('mounted hydration + grid layout', () => {
    beforeEach(() => {
        useStore.setState({
            ...V1_DEFAULT_CONFIG,
            grid: [],
            selectedBoxIds: [],
            layoutHydrated: false,
        })
        localStorage.clear()
        window.history.replaceState(null, '', '/')
        window.location.hash = ''
    })

    afterEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it('preserves combined and hidden cells after all layout and passive effects', async () => {
        const grid = v1ResizeGrid(
            [],
            200,
            V1_DEFAULT_CONFIG.totalDepth,
            V1_DEFAULT_CONFIG.maxBoxWidth,
            V1_DEFAULT_CONFIG.maxBoxDepth,
            v1GetMinimumBoxSize(
                V1_DEFAULT_CONFIG.wallThickness,
                V1_DEFAULT_CONFIG.cornerRadius
            )
        )
        grid[0][0].group = 7
        grid[0][1].group = 7
        grid[1][0].visibility = 'hidden'

        const saved = createModelSnapshot({
            ...V1_DEFAULT_CONFIG,
            totalWidth: 200,
            grid,
        })
        localStorage.setItem(LAYOUT_STORAGE_KEY, encodeLayout(saved))

        render(<PersistedHome />)

        await waitFor(() => {
            expect(useStore.getState().layoutHydrated).toBe(true)
        })

        // Allow any passive effects from the pre-hydration render to flush.
        await act(async () => {
            await Promise.resolve()
        })

        const state = useStore.getState()
        expect(state.totalWidth).toBe(200)
        expect(state.grid).toEqual(saved.grid)
        expect(state.grid[0][0].group).toBe(7)
        expect(state.grid[0][1].group).toBe(7)
        expect(state.grid[1][0].visibility).toBe('hidden')
        expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe(
            encodeLayout(saved)
        )
    })
})
