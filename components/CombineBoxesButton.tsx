'use client'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useBoxStore } from '@/lib/store'
import { Combine, SquareSplitHorizontal } from 'lucide-react'

export default function CombineBoxesButton() {
    const {
        selectedBoxIndices,
        canCombineSelectedBoxes,
        combineSelectedBoxes,
        isPrimaryBox,
        resetCombinedBoxes,
    } = useBoxStore()

    const selectedBoxesCount = selectedBoxIndices.size
    const firstSelectedIndex =
        selectedBoxesCount > 0 ? Array.from(selectedBoxIndices)[0] : -1

    // Determine if we can split (single selected box is a primary combined box)
    const canSplit =
        selectedBoxesCount === 1 && isPrimaryBox(firstSelectedIndex)

    // Determine if we can combine (multiple boxes selected that can be combined)
    const canCombine = selectedBoxesCount > 1 && canCombineSelectedBoxes()

    // Handle button click based on state
    const handleClick = () => {
        if (canSplit) {
            resetCombinedBoxes()
        } else if (canCombine) {
            combineSelectedBoxes()
        }
    }

    const disabled = !canSplit && !canCombine

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger
                    className={
                        'flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100' +
                        (disabled
                            ? ' cursor-default text-neutral-400'
                            : ' cursor-pointer')
                    }
                    onClick={handleClick}
                    disabled={disabled}
                >
                    {canSplit ? (
                        <SquareSplitHorizontal className="h-4 w-4" />
                    ) : (
                        <Combine className="h-4 w-4" />
                    )}
                </TooltipTrigger>
                <TooltipContent>
                    {canSplit ? (
                        <p>Split Combined Box (S)</p>
                    ) : (
                        <p>Combine Selected Boxes (C)</p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
