import {
    bindGridKeyboardShortcuts,
    executeCombineSelection,
    type GridCommands,
} from '@/hooks/useGridCommands'
import {
    combineSelectedBoxes,
    splitSelectedBoxes,
    toggleSelectedBoxesVisibility,
} from '@/lib/gridCommands'
import * as lineHelper from '@/lib/lineHelper'
import { useStore } from '@/lib/store'
import type { Grid } from '@/lib/types'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
    useStore.setState({ grid: [], selectedBoxIds: [] })
})

describe('grid commands', () => {
    it('applies combine, split, and visibility changes without mutating input', () => {
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]
        const combined = combineSelectedBoxes(grid, 30, [
            'cell:0:0',
            'cell:1:0',
        ])
        expect(combined.combined).toBe(true)
        if (!combined.combined) throw new Error('Expected boxes to combine')
        expect(combined.grid[0].map((cell) => cell.group)).toEqual([1, 1])
        expect(grid[0].map((cell) => cell.group)).toEqual([0, 0])

        const split = splitSelectedBoxes(combined.grid, ['group:1'])
        expect(split?.[0].map((cell) => cell.group)).toEqual([0, 0])

        const hidden = toggleSelectedBoxesVisibility(grid, ['cell:0:0'])
        expect(hidden?.[0][0].visibility).toBe('hidden')
        expect(grid[0][0].visibility).toBeUndefined()
    })

    it('returns a clear failure without mutating disconnected selections', () => {
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]

        const result = combineSelectedBoxes(grid, 30, ['cell:0:0', 'cell:2:0'])

        expect(result).toEqual({
            combined: false,
            validation: {
                valid: false,
                code: 'disconnected',
                message:
                    'Selected boxes must share an edge to form one connected shape.',
            },
        })
        expect(grid[0].map((cell) => cell.group)).toEqual([0, 0, 0])
    })

    it('performs one topology analysis for a successful combine command', () => {
        const outline = vi.spyOn(lineHelper, 'getOutline')
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]

        const result = combineSelectedBoxes(grid, 30, ['cell:0:0', 'cell:1:0'])

        expect(result.combined).toBe(true)
        expect(outline).toHaveBeenCalledOnce()
        expect(grid[0].map((cell) => cell.group)).toEqual([0, 0])
        outline.mockRestore()
    })

    it('registers keyboard mapping once and removes the same listener', () => {
        let listener: EventListener | null = null
        const target = {
            addEventListener: vi.fn((_type, nextListener: EventListener) => {
                listener = nextListener
            }),
            removeEventListener: vi.fn(),
        }
        const commands: GridCommands = {
            clearSelection: vi.fn(),
            combineSelection: vi.fn(),
            splitSelection: vi.fn(),
            toggleSelectionVisibility: vi.fn(),
        }

        const unbind = bindGridKeyboardShortcuts(target, commands, () => 2)
        const keydown = listener as unknown as (event: KeyboardEvent) => void
        keydown({ key: 'Escape' } as KeyboardEvent)
        keydown({ key: 'c' } as KeyboardEvent)
        keydown({ key: 's' } as KeyboardEvent)
        keydown({ key: 'h' } as KeyboardEvent)
        unbind()

        expect(commands.clearSelection).toHaveBeenCalledOnce()
        expect(commands.combineSelection).toHaveBeenCalledOnce()
        expect(commands.splitSelection).toHaveBeenCalledOnce()
        expect(commands.toggleSelectionVisibility).toHaveBeenCalledOnce()
        expect(target.addEventListener).toHaveBeenCalledTimes(1)
        expect(target.removeEventListener).toHaveBeenCalledWith(
            'keydown',
            listener
        )
    })

    it.each([0, 1])(
        'ignores the combine shortcut with %i selected boxes',
        (selectedBoxCount) => {
            let listener: EventListener | null = null
            const target = {
                addEventListener: vi.fn(
                    (_type, nextListener: EventListener) => {
                        listener = nextListener
                    }
                ),
                removeEventListener: vi.fn(),
            }
            const commands = stubCommands()
            bindGridKeyboardShortcuts(target, commands, () => selectedBoxCount)

            const keydown = listener as unknown as (
                event: KeyboardEvent
            ) => void
            keydown({ key: 'c', target: null } as KeyboardEvent)

            expect(commands.combineSelection).not.toHaveBeenCalled()
        }
    )

    it('dispatches combine with two selected boxes so topology feedback can run', () => {
        let listener: EventListener | null = null
        const target = {
            addEventListener: vi.fn((_type, nextListener: EventListener) => {
                listener = nextListener
            }),
            removeEventListener: vi.fn(),
        }
        const commands = stubCommands()
        bindGridKeyboardShortcuts(target, commands, () => 2)

        const keydown = listener as unknown as (event: KeyboardEvent) => void
        keydown({ key: 'c', target: null } as KeyboardEvent)

        expect(commands.combineSelection).toHaveBeenCalledOnce()
    })

    it('reports invalid topology for two boxes without changing selection', () => {
        const grid: Grid = [
            [
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
                { group: 0, width: 20, depth: 20 },
            ],
        ]
        useStore.setState({
            grid,
            wallHeight: 30,
            selectedBoxIds: ['cell:0:0', 'cell:2:0'],
        })
        const reportError = vi.fn()

        expect(executeCombineSelection(reportError)).toBe(false)

        expect(reportError).toHaveBeenCalledWith(
            'Selected boxes must share an edge to form one connected shape.'
        )
        expect(useStore.getState().grid).toBe(grid)
        expect(useStore.getState().selectedBoxIds).toEqual([
            'cell:0:0',
            'cell:2:0',
        ])
    })

    it.each([
        { tagName: 'INPUT', isContentEditable: false },
        { tagName: 'TEXTAREA', isContentEditable: false },
        { tagName: 'SELECT', isContentEditable: false },
        { tagName: 'DIV', isContentEditable: true },
    ])('ignores shortcuts from editable targets', (editableTarget) => {
        let listener: EventListener | null = null
        const target = {
            addEventListener: vi.fn((_type, nextListener: EventListener) => {
                listener = nextListener
            }),
            removeEventListener: vi.fn(),
        }
        const commands = stubCommands()
        bindGridKeyboardShortcuts(target, commands, () => 2)

        const keydown = listener as unknown as (event: KeyboardEvent) => void
        keydown({
            key: 'c',
            target: editableTarget,
        } as unknown as KeyboardEvent)

        expect(commands.combineSelection).not.toHaveBeenCalled()
    })
})

function stubCommands(): GridCommands {
    return {
        clearSelection: vi.fn(),
        combineSelection: vi.fn(),
        splitSelection: vi.fn(),
        toggleSelectionVisibility: vi.fn(),
    }
}
