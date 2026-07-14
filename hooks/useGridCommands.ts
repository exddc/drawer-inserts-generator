'use client'

import {
    combineSelectedBoxes,
    splitSelectedBoxes,
    toggleSelectedBoxesVisibility,
} from '@/lib/gridCommands'
import { getGridBoxes } from '@/lib/gridVisibility'
import { useStore } from '@/lib/store'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

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
        executeCombineSelection((message) => toast.error(message))
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

    useEffect(
        () => bindGridKeyboardShortcuts(window, commands, getSelectedBoxCount),
        [commands]
    )
    return commands
}

export function executeCombineSelection(
    reportError: (message: string) => void
): boolean {
    const state = useStore.getState()
    const result = combineSelectedBoxes(
        state.grid,
        state.wallHeight,
        state.selectedBoxIds
    )
    if (!result.combined) {
        reportError(result.validation.message)
        return false
    }

    state.setGrid(result.grid)
    state.setSelectedBoxIds([])
    return true
}

export function bindGridKeyboardShortcuts(
    target: KeyboardEventTarget,
    commands: GridCommands,
    getSelectedBoxCount: () => number
): () => void {
    const onKeyDown: EventListener = (event) => {
        const keyboardEvent = event as KeyboardEvent
        if (isEditableTarget(keyboardEvent.target)) return

        const key = keyboardEvent.key
        if (key === 'Escape') commands.clearSelection()
        if (key === 'c' && getSelectedBoxCount() >= 2) {
            commands.combineSelection()
        }
        if (key === 's') commands.splitSelection()
        if (key === 'h') commands.toggleSelectionVisibility()
    }

    target.addEventListener('keydown', onKeyDown)
    return () => target.removeEventListener('keydown', onKeyDown)
}

function getSelectedBoxCount(): number {
    const state = useStore.getState()
    return getGridBoxes(state.grid, state.wallHeight).filter((box) =>
        state.selectedBoxIds.includes(box.id)
    ).length
}

function isEditableTarget(target: EventTarget | null): boolean {
    if (!target || typeof target !== 'object') return false

    const element = target as {
        tagName?: string
        isContentEditable?: boolean
        closest?: (selector: string) => unknown
        getAttribute?: (name: string) => string | null
    }
    const tagName = element.tagName?.toLowerCase()
    return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        element.isContentEditable === true ||
        element.getAttribute?.('role') === 'textbox' ||
        Boolean(
            element.closest?.(
                '[contenteditable]:not([contenteditable="false"])'
            )
        )
    )
}
