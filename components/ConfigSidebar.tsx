'use client';
import { useEffect } from 'react';
import * as THREE from 'three';
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
import { useBoxStore } from '@/lib/store';

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
        useMultipleBoxes,
        debugMode,
        boxWidths,
        updateInput,
    } = useBoxStore();

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateInput(name, parseFloat(value));
    };

    // Handle slider changes
    const handleSliderChange = (name: string, value: number[]) => {
        updateInput(name, value[0]);
    };

    // Handle checkbox changes
    const handleCheckboxChange = (name: string, checked: boolean) => {
        updateInput(name, checked);
    };

    // Calculate max corner radius based on current values
    // We'll use this just for display purposes, but won't automatically change the corner radius
    const maxCornerRadius = calculateMaxCornerRadius(
        width,
        depth,
        wallThickness,
        defaultConstraints.cornerRadius.max
    );

    // Effect to ensure corner radius stays within valid range when other parameters change
    useEffect(() => {
        // Only adjust corner radius if it exceeds the max allowed value
        if (cornerRadius > maxCornerRadius) {
            updateInput('cornerRadius', maxCornerRadius);
        }
    }, [maxCornerRadius, cornerRadius, updateInput]);

    return (
        <div className="h-full overflow-auto p-4">
            <div className="space-y-4">
                {/* Width Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="width">Total Width (mm)</Label>
                        <span className="text-sm text-muted-foreground">
                            {width}
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                        <Slider
                            id="width-slider"
                            min={defaultConstraints.width.min}
                            max={defaultConstraints.width.max}
                            step={1}
                            value={[width]}
                            onValueChange={(value) =>
                                handleSliderChange('width', value)
                            }
                        />
                        <Input
                            id="width"
                            type="number"
                            name="width"
                            value={width}
                            onChange={handleInputChange}
                            min={defaultConstraints.width.min}
                            max={defaultConstraints.width.max}
                        />
                    </div>
                </div>

                {/* Depth Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="depth">Depth (mm)</Label>
                        <span className="text-sm text-muted-foreground">
                            {depth}
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                        <Slider
                            id="depth-slider"
                            min={defaultConstraints.depth.min}
                            max={defaultConstraints.depth.max}
                            step={1}
                            value={[depth]}
                            onValueChange={(value) =>
                                handleSliderChange('depth', value)
                            }
                        />
                        <Input
                            id="depth"
                            type="number"
                            name="depth"
                            value={depth}
                            onChange={handleInputChange}
                            min={defaultConstraints.depth.min}
                            max={defaultConstraints.depth.max}
                        />
                    </div>
                </div>

                {/* Height Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="height">Height (mm)</Label>
                        <span className="text-sm text-muted-foreground">
                            {height}
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                        <Slider
                            id="height-slider"
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
                            value={[height]}
                            onValueChange={(value) =>
                                handleSliderChange('height', value)
                            }
                        />
                        <Input
                            id="height"
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
                        />
                    </div>
                </div>

                {/* Wall Thickness Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="wallThickness">
                            Wall Thickness (mm)
                        </Label>
                        <span className="text-sm text-muted-foreground">
                            {wallThickness}
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                        <Slider
                            id="wallThickness-slider"
                            min={defaultConstraints.wallThickness.min}
                            max={defaultConstraints.wallThickness.max}
                            step={0.5}
                            value={[wallThickness]}
                            onValueChange={(value) =>
                                handleSliderChange('wallThickness', value)
                            }
                        />
                        <Input
                            id="wallThickness"
                            type="number"
                            name="wallThickness"
                            value={wallThickness}
                            onChange={handleInputChange}
                            min={defaultConstraints.wallThickness.min}
                            max={defaultConstraints.wallThickness.max}
                            step="0.5"
                        />
                    </div>
                </div>

                {/* Corner Radius Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="cornerRadius">Corner Radius (mm)</Label>
                        <span className="text-sm text-muted-foreground">
                            {cornerRadius}
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                        <Slider
                            id="cornerRadius-slider"
                            min={defaultConstraints.cornerRadius.min}
                            max={maxCornerRadius}
                            step={0.5}
                            value={[cornerRadius]}
                            onValueChange={(value) =>
                                handleSliderChange('cornerRadius', value)
                            }
                        />
                        <Input
                            id="cornerRadius"
                            type="number"
                            name="cornerRadius"
                            value={cornerRadius}
                            onChange={handleInputChange}
                            min={defaultConstraints.cornerRadius.min}
                            max={maxCornerRadius}
                            step="0.5"
                        />
                    </div>
                </div>

                {/* Include Bottom Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                        id="hasBottom"
                        checked={hasBottom}
                        onCheckedChange={(checked) =>
                            handleCheckboxChange('hasBottom', checked === true)
                        }
                    />
                    <Label htmlFor="hasBottom">Include Bottom</Label>
                </div>

                {/* Multi-box settings */}
                <div className="pt-4 border-t mt-4">
                    <h3 className="font-medium mb-2">Multi-Box Layout</h3>
                    <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                            id="useMultipleBoxes"
                            checked={useMultipleBoxes}
                            onCheckedChange={(checked) =>
                                handleCheckboxChange(
                                    'useMultipleBoxes',
                                    checked === true
                                )
                            }
                        />
                        <Label htmlFor="useMultipleBoxes">
                            Split into multiple boxes
                        </Label>
                    </div>

                    {useMultipleBoxes && (
                        <>
                            {/* Min Box Width (fixed to 10 and disabled) */}
                            <div className="space-y-2 mt-2">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="minBoxWidth"
                                        className="text-muted-foreground"
                                    >
                                        Min Box Width (fixed at 10mm)
                                    </Label>
                                    <span className="text-sm text-muted-foreground">
                                        10
                                    </span>
                                </div>
                            </div>

                            {/* Max Box Width Input */}
                            <div className="space-y-2 mt-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="maxBoxWidth">
                                        Max Box Width (mm)
                                    </Label>
                                    <span className="text-sm text-muted-foreground">
                                        {maxBoxWidth}
                                    </span>
                                </div>
                                <div className="grid grid-cols-[1fr_80px] gap-2">
                                    <Slider
                                        id="maxBoxWidth-slider"
                                        min={minBoxWidth}
                                        max={width}
                                        step={1}
                                        value={[maxBoxWidth]}
                                        onValueChange={(value) =>
                                            handleSliderChange(
                                                'maxBoxWidth',
                                                value
                                            )
                                        }
                                    />
                                    <Input
                                        id="maxBoxWidth"
                                        type="number"
                                        name="maxBoxWidth"
                                        value={maxBoxWidth}
                                        onChange={handleInputChange}
                                        min={minBoxWidth}
                                        max={width}
                                    />
                                </div>
                            </div>

                            {/* Show calculated box widths */}
                            <div className="mt-3 text-sm">
                                <p className="font-medium">Box distribution:</p>
                                <div className="mt-1 bg-muted p-2 rounded">
                                    {boxWidths.map((boxWidth, i) => (
                                        <div key={i}>
                                            Box {i + 1}: {boxWidth.toFixed(1)}{' '}
                                            mm
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
                        checked={debugMode}
                        onCheckedChange={(checked) =>
                            handleCheckboxChange('debugMode', checked === true)
                        }
                    />
                    <Label htmlFor="debugMode">Debug Mode</Label>
                    {debugMode && (
                        <div className="mt-1 text-xs text-muted-foreground ml-6">
                            Click on any box to see its details
                        </div>
                    )}
                </div>

                <Button
                    onClick={() => {
                        const inputs = {
                            width,
                            depth,
                            height,
                            wallThickness,
                            cornerRadius,
                            hasBottom,
                            minBoxWidth,
                            maxBoxWidth,
                            useMultipleBoxes,
                            debugMode,
                        };
                        exportSTL(scene, boxMeshGroup, inputs, boxWidths);
                    }}
                    className="w-full mt-6"
                >
                    Export STL
                </Button>
            </div>
        </div>
    );
}
