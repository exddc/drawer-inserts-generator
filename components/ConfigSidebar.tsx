'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
    calculateMaxCornerRadius,
    defaultConstraints,
} from '@/lib/validationUtils';
import { exportSTL } from '@/lib/exportUtils';
import * as THREE from 'three';

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
    useMultipleBoxes: boolean;
    debugMode: boolean;
}

interface ConfigSidebarProps {
    inputs: FormInputs;
    boxWidths: number[];
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSliderChange: (name: string, value: number) => void;
    handleCheckboxChange: (checked: boolean) => void;
    handleMultiBoxCheckboxChange: (checked: boolean) => void;
    handleDebugModeChange: (checked: boolean) => void;
    scene: THREE.Scene | null;
    boxMeshGroup: THREE.Group | null;
}

export default function ConfigSidebar({
    inputs,
    boxWidths,
    handleInputChange,
    handleSliderChange,
    handleCheckboxChange,
    handleMultiBoxCheckboxChange,
    handleDebugModeChange,
    scene,
    boxMeshGroup,
}: ConfigSidebarProps) {
    return (
        <div className="h-full overflow-auto p-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="width">
                        Total Width (mm): {inputs.width.toFixed(1)}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Slider
                            id="width-slider"
                            value={[inputs.width]}
                            min={defaultConstraints.width.min}
                            max={defaultConstraints.width.max}
                            step={1}
                            onValueChange={(value) =>
                                handleSliderChange('width', value[0])
                            }
                            className="flex-grow"
                        />
                        <Input
                            id="width"
                            type="number"
                            name="width"
                            value={inputs.width}
                            onChange={handleInputChange}
                            min={defaultConstraints.width.min}
                            max={defaultConstraints.width.max}
                            className="w-20"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="depth">
                        Depth (mm): {inputs.depth.toFixed(1)}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Slider
                            id="depth-slider"
                            value={[inputs.depth]}
                            min={defaultConstraints.depth.min}
                            max={defaultConstraints.depth.max}
                            step={1}
                            onValueChange={(value) =>
                                handleSliderChange('depth', value[0])
                            }
                            className="flex-grow"
                        />
                        <Input
                            id="depth"
                            type="number"
                            name="depth"
                            value={inputs.depth}
                            onChange={handleInputChange}
                            min={defaultConstraints.depth.min}
                            max={defaultConstraints.depth.max}
                            className="w-20"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="height">
                        Height (mm): {inputs.height.toFixed(1)}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Slider
                            id="height-slider"
                            value={[inputs.height]}
                            min={
                                inputs.hasBottom
                                    ? Math.max(
                                          defaultConstraints.height.min,
                                          inputs.wallThickness + 1
                                      )
                                    : defaultConstraints.height.min
                            }
                            max={defaultConstraints.height.max}
                            step={1}
                            onValueChange={(value) =>
                                handleSliderChange('height', value[0])
                            }
                            className="flex-grow"
                        />
                        <Input
                            id="height"
                            type="number"
                            name="height"
                            value={inputs.height}
                            onChange={handleInputChange}
                            min={
                                inputs.hasBottom
                                    ? Math.max(
                                          defaultConstraints.height.min,
                                          inputs.wallThickness + 1
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
                        Wall Thickness (mm): {inputs.wallThickness.toFixed(1)}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Slider
                            id="wallThickness-slider"
                            value={[inputs.wallThickness]}
                            min={defaultConstraints.wallThickness.min}
                            max={defaultConstraints.wallThickness.max}
                            step={0.5}
                            onValueChange={(value) =>
                                handleSliderChange('wallThickness', value[0])
                            }
                            className="flex-grow"
                        />
                        <Input
                            id="wallThickness"
                            type="number"
                            name="wallThickness"
                            value={inputs.wallThickness}
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
                        Corner Radius (mm): {inputs.cornerRadius.toFixed(1)}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Slider
                            id="cornerRadius-slider"
                            value={[inputs.cornerRadius]}
                            min={defaultConstraints.cornerRadius.min}
                            max={calculateMaxCornerRadius(
                                inputs.width,
                                inputs.depth,
                                inputs.wallThickness,
                                defaultConstraints.cornerRadius.max
                            )}
                            step={0.5}
                            onValueChange={(value) =>
                                handleSliderChange('cornerRadius', value[0])
                            }
                            className="flex-grow"
                        />
                        <Input
                            id="cornerRadius"
                            type="number"
                            name="cornerRadius"
                            value={inputs.cornerRadius}
                            onChange={handleInputChange}
                            min={defaultConstraints.cornerRadius.min}
                            max={calculateMaxCornerRadius(
                                inputs.width,
                                inputs.depth,
                                inputs.wallThickness,
                                defaultConstraints.cornerRadius.max
                            )}
                            className="w-20"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                        id="hasBottom"
                        checked={inputs.hasBottom}
                        onCheckedChange={handleCheckboxChange}
                    />
                    <Label htmlFor="hasBottom">Include Bottom</Label>
                </div>

                {/* Multi-box settings */}
                <div className="pt-4 border-t mt-4">
                    <h3 className="font-medium mb-2">Multi-Box Layout</h3>
                    <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                            id="useMultipleBoxes"
                            checked={inputs.useMultipleBoxes}
                            onCheckedChange={handleMultiBoxCheckboxChange}
                        />
                        <Label htmlFor="useMultipleBoxes">
                            Split into multiple boxes
                        </Label>
                    </div>

                    {inputs.useMultipleBoxes && (
                        <>
                            <div className="space-y-2 mt-2">
                                <Label htmlFor="minBoxWidth">
                                    Min Box Width (mm):{' '}
                                    {inputs.minBoxWidth.toFixed(1)}
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Slider
                                        id="minBoxWidth-slider"
                                        value={[inputs.minBoxWidth]}
                                        min={defaultConstraints.width.min}
                                        max={inputs.maxBoxWidth}
                                        step={1}
                                        onValueChange={(value) =>
                                            handleSliderChange(
                                                'minBoxWidth',
                                                value[0]
                                            )
                                        }
                                        className="flex-grow"
                                    />
                                    <Input
                                        id="minBoxWidth"
                                        type="number"
                                        name="minBoxWidth"
                                        value={inputs.minBoxWidth}
                                        onChange={handleInputChange}
                                        min={defaultConstraints.width.min}
                                        max={inputs.maxBoxWidth}
                                        className="w-20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 mt-2">
                                <Label htmlFor="maxBoxWidth">
                                    Max Box Width (mm):{' '}
                                    {inputs.maxBoxWidth.toFixed(1)}
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Slider
                                        id="maxBoxWidth-slider"
                                        value={[inputs.maxBoxWidth]}
                                        min={inputs.minBoxWidth}
                                        max={inputs.width}
                                        step={1}
                                        onValueChange={(value) =>
                                            handleSliderChange(
                                                'maxBoxWidth',
                                                value[0]
                                            )
                                        }
                                        className="flex-grow"
                                    />
                                    <Input
                                        id="maxBoxWidth"
                                        type="number"
                                        name="maxBoxWidth"
                                        value={inputs.maxBoxWidth}
                                        onChange={handleInputChange}
                                        min={inputs.minBoxWidth}
                                        max={inputs.width}
                                        className="w-20"
                                    />
                                </div>
                            </div>

                            {/* Show calculated box widths */}
                            <div className="mt-3 text-sm">
                                <p className="font-medium">Box distribution:</p>
                                <div className="mt-1 bg-muted p-2 rounded">
                                    {boxWidths.map((width, i) => (
                                        <div key={i}>
                                            Box {i + 1}: {width.toFixed(1)} mm
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Debug Mode */}
                <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                    <Checkbox
                        id="debugMode"
                        checked={inputs.debugMode}
                        onCheckedChange={handleDebugModeChange}
                    />
                    <Label htmlFor="debugMode">Debug Mode</Label>
                    {inputs.debugMode && (
                        <div className="mt-1 text-xs text-muted-foreground ml-6">
                            Click on any box to see its details
                        </div>
                    )}
                </div>

                <Button
                    onClick={() =>
                        exportSTL(scene, boxMeshGroup, inputs, boxWidths)
                    }
                    className="w-full mt-6"
                >
                    Export STL
                </Button>
            </div>
        </div>
    );
}
