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
import { exportSTL } from '@/lib/exportUtils';
import { useBoxStore } from '@/lib/store';

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
}

interface ConfigSidebarProps {
    scene: THREE.Scene | null;
    boxMeshGroup: THREE.Group | null;
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
        boxWidths,
        boxDepths,
        updateInput,
    } = useBoxStore();

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

    // Function to handle STL export
    const handleExportSTL = () => {
        if (!scene || !boxMeshGroup) return;

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
            },
            boxWidths,
            boxDepths
        );
    };

    return (
        <div className="p-4">
            <div className="space-y-4">
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

                {/* Multi-box settings */}
                <div className="pt-4 border-t mt-4">
                    <h3 className="font-medium mb-2">Grid Layout</h3>
                    <div className="flex items-center space-x-2 mb-3">
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
                                <div className="space-y-2 mt-2">
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
                                </div>

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
                                <div className="mt-3 text-sm">
                                    <p className="font-medium">
                                        Width distribution:
                                    </p>
                                    <div className="mt-1 bg-muted p-2 rounded max-h-[140px] overflow-y-auto">
                                        {boxWidths.map((width, i) => (
                                            <div
                                                key={`width-${i}`}
                                                className="flex justify-between"
                                            >
                                                <span>Box {i + 1}:</span>
                                                <span className="font-mono">
                                                    {width.toFixed(1)} mm
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="depth" className="space-y-4">
                                <div className="space-y-2 mt-2">
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
                                </div>

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
                                <div className="mt-3 text-sm">
                                    <p className="font-medium">
                                        Depth distribution:
                                    </p>
                                    <div className="mt-1 bg-muted p-2 rounded max-h-[140px] overflow-y-auto">
                                        {boxDepths.map((depth, i) => (
                                            <div
                                                key={`depth-${i}`}
                                                className="flex justify-between"
                                            >
                                                <span>Row {i + 1}:</span>
                                                <span className="font-mono">
                                                    {depth.toFixed(1)} mm
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}

                    {/* Grid summary */}
                    {useMultipleBoxes &&
                        boxWidths.length > 0 &&
                        boxDepths.length > 0 && (
                            <div className="mt-4 text-sm p-3 border rounded-md bg-secondary/20">
                                <p className="font-medium">Grid Summary:</p>
                                <div className="flex justify-between mt-1">
                                    <span>Total Boxes:</span>
                                    <span className="font-mono">
                                        {boxWidths.length * boxDepths.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Layout:</span>
                                    <span className="font-mono">
                                        {boxWidths.length}×{boxDepths.length}
                                    </span>
                                </div>
                            </div>
                        )}
                </div>

                {/* Debug Mode */}
                <div className="flex items-center space-x-2 pt-4 border-t mt-4">
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

                <Button onClick={handleExportSTL} className="w-full mt-6">
                    Export STL
                </Button>
            </div>
        </div>
    );
}
