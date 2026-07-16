/**
 * @vitest-environment happy-dom
 */
import { useGridLayout } from '@/hooks/useGridLayout'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { useSceneView } from '@/hooks/useSceneView'
import { generateCustomBox } from '@/lib/boxHelper'
import { encodeLayout, V1_DEFAULT_CONFIG } from '@/lib/layoutCodec'
import { v1GetMinimumBoxSize, v1ResizeGrid } from '@/lib/layoutCodecV1'
import { LAYOUT_STORAGE_KEY } from '@/lib/layoutPersistence'
import { createModelSnapshot } from '@/lib/modelSnapshot'
import { getMinimumBoxSize } from '@/lib/parameterValidation'
import { useStore } from '@/lib/store'
import { act, render, waitFor } from '@testing-library/react'
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}))

vi.mock('@/lib/sceneViewAdapter', () => ({
    SceneViewAdapter: class {
        replaceBox = vi.fn()
        dispose = vi.fn()
        pickBoxAtClientPoint = vi.fn(() => null)
        resetCamera = vi.fn()
        setTopView = vi.fn()
        setHelperGridVisible = vi.fn()
        applySelection = vi.fn()
        replaceHelperGrid = vi.fn()
    },
}))

vi.mock('@/lib/boxHelper', async () => {
    const actual =
        await vi.importActual<typeof import('@/lib/boxHelper')>(
            '@/lib/boxHelper'
        )
    return {
        ...actual,
        generateCustomBox: vi.fn((grid, options) => {
            if (grid.length === 0 || grid[0]?.length === 0) {
                throw new Error(
                    'Cannot generate box geometry for an empty grid.'
                )
            }
            return new THREE.Group()
        }),
    }
})

function FullPageProbe() {
    useLayoutPersistence()
    const state = useStore()
    const minBoxSize = getMinimumBoxSize(
        state.wallThickness,
        state.cornerRadius
    )
    const grid = useGridLayout({
        grid: state.grid,
        totalWidth: state.totalWidth,
        totalDepth: state.totalDepth,
        maxBoxWidth: state.maxBoxWidth,
        maxBoxDepth: state.maxBoxDepth,
        minBoxSize,
        setGrid: state.setGrid,
        layoutHydrated: state.layoutHydrated,
    })

    const sceneView = useSceneView({
        grid,
        totalWidth: state.totalWidth,
        totalDepth: state.totalDepth,
        wallThickness: state.wallThickness,
        cornerRadius: state.cornerRadius,
        wallHeight: state.wallHeight,
        generateBottom: state.generateBottom,
        redrawTrigger: state.redrawTrigger,
        showCornerLines: state.showCornerLines,
        cornerLineColor: state.cornerLineColor,
        cornerLineOpacity: state.cornerLineOpacity,
        showHelperGrid: state.showHelperGrid,
        selectedBoxIds: state.selectedBoxIds,
        standardColor: state.standardColor,
        selectedColor: state.selectedColor,
        onPointerSelection: () => undefined,
    })

    return (
        <div ref={sceneView.containerRef} data-testid="ready">
            {state.layoutHydrated ? `rows:${grid.length}` : 'pending'}
        </div>
    )
}

describe('full-page hydration + scene generation', () => {
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
        vi.mocked(generateCustomBox).mockClear()
    })

    afterEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it('fresh load never calls generateCustomBox with an empty grid', async () => {
        const errors: unknown[] = []
        const onError = (event: ErrorEvent) => {
            errors.push(event.error ?? event.message)
        }
        window.addEventListener('error', onError)

        render(<FullPageProbe />)

        await waitFor(() => {
            expect(useStore.getState().layoutHydrated).toBe(true)
        })
        await act(async () => {
            await Promise.resolve()
        })

        window.removeEventListener('error', onError)

        expect(errors).toEqual([])
        expect(vi.mocked(generateCustomBox)).toHaveBeenCalled()
        for (const call of vi.mocked(generateCustomBox).mock.calls) {
            const grid = call[0]
            expect(grid.length).toBeGreaterThan(0)
            expect(grid[0].length).toBeGreaterThan(0)
        }
        expect(useStore.getState().grid.length).toBeGreaterThan(0)
    })

    it('persisted load preserves topology and never generates from an empty grid', async () => {
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

        const errors: unknown[] = []
        window.addEventListener('error', (event) => {
            errors.push(event.error ?? event.message)
        })

        render(<FullPageProbe />)

        await waitFor(() => {
            expect(useStore.getState().layoutHydrated).toBe(true)
        })
        await act(async () => {
            await Promise.resolve()
        })

        expect(errors).toEqual([])
        for (const call of vi.mocked(generateCustomBox).mock.calls) {
            expect(call[0].length).toBeGreaterThan(0)
        }

        const state = useStore.getState()
        expect(state.grid).toEqual(saved.grid)
        expect(state.grid[0][0].group).toBe(7)
        expect(state.grid[1][0].visibility).toBe('hidden')
    })
})
