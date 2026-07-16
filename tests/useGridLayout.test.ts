/**
 * @vitest-environment happy-dom
 */
import { useGridLayout } from '@/hooks/useGridLayout'
import { resizeGrid } from '@/lib/gridHelper'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('useGridLayout hydration boundary', () => {
    it('returns a safe non-empty preview before hydration without writing', () => {
        const setGrid = vi.fn()
        const { result } = renderHook(() =>
            useGridLayout({
                grid: [],
                totalWidth: 150,
                totalDepth: 150,
                maxBoxWidth: 100,
                maxBoxDepth: 100,
                minBoxSize: 13,
                setGrid,
                layoutHydrated: false,
            })
        )

        expect(result.current.length).toBeGreaterThan(0)
        expect(result.current[0].length).toBeGreaterThan(0)
        expect(setGrid).not.toHaveBeenCalled()
    })

    it('preserves a fitting hydrated grid until sizing params change', () => {
        const setGrid = vi.fn()
        // Non-live segment widths that still sum to totals.
        const hydrated = [
            [
                {
                    group: 3,
                    width: 90,
                    depth: 75,
                    visibility: 'visible' as const,
                },
                {
                    group: 3,
                    width: 60,
                    depth: 75,
                    visibility: 'visible' as const,
                },
            ],
            [
                {
                    group: 0,
                    width: 90,
                    depth: 75,
                    visibility: 'hidden' as const,
                },
                {
                    group: 0,
                    width: 60,
                    depth: 75,
                    visibility: 'visible' as const,
                },
            ],
        ]

        const { result, rerender } = renderHook(
            ({
                maxBoxWidth,
                layoutHydrated,
            }: {
                maxBoxWidth: number
                layoutHydrated: boolean
            }) =>
                useGridLayout({
                    grid: hydrated,
                    totalWidth: 150,
                    totalDepth: 150,
                    maxBoxWidth,
                    maxBoxDepth: 100,
                    minBoxSize: 13,
                    setGrid,
                    layoutHydrated,
                }),
            { initialProps: { maxBoxWidth: 100, layoutHydrated: true } }
        )

        expect(result.current).toEqual(hydrated)
        expect(result.current[0][0].width).toBe(90)

        // Params unchanged: still preserved (live resize would use 100/50).
        rerender({ maxBoxWidth: 100, layoutHydrated: true })
        expect(result.current[0][0].width).toBe(90)

        // User changes max box size: apply live resize.
        rerender({ maxBoxWidth: 50, layoutHydrated: true })
        const live = resizeGrid(hydrated, 150, 150, 50, 100, 13)
        expect(result.current[0].map((cell) => cell.width)).toEqual(
            live[0].map((cell) => cell.width)
        )
        expect(result.current[0][0].group).toBe(3)
        expect(result.current[1][0].visibility).toBe('hidden')
    })
})
