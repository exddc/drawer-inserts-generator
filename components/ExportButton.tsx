'use client'
import { Button } from '@/components/ui/button'
import { exportSTL, exportOBJ, exportMultipleSTLs } from '@/lib/exportUtils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBoxStore } from '@/lib/store'
import type { ExportButtonProps } from '@/lib/types'

export default function ExportButton({
    scene,
    boxMeshGroup,
}: ExportButtonProps) {
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
                        <DropdownMenuItem
                            onClick={() =>
                                exportSTL(
                                    scene,
                                    boxMeshGroup,
                                    {
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
                                    },
                                    boxWidths,
                                    boxDepths
                                )
                            }
                        >
                            Export as STL (Single Object)
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem
                        onClick={() =>
                            exportOBJ(
                                scene,
                                boxMeshGroup,
                                {
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
                                },
                                boxWidths,
                                boxDepths
                            )
                        }
                    >
                        Export as OBJ (Multiple Objects)
                    </DropdownMenuItem> */}
                        <DropdownMenuItem
                            onClick={() =>
                                exportMultipleSTLs(
                                    boxMeshGroup,
                                    {
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
                                    },
                                    boxWidths,
                                    boxDepths
                                )
                            }
                        >
                            Export as ZIP (Separate STL Files)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button
                    onClick={() =>
                        exportSTL(
                            scene,
                            boxMeshGroup,
                            {
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
                            },
                            boxWidths,
                            boxDepths
                        )
                    }
                    className="w-full"
                >
                    Export STL
                </Button>
            )}
        </>
    )
}
