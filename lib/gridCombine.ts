import { getOutline, OutlineTopologyError } from '@/lib/lineHelper'
import type { GeneratedBoxMetadata, Grid } from '@/lib/types'

export type GridBoxSelection = Pick<GeneratedBoxMetadata, 'cells'>

export type CombineValidationCode =
    | 'too-few-boxes'
    | 'empty-selection'
    | 'out-of-bounds'
    | 'disconnected'
    | 'contains-hole'
    | 'invalid-topology'

export type CombineValidationResult =
    | { valid: true }
    | {
          valid: false
          code: CombineValidationCode
          message: string
      }

export type CombineValidationFailure = Extract<
    CombineValidationResult,
    { valid: false }
>

export type CombineMutationResult =
    | { combined: true }
    | { combined: false; validation: CombineValidationFailure }

type CombineAnalysis =
    { valid: true; selectedCells: Set<string> } | CombineValidationFailure

export function validateGridBoxCombination(
    grid: Grid,
    boxes: GridBoxSelection[]
): CombineValidationResult {
    const analysis = analyzeGridBoxCombination(grid, boxes)
    return analysis.valid ? { valid: true } : analysis
}

function analyzeGridBoxCombination(
    grid: Grid,
    boxes: GridBoxSelection[]
): CombineAnalysis {
    if (boxes.length < 2) {
        return invalid('too-few-boxes', 'Select at least two boxes to combine.')
    }

    const selectedCells = selectedCellKeys(boxes)
    if (selectedCells.size === 0) {
        return invalid(
            'empty-selection',
            'The selected boxes contain no cells.'
        )
    }

    for (const key of selectedCells) {
        const { x, z } = parseCellKey(key)
        if (!grid[z]?.[x]) {
            return invalid(
                'out-of-bounds',
                'The selection contains a cell outside the grid.'
            )
        }
    }

    const nextGroup = getNextAvailableGroupId(grid)
    const candidate = grid.map((row) => row.map((cell) => ({ ...cell })))
    selectedCells.forEach((key) => {
        const { x, z } = parseCellKey(key)
        candidate[z][x].group = nextGroup
    })

    try {
        getOutline(candidate, nextGroup)
        return { valid: true, selectedCells }
    } catch (error) {
        if (error instanceof OutlineTopologyError) {
            if (error.code === 'disconnected') {
                return invalid(
                    'disconnected',
                    'Selected boxes must share an edge to form one connected shape.'
                )
            }
            if (error.code === 'contains-hole') {
                return invalid(
                    'contains-hole',
                    'Selected boxes cannot enclose a hole.'
                )
            }
        }
        return invalid(
            'invalid-topology',
            'Selected boxes form an unsupported shape.'
        )
    }
}

export function canCombineGridBoxes(
    grid: Grid,
    boxes: GridBoxSelection[]
): boolean {
    return validateGridBoxCombination(grid, boxes).valid
}

export function combineGridBoxes(
    grid: Grid,
    boxes: GridBoxSelection[],
    groupId: number
): boolean {
    return tryCombineGridBoxes(grid, boxes, groupId).combined
}

export function tryCombineGridBoxes(
    grid: Grid,
    boxes: GridBoxSelection[],
    groupId: number
): CombineMutationResult {
    const analysis = analyzeGridBoxCombination(grid, boxes)
    if (!analysis.valid) return { combined: false, validation: analysis }

    analysis.selectedCells.forEach((key) => {
        const { x, z } = parseCellKey(key)
        grid[z][x].group = groupId
    })
    return { combined: true }
}

export function getNextAvailableGroupId(grid: Grid): number {
    const existing = new Set(grid.flat().map((cell) => cell.group))
    let nextGroup = 1
    while (existing.has(nextGroup)) nextGroup++
    return nextGroup
}

function selectedCellKeys(boxes: GridBoxSelection[]): Set<string> {
    return new Set(
        boxes.flatMap((box) =>
            getSelectionCells(box).map(({ x, z }) => `${x},${z}`)
        )
    )
}

function getSelectionCells(
    box: GridBoxSelection
): Array<{ x: number; z: number }> {
    return box.cells
}

function parseCellKey(key: string): { x: number; z: number } {
    const [x, z] = key.split(',').map(Number)
    return { x, z }
}

function invalid(
    code: CombineValidationCode,
    message: string
): CombineValidationFailure {
    return { valid: false, code, message }
}
