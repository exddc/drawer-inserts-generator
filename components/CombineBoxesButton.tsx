import React from 'react'
import { Button } from '@/components/ui/button'
import { useBoxStore } from '@/lib/store'
import { Combine, Unlink2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

export default function CombineBoxesButton() {
    const {
        selectedBoxIndices,
        canCombineSelectedBoxes,
        combineSelectedBoxes,
        isPrimaryBox,
        resetCombinedBoxes,
    } = useBoxStore()

    const hasSelection = selectedBoxIndices.size > 0
    const canCombine = canCombineSelectedBoxes()

    // Check if the current selection is a primary combined box
    const isSelectedCombined = () => {
        if (selectedBoxIndices.size !== 1) return false
        const index = Array.from(selectedBoxIndices)[0]
        return isPrimaryBox(index)
    }

    const handleCombine = () => {
        if (canCombine) {
            combineSelectedBoxes()
            toast.success('Boxes combined', {
                description: 'Selected boxes have been combined into one box',
                duration: 2000,
            })
        }
    }

    const handleSplit = () => {
        if (isSelectedCombined()) {
            resetCombinedBoxes()
            toast.success('Box split', {
                description:
                    'Combined box has been split into individual boxes',
                duration: 2000,
            })
        }
    }

    if (isSelectedCombined()) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex h-8 w-8 items-center justify-center rounded-md"
                            onClick={handleSplit}
                        >
                            <Unlink2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Split Box (Shift+C)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`flex h-8 w-8 items-center justify-center rounded-md ${!canCombine ? 'cursor-default text-neutral-400' : 'cursor-pointer'}`}
                        onClick={handleCombine}
                        disabled={!canCombine}
                    >
                        <Combine className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Combine Boxes (C)</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
