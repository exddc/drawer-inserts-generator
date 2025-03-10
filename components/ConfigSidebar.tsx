'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    calculateMaxCornerRadius,
    defaultConstraints,
} from '@/lib/validationUtils';
import { exportSTL, exportOBJ, exportMultipleSTLs } from '@/lib/exportUtils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBoxStore } from '@/lib/store';
import * as THREE from 'three';
import ShareButton from '@/components/ShareButton';

// Define the form input types
export interface FormInputs {
    width: number;
    depth: number;
    height: number;
    wallThickness: number;
    cornerRadius: number;
    hasBottom: boolean;
    minBoxWidth: number;
    maxBoxWidth: number;
    minBoxDepth: number;
    maxBoxDepth: number;
    useMultipleBoxes: boolean;
    debugMode: boolean;
    uniqueBoxesExport: boolean;
}

interface ConfigSidebarProps {
    scene: THREE.Scene;
    boxMeshGroup: THREE.Group;
}

export default function ConfigSidebar({
    scene,
    boxMeshGroup,
}: ConfigSidebarProps) {
    // Get state and actions from Zustand store
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
    } = useBoxStore();

    // Add this function to handle the unique boxes export checkbox
    const handleUniqueBoxesExportChange = (checked: boolean) => {
        updateInput('uniqueBoxesExport', checked);
    };

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            updateInput(name, (e.target as HTMLInputElement).checked);
        } else {
            updateInput(name, parseFloat(value));
        }
    };

    // Handle checkbox changes
    const handleCheckboxChange = (checked: boolean) => {
        updateInput('hasBottom', checked);
    };

    // Handle slider changes (shadcn Slider returns an array of values)
    const handleSliderChange = (name: string, value: number[]) => {
        if (value.length > 0) {
            updateInput(name, value[0]);
        }
    };

    const handleMultiBoxCheckboxChange = (checked: boolean) => {
        updateInput('useMultipleBoxes', checked);
    };

    const handleDebugModeChange = (checked: boolean) => {
        updateInput('debugMode', checked);
    };

    return (
        <div className="p-4">
            <div className="space-y-4">
                <h3 className="font-medium mb-2">General</h3>
                <div className="space-y-2">
                    <Label htmlFor="width">Total Width (mm): {width}</Label>
                    <div className="flex items-center space-x-2 mt-2">
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
                    <div className="flex items-center space-x-2 mt-2">
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
                    <div className="flex items-center space-x-2 mt-2">
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
                    <div className="flex items-center space-x-2 mt-2">
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
                    <div className="flex items-center space-x-2 mt-2">
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
                        onCheckedChange={handleCheckboxChange}
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

                {/* Debug Mode */}
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="debugMode"
                        checked={debugMode}
                        onCheckedChange={handleDebugModeChange}
                    />
                    <Label htmlFor="debugMode">Debug Mode</Label>
                    {debugMode && (
                        <div className="mt-1 text-xs text-muted-foreground ml-6">
                            Click on any box to see its details
                        </div>
                    )}
                </div>

                {/* Multi-box settings */}
                {useMultipleBoxes && (
                    <div className="pt-4 border-t mt-4">
                        <h3 className="font-medium mb-2">Grid Layout</h3>

                        {/* Grid summary */}
                        {useMultipleBoxes &&
                            boxWidths.length > 0 &&
                            boxDepths.length > 0 && (
                                <div className="mt-4 text-sm p-3 border rounded-md bg-secondary/20 mb-4">
                                    <p className="font-medium">Grid Summary:</p>
                                    <div className="flex justify-between mt-1">
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

                                <div className="space-y-2 mt-2">
                                    <Label htmlFor="maxBoxWidth">
                                        Max Box Width (mm): {maxBoxWidth}
                                    </Label>
                                    <div className="flex items-center space-x-2 mt-2">
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

                                <div className="mt-4 text-sm p-3 border rounded-md bg-secondary/20">
                                    <p className="font-medium">
                                        Width distribution:
                                    </p>
                                    {boxWidths.map((width, i) => (
                                        <div
                                            className="flex justify-between mt-1"
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

                                <div className="space-y-2 mt-2">
                                    <Label htmlFor="maxBoxDepth">
                                        Max Box Depth (mm): {maxBoxDepth}
                                    </Label>
                                    <div className="flex items-center space-x-2 mt-2">
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
                                <div className="mt-4 text-sm p-3 border rounded-md bg-secondary/20">
                                    <p className="font-medium">
                                        Depth distribution:
                                    </p>
                                    {boxDepths.map((depth, i) => (
                                        <div
                                            className="flex justify-between mt-1"
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
                    </div>
                )}
            </div>
            <div className="pt-4 border-t mt-4 space-y-2">
                <h3 className="font-medium mb-4">Export</h3>

                {useMultipleBoxes && (
                    <div className="flex items-center space-x-2 my-4">
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
                    <div className="mt-4 mb-2 text-xs text-muted-foreground">
                        <p>
                            STL files don't support multiple separate objects.
                            Use OBJ format or the ZIP option to keep objects
                            separate.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
