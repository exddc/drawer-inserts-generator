'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    calculateMaxCornerRadius,
    defaultConstraints,
} from '@/lib/validationUtils'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'

import { useBoxStore } from '@/lib/store'
import { ChevronsUpDown, InfoIcon } from 'lucide-react'

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

export default function ModelSettings() {
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
        boxWidths,
        boxDepths,
        updateInput,
        uniqueBoxesExport,
    } = useBoxStore()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target

        if (type === 'checkbox') {
            updateInput(name, (e.target as HTMLInputElement).checked)
        } else {
            updateInput(name, parseFloat(value))
        }
    }

    const handleUniqueBoxesExportChange = (checked: boolean) => {
        updateInput('uniqueBoxesExport', checked)
    }

    // Generic Checkbox change handler
    const handleCheckboxChange = (name: string, checked: boolean) => {
        updateInput(name, checked)
    }

    // Generic Slider change handler
    const handleSliderChange = (name: string, value: number[]) => {
        if (value.length > 0) {
            updateInput(name, value[0])
        }
    }

    const handleMultiBoxCheckboxChange = (checked: boolean) => {
        updateInput('useMultipleBoxes', checked)
    }

    return (
        <TabsContent value="modelSettings" className="space-y-4">
            <Collapsible defaultOpen={true}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium">General</h3>
                    <CollapsibleTrigger className="cursor-pointer">
                        <ChevronsUpDown className="inline-block h-4 w-4" />
                    </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="width">Total Width (mm): {width}</Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="width-slider"
                                name="width"
                                value={[width]}
                                onValueChange={(value) =>
                                    handleSliderChange('width', value)
                                }
                                min={defaultConstraints.width.min}
                                max={defaultConstraints.width.max}
                                step={1}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="width"
                                value={width}
                                onChange={handleInputChange}
                                min={defaultConstraints.width.min}
                                max={defaultConstraints.width.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="depth">Total Depth (mm): {depth}</Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="depth-slider"
                                name="depth"
                                value={[depth]}
                                onValueChange={(value) =>
                                    handleSliderChange('depth', value)
                                }
                                min={defaultConstraints.depth.min}
                                max={defaultConstraints.depth.max}
                                step={1}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="depth"
                                value={depth}
                                onChange={handleInputChange}
                                min={defaultConstraints.depth.min}
                                max={defaultConstraints.depth.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="height">Height (mm): {height}</Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="height-slider"
                                name="height"
                                value={[height]}
                                onValueChange={(value) =>
                                    handleSliderChange('height', value)
                                }
                                min={
                                    hasBottom
                                        ? Math.max(
                                              defaultConstraints.height.min,
                                              wallThickness + 1
                                          )
                                        : defaultConstraints.height.min
                                }
                                max={defaultConstraints.height.max}
                                step={1}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="height"
                                value={height}
                                onChange={handleInputChange}
                                min={
                                    hasBottom
                                        ? Math.max(
                                              defaultConstraints.height.min,
                                              wallThickness + 1
                                          )
                                        : defaultConstraints.height.min
                                }
                                max={defaultConstraints.height.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="wallThickness">
                            Wall Thickness (mm): {wallThickness}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="wallThickness-slider"
                                name="wallThickness"
                                value={[wallThickness]}
                                onValueChange={(value) =>
                                    handleSliderChange('wallThickness', value)
                                }
                                min={defaultConstraints.wallThickness.min}
                                max={defaultConstraints.wallThickness.max}
                                step={0.5}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="wallThickness"
                                value={wallThickness}
                                onChange={handleInputChange}
                                min={defaultConstraints.wallThickness.min}
                                max={defaultConstraints.wallThickness.max}
                                step="0.5"
                                className="w-20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cornerRadius">
                            Corner Radius (mm): {cornerRadius}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="cornerRadius-slider"
                                name="cornerRadius"
                                value={[cornerRadius]}
                                onValueChange={(value) =>
                                    handleSliderChange('cornerRadius', value)
                                }
                                min={defaultConstraints.cornerRadius.min}
                                max={calculateMaxCornerRadius(
                                    width,
                                    depth,
                                    wallThickness,
                                    defaultConstraints.cornerRadius.max,
                                    useMultipleBoxes,
                                    minBoxWidth,
                                    minBoxDepth
                                )}
                                step={0.5}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="cornerRadius"
                                value={cornerRadius}
                                onChange={handleInputChange}
                                min={defaultConstraints.cornerRadius.min}
                                max={calculateMaxCornerRadius(
                                    width,
                                    depth,
                                    wallThickness,
                                    defaultConstraints.cornerRadius.max,
                                    useMultipleBoxes,
                                    minBoxWidth,
                                    minBoxDepth
                                )}
                                className="w-20"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="hasBottom"
                            checked={hasBottom}
                            onCheckedChange={(checked) =>
                                handleCheckboxChange(
                                    'hasBottom',
                                    checked as boolean
                                )
                            }
                        />
                        <Label htmlFor="hasBottom">Include Bottom</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="useMultipleBoxes"
                            checked={useMultipleBoxes}
                            onCheckedChange={handleMultiBoxCheckboxChange}
                        />
                        <Label htmlFor="useMultipleBoxes">
                            Split into grid of boxes
                        </Label>
                    </div>

                    {useMultipleBoxes && (
                        <div className="flex items-center space-x-2">
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

                    {uniqueBoxesExport && (
                        <div className="text-muted-foreground mb-2 flex items-center space-x-4 text-xs">
                            <InfoIcon className="h-6 w-6" />
                            <p>
                                STL files don't support multiple separate
                                objects. Use the ZIP option to keep objects
                                separate.
                            </p>
                        </div>
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* Multi-box settings */}
            {useMultipleBoxes && (
                <Collapsible defaultOpen={true}>
                    <div className="mb-4 flex items-center justify-between border-t pt-4">
                        <h3 className="font-medium">Grid Layout</h3>
                        <CollapsibleTrigger className="cursor-pointer">
                            <ChevronsUpDown className="inline-block h-4 w-4" />
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="space-y-4">
                        {/* Grid summary */}
                        {useMultipleBoxes &&
                            boxWidths.length > 0 &&
                            boxDepths.length > 0 && (
                                <div className="bg-secondary/20 mt-4 mb-4 rounded-md border p-3 text-sm">
                                    <p className="font-medium">Grid Summary:</p>
                                    <div className="mt-1 flex justify-between">
                                        <span>Total Boxes:</span>
                                        <span className="font-mono">
                                            {boxWidths.length *
                                                boxDepths.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Layout:</span>
                                        <span className="font-mono">
                                            {boxWidths.length}×
                                            {boxDepths.length}
                                        </span>
                                    </div>
                                </div>
                            )}

                        <Tabs defaultValue="width" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="width">
                                    Width Settings
                                </TabsTrigger>
                                <TabsTrigger value="depth">
                                    Depth Settings
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="width" className="space-y-4">
                                {/* <div className="space-y-2 mt-2">
                                    <Label htmlFor="minBoxWidth">
                                        Min Box Width (mm): {minBoxWidth}
                                    </Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Slider
                                            id="minBoxWidth-slider"
                                            name="minBoxWidth"
                                            value={[minBoxWidth]}
                                            onValueChange={(value) =>
                                                handleSliderChange(
                                                    'minBoxWidth',
                                                    value
                                                )
                                            }
                                            min={
                                                defaultConstraints.minBoxWidth
                                                    ?.min
                                            }
                                            max={maxBoxWidth}
                                            step={1}
                                            className="flex-grow"
                                        />
                                        <Input
                                            type="number"
                                            name="minBoxWidth"
                                            value={minBoxWidth}
                                            onChange={handleInputChange}
                                            min={
                                                defaultConstraints.minBoxWidth
                                                    ?.min
                                            }
                                            max={maxBoxWidth}
                                            className="w-20"
                                        />
                                    </div>
                                </div> */}

                                <div className="mt-2 space-y-2">
                                    <Label htmlFor="maxBoxWidth">
                                        Max Box Width (mm): {maxBoxWidth}
                                    </Label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <Slider
                                            id="maxBoxWidth-slider"
                                            name="maxBoxWidth"
                                            value={[maxBoxWidth]}
                                            onValueChange={(value) =>
                                                handleSliderChange(
                                                    'maxBoxWidth',
                                                    value
                                                )
                                            }
                                            min={minBoxWidth}
                                            max={width}
                                            step={1}
                                            className="flex-grow"
                                        />
                                        <Input
                                            type="number"
                                            name="maxBoxWidth"
                                            value={maxBoxWidth}
                                            onChange={handleInputChange}
                                            min={minBoxWidth}
                                            max={width}
                                            className="w-20"
                                        />
                                    </div>
                                </div>

                                {/* Show calculated box widths */}

                                <div className="bg-secondary/20 mt-4 rounded-md border p-3 text-sm">
                                    <p className="font-medium">
                                        Width distribution:
                                    </p>
                                    {boxWidths.map((width, i) => (
                                        <div
                                            className="mt-1 flex justify-between"
                                            key={'width-' + i}
                                        >
                                            <span>Column {i + 1}:</span>
                                            <span className="font-mono">
                                                {width.toFixed(1)} mm
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="depth" className="space-y-4">
                                {/* <div className="space-y-2 mt-2">
                                    <Label htmlFor="minBoxDepth">
                                        Min Box Depth (mm): {minBoxDepth}
                                    </Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Slider
                                            id="minBoxDepth-slider"
                                            name="minBoxDepth"
                                            value={[minBoxDepth]}
                                            onValueChange={(value) =>
                                                handleSliderChange(
                                                    'minBoxDepth',
                                                    value
                                                )
                                            }
                                            min={
                                                defaultConstraints.minBoxDepth
                                                    ?.min
                                            }
                                            max={maxBoxDepth}
                                            step={1}
                                            className="flex-grow"
                                        />
                                        <Input
                                            type="number"
                                            name="minBoxDepth"
                                            value={minBoxDepth}
                                            onChange={handleInputChange}
                                            min={
                                                defaultConstraints.minBoxDepth
                                                    ?.min
                                            }
                                            max={maxBoxDepth}
                                            className="w-20"
                                        />
                                    </div>
                                </div> */}

                                <div className="mt-2 space-y-2">
                                    <Label htmlFor="maxBoxDepth">
                                        Max Box Depth (mm): {maxBoxDepth}
                                    </Label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <Slider
                                            id="maxBoxDepth-slider"
                                            name="maxBoxDepth"
                                            value={[maxBoxDepth]}
                                            onValueChange={(value) =>
                                                handleSliderChange(
                                                    'maxBoxDepth',
                                                    value
                                                )
                                            }
                                            min={minBoxDepth}
                                            max={depth}
                                            step={1}
                                            className="flex-grow"
                                        />
                                        <Input
                                            type="number"
                                            name="maxBoxDepth"
                                            value={maxBoxDepth}
                                            onChange={handleInputChange}
                                            min={minBoxDepth}
                                            max={depth}
                                            className="w-20"
                                        />
                                    </div>
                                </div>

                                {/* Show calculated box depths */}
                                <div className="bg-secondary/20 mt-4 rounded-md border p-3 text-sm">
                                    <p className="font-medium">
                                        Depth distribution:
                                    </p>
                                    {boxDepths.map((depth, i) => (
                                        <div
                                            className="mt-1 flex justify-between"
                                            key={'depth-' + i}
                                        >
                                            <span>Row {i + 1}:</span>
                                            <span className="font-mono">
                                                {depth.toFixed(1)} mm
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </TabsContent>
    )
}
