// components/ExportButton.tsx
'use client'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportMultipleSTLs, exportSTL } from '@/lib/exportUtils'
import { useBoxStore } from '@/lib/store'
import type { ExportButtonProps } from '@/lib/types'

export default function ExportButton({
    scene,
    boxMeshGroup,
}: ExportButtonProps) {
    // Get all required state from the store
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        minBoxWidth,
        maxBoxWidth,
        minBoxDepth,
        maxBoxDepth,
        useMultipleBoxes,
        debugMode,
        uniqueBoxesExport,
        boxWidths,
        boxDepths,
        showGrid,
        showAxes,
    } = useBoxStore()

    // Create configuration object for export
    const config = {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        minBoxWidth,
        maxBoxWidth,
        minBoxDepth,
        maxBoxDepth,
        useMultipleBoxes,
        debugMode,
        uniqueBoxesExport,
        showGrid,
        showAxes,
    }

    // Handle multi-box or single-box export
    const handleExportSTL = () => {
        exportSTL(scene, boxMeshGroup, config, boxWidths, boxDepths)
    }

    const handleExportMultipleSTLs = () => {
        exportMultipleSTLs(boxMeshGroup, config, boxWidths, boxDepths)
    }

    // Render different UI based on the useMultipleBoxes setting
    return (
        <>
            {useMultipleBoxes &&
            boxWidths.length > 0 &&
            boxDepths.length > 0 ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm">Export Model</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleExportSTL}>
                            Export as STL (Single Object)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportMultipleSTLs}>
                            Export as ZIP (Separate STL Files)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button onClick={handleExportSTL} className="w-full">
                    Export STL
                </Button>
            )}
        </>
    )
}
