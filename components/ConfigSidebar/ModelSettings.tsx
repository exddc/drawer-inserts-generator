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
import { TabsContent } from '@/components/ui/tabs'
import { parameters } from '@/lib/defaults'
import { useStore } from '@/lib/store'
import { ChevronsUpDown } from 'lucide-react'

export default function ModelSettings() {
    // Get all required state from the store
    const store = useStore()

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
                        <Label htmlFor="total_width">
                            Total Width (mm): {store.totalWidth}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="total_width-slider"
                                name="total_width"
                                value={[store.totalWidth]}
                                onValueChange={(value) =>
                                    store.setTotalWidth(value[0])
                                }
                                min={parameters.totalWidth.min}
                                max={parameters.totalWidth.max}
                                step={parameters.totalWidth.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="total_width"
                                value={store.totalWidth}
                                onChange={store.setTotalWidth as any}
                                min={parameters.totalWidth.min}
                                max={parameters.totalWidth.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Depth slider */}
                    <div className="space-y-2">
                        <Label htmlFor="total_depth">
                            Total Depth (mm): {store.totalDepth}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="total_depth-slider"
                                name="total_depth"
                                value={[store.totalDepth]}
                                onValueChange={(value) =>
                                    store.setTotalDepth(value[0])
                                }
                                min={parameters.totalDepth.min}
                                max={parameters.totalDepth.max}
                                step={parameters.totalDepth.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="total_depth"
                                value={store.totalDepth}
                                onChange={store.setTotalDepth as any}
                                min={parameters.totalDepth.min}
                                max={parameters.totalDepth.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Height slider */}
                    <div className="space-y-2">
                        <Label htmlFor="total_height">
                            Height (mm): {store.wallHeight}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="total_height-slider"
                                name="total_height"
                                value={[store.wallHeight]}
                                onValueChange={(value) =>
                                    store.setWallHeight(value[0])
                                }
                                min={parameters.wallHeight.min}
                                max={parameters.wallHeight.max}
                                step={parameters.wallHeight.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="total_height"
                                value={store.wallHeight}
                                onChange={store.setWallHeight as any}
                                min={parameters.wallHeight.min}
                                max={parameters.wallHeight.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Wall thickness slider */}
                    <div className="space-y-2">
                        <Label htmlFor="wallThickness">
                            Wall Thickness (mm): {store.wallThickness}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="wallThickness-slider"
                                name="wallThickness"
                                value={[store.wallThickness]}
                                onValueChange={(value) =>
                                    store.setWallThickness(value[0])
                                }
                                min={parameters.wallThickness.min}
                                max={parameters.wallThickness.max}
                                step={parameters.wallThickness.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="wallThickness"
                                value={store.wallThickness}
                                onChange={store.setWallThickness as any}
                                min={parameters.wallThickness.min}
                                max={parameters.wallThickness.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Corner radius slider */}
                    <div className="space-y-2">
                        <Label htmlFor="cornerRadius">
                            Corner Radius (mm): {store.cornerRadius}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="cornerRadius-slider"
                                name="cornerRadius"
                                value={[store.cornerRadius]}
                                onValueChange={(value) =>
                                    store.setCornerRadius(value[0])
                                }
                                min={parameters.cornerRadius.min}
                                max={parameters.cornerRadius.max}
                                step={parameters.cornerRadius.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="cornerRadius"
                                value={store.cornerRadius}
                                onChange={store.setCornerRadius as any}
                                min={parameters.cornerRadius.min}
                                max={parameters.cornerRadius.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Include bottom checkbox */}
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="hasBottom"
                            checked={store.generateBottom}
                            onCheckedChange={(checked) =>
                                store.setGenerateBottom(!!checked)
                            }
                        />
                        <Label htmlFor="hasBottom">Include Bottom</Label>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <div className="w-full h-[1px] bg-neutral-200 my-6"></div>

            {/* Grid Layout Settings */}
            <Collapsible defaultOpen={true}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium">Grid Layout</h3>
                    <CollapsibleTrigger className="cursor-pointer">
                        <ChevronsUpDown className="inline-block h-4 w-4" />
                    </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-4">
                    {/* Max Width slider */}
                    <div className="space-y-2">
                        <Label htmlFor="max_width">
                            Max Box Width (mm): {store.maxBoxWidth}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="max_width-slider"
                                name="max_width"
                                value={[store.maxBoxWidth]}
                                onValueChange={(value) =>
                                    store.setMaxBoxWidth(value[0])
                                }
                                min={parameters.maxBoxWidth.min}
                                max={parameters.maxBoxWidth.max}
                                step={parameters.maxBoxWidth.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="max_width"
                                value={store.maxBoxWidth}
                                onChange={store.setMaxBoxWidth as any}
                                min={parameters.maxBoxWidth.min}
                                max={parameters.maxBoxWidth.max}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Max Depth slider */}
                    <div className="space-y-2">
                        <Label htmlFor="max_depth">
                            Total Depth (mm): {store.maxBoxDepth}
                        </Label>
                        <div className="mt-2 flex items-center space-x-2">
                            <Slider
                                id="max_depth-slider"
                                name="max_depth"
                                value={[store.maxBoxDepth]}
                                onValueChange={(value) =>
                                    store.setMaxBoxDepth(value[0])
                                }
                                min={parameters.maxBoxDepth.min}
                                max={parameters.maxBoxDepth.max}
                                step={parameters.maxBoxDepth.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="max_depth"
                                value={store.maxBoxDepth}
                                onChange={store.setMaxBoxDepth as any}
                                min={parameters.maxBoxDepth.min}
                                max={parameters.maxBoxDepth.max}
                                className="w-20"
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <div className="w-full h-[1px] bg-neutral-200 mt-6"></div>
        </TabsContent>
    )
}
