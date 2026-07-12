'use client'

import {
    combineSelectedBoxes,
    splitSelectedBoxes,
    toggleSelectedBoxesVisibility,
} from '@/lib/gridCommands'
import { useStore } from '@/lib/store'
import { useCallback, useEffect, useMemo } from 'react'

export interface GridCommands {
    clearSelection: () => void
    combineSelection: () => void
    splitSelection: () => void
    toggleSelectionVisibility: () => void
}

interface KeyboardEventTarget {
    addEventListener: (type: 'keydown', listener: EventListener) => void
    removeEventListener: (type: 'keydown', listener: EventListener) => void
}

export function useGridCommands(): GridCommands {
    const clearSelection = useCallback(() => {
        useStore.getState().setSelectedBoxIds([])
    }, [])

    const combineSelection = useCallback(() => {
        const state = useStore.getState()
        const grid = combineSelectedBoxes(
            state.grid,
            state.wallHeight,
            state.selectedBoxIds
        )
        if (!grid) return
        state.setGrid(grid)
        state.setSelectedBoxIds([])
    }, [])

    const splitSelection = useCallback(() => {
        const state = useStore.getState()
        const grid = splitSelectedBoxes(state.grid, state.selectedBoxIds)
        if (!grid) return
        state.setGrid(grid)
        state.setSelectedBoxIds([])
    }, [])

    const toggleSelectionVisibility = useCallback(() => {
        const state = useStore.getState()
        const grid = toggleSelectedBoxesVisibility(
            state.grid,
            state.selectedBoxIds
        )
        if (!grid) return
        state.setGrid(grid)
        state.setSelectedBoxIds([])
    }, [])

    const commands = useMemo(
        () => ({
            clearSelection,
            combineSelection,
            splitSelection,
            toggleSelectionVisibility,
        }),
        [
            clearSelection,
            combineSelection,
            splitSelection,
            toggleSelectionVisibility,
        ]
    )

    useEffect(() => bindGridKeyboardShortcuts(window, commands), [commands])
    return commands
}

export function bindGridKeyboardShortcuts(
    target: KeyboardEventTarget,
    commands: GridCommands
): () => void {
    const onKeyDown: EventListener = (event) => {
        const key = (event as KeyboardEvent).key
        if (key === 'Escape') commands.clearSelection()
        if (key === 'c') commands.combineSelection()
        if (key === 's') commands.splitSelection()
        if (key === 'h') commands.toggleSelectionVisibility()
    }

    target.addEventListener('keydown', onKeyDown)
    return () => target.removeEventListener('keydown', onKeyDown)
}
