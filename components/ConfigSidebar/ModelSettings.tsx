// components/ConfigSidebar/ModelSettings.tsx
'use client'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBoxStore } from '@/lib/store'
import { calculateMaxCornerRadius } from '@/lib/validationUtils'
import { ChevronsUpDown, InfoIcon } from 'lucide-react'

export default function ModelSettings() {
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
        boxWidths,
        boxDepths,
        updateInput,
        uniqueBoxesExport,
    } = useBoxStore()

    // Create a generic handler for any input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target

        if (type === 'checkbox') {
            updateInput(name, (e.target as HTMLInputElement).checked)
        } else {
            updateInput(name, parseFloat(value))
        }
    }

    // Generic Slider change handler
    const handleSliderChange = (name: string, value: number[]) => {
        if (value.length > 0) {
            updateInput(name, value[0])
        }
    }

    // Calculate maximum allowed corner radius
    const maxCornerRadius = calculateMaxCornerRadius(
        width,
        depth,
        wallThickness,
        25, // default constraint max
        useMultipleBoxes,
        minBoxWidth,
        minBoxDepth
    )

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
                    {/* Width slider */}
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
                                min={10}
                                max={500}
                                step={1}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="width"
                                value={width}
                                onChange={handleInputChange}
                                min={10}
                                max={500}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Depth slider */}
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
                                min={10}
                                max={500}
                                step={1}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="depth"
                                value={depth}
                                onChange={handleInputChange}
                                min={10}
                                max={500}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Height slider */}
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
                                        ? Math.max(5, wallThickness + 1)
                                        : 5
                                }
                                max={100}
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
                                        ? Math.max(5, wallThickness + 1)
                                        : 5
                                }
                                max={100}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Wall thickness slider */}
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
                                min={1}
                                max={10}
                                step={0.5}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="wallThickness"
                                value={wallThickness}
                                onChange={handleInputChange}
                                min={1}
                                max={10}
                                step="0.5"
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Corner radius slider */}
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
                                min={0}
                                max={maxCornerRadius}
                                step={0.5}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="cornerRadius"
                                value={cornerRadius}
                                onChange={handleInputChange}
                                min={0}
                                max={maxCornerRadius}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Include bottom checkbox */}
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="hasBottom"
                            checked={hasBottom}
                            onCheckedChange={(checked) =>
                                updateInput('hasBottom', !!checked)
                            }
                        />
                        <Label htmlFor="hasBottom">Include Bottom</Label>
                    </div>

                    {/* Split into grid checkbox */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="useMultipleBoxes"
                            checked={useMultipleBoxes}
                            onCheckedChange={(checked) =>
                                updateInput('useMultipleBoxes', !!checked)
                            }
                        />
                        <Label htmlFor="useMultipleBoxes">
                            Split into grid of boxes
                        </Label>
                    </div>

                    {/* Unique boxes export checkbox */}
                    {useMultipleBoxes && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="uniqueBoxesExport"
                                checked={uniqueBoxesExport}
                                onCheckedChange={(checked) =>
                                    updateInput('uniqueBoxesExport', !!checked)
                                }
                            />
                            <Label htmlFor="uniqueBoxesExport">
                                Only export unique boxes
                            </Label>
                        </div>
                    )}

                    {/* Information about STL files */}
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

            {/* Multi-box settings section (rendered conditionally) */}
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
