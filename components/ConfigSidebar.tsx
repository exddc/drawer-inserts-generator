'use client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exportSTL, exportOBJ, exportMultipleSTLs } from '@/lib/exportUtils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBoxStore } from '@/lib/store'
import * as THREE from 'three'
import ShareButton from '@/components/ShareButton'
import GeneralSettings from '@/components/ConfigSidebar/GeneralSettings'
import ModelSettings from '@/components/ConfigSidebar/ModelSettings'

export interface FormInputs {
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    minBoxWidth: number
    maxBoxWidth: number
    minBoxDepth: number
    maxBoxDepth: number
    useMultipleBoxes: boolean
    debugMode: boolean
    uniqueBoxesExport: boolean
    showGrid: boolean
    showAxes: boolean
}

interface ConfigSidebarProps {
    scene: THREE.Scene
    boxMeshGroup: THREE.Group
}

export default function ConfigSidebar({
    scene,
    boxMeshGroup,
}: ConfigSidebarProps) {
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
        updateInput,
        showGrid,
        showAxes,
    } = useBoxStore()

    const handleUniqueBoxesExportChange = (checked: boolean) => {
        updateInput('uniqueBoxesExport', checked)
    }

    return (
        <div className="p-4">
            <Tabs defaultValue="modelSettings">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="modelSettings">
                        Model Settings
                    </TabsTrigger>
                    <TabsTrigger value="generalSettings">
                        General Settings
                    </TabsTrigger>
                </TabsList>

                <ModelSettings />

                <GeneralSettings />
            </Tabs>

            {/* Export section */}
            <div className="mt-4 space-y-2 border-t pt-4">
                <h3 className="mb-4 font-medium">Export</h3>

                {useMultipleBoxes && (
                    <div className="my-4 flex items-center space-x-2">
                        <Checkbox
                            id="uniqueBoxesExport"
                            checked={uniqueBoxesExport}
                            onCheckedChange={handleUniqueBoxesExportChange}
                        />
                        <Label htmlFor="uniqueBoxesExport">
                            Only export unique boxes
                        </Label>
                    </div>
                )}

                <ShareButton />

                {/* Export buttons */}
                {useMultipleBoxes &&
                boxWidths.length > 0 &&
                boxDepths.length > 0 ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="w-full">Export Model</Button>
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

                {useMultipleBoxes && (
                    <div className="text-muted-foreground mt-4 mb-2 text-xs">
                        <p>
                            STL files don't support multiple separate objects.
                            Use OBJ format or the ZIP option to keep objects
                            separate.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
