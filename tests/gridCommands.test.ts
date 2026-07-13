import {
    bindGridKeyboardShortcuts,
    type GridCommands,
} from '@/hooks/useGridCommands'
import {
    combineSelectedBoxes,
    splitSelectedBoxes,
    toggleSelectedBoxesVisibility,
} from '@/lib/gridCommands'
import type { Grid } from '@/lib/types'
import { describe, expect, it, vi } from 'vitest'

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
        expect(combined?.[0].map((cell) => cell.group)).toEqual([1, 1])
        expect(grid[0].map((cell) => cell.group)).toEqual([0, 0])

        const split = splitSelectedBoxes(combined!, ['group:1'])
        expect(split?.[0].map((cell) => cell.group)).toEqual([0, 0])

        const hidden = toggleSelectedBoxesVisibility(grid, ['cell:0:0'])
        expect(hidden?.[0][0].visibility).toBe('hidden')
        expect(grid[0][0].visibility).toBeUndefined()
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

        const unbind = bindGridKeyboardShortcuts(target, commands)
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
})
