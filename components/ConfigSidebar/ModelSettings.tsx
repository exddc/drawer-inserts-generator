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
import { defaultConstraints } from '@/lib/defaults'
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
                                min={defaultConstraints.totalWidth.min}
                                max={defaultConstraints.totalWidth.max}
                                step={defaultConstraints.totalWidth.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="total_width"
                                value={store.totalWidth}
                                onChange={store.setTotalWidth as any}
                                min={defaultConstraints.totalWidth.min}
                                max={defaultConstraints.totalWidth.max}
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
                                min={defaultConstraints.totalDepth.min}
                                max={defaultConstraints.totalDepth.max}
                                step={defaultConstraints.totalDepth.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="total_depth"
                                value={store.totalDepth}
                                onChange={store.setTotalDepth as any}
                                min={defaultConstraints.totalDepth.min}
                                max={defaultConstraints.totalDepth.max}
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
                                min={
                                    store.generateBottom
                                        ? Math.max(
                                              defaultConstraints.wallHeight.min,
                                              store.wallThickness + 1
                                          )
                                        : defaultConstraints.wallHeight.min
                                }
                                max={defaultConstraints.wallHeight.max}
                                step={defaultConstraints.wallHeight.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="total_height"
                                value={store.wallHeight}
                                onChange={store.setWallHeight as any}
                                min={
                                    store.generateBottom
                                        ? Math.max(
                                              defaultConstraints.wallHeight.min,
                                              store.wallThickness + 1
                                          )
                                        : defaultConstraints.wallHeight.min
                                }
                                max={defaultConstraints.wallHeight.max}
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
                                min={defaultConstraints.wallThickness.min}
                                max={defaultConstraints.wallThickness.max}
                                step={defaultConstraints.wallThickness.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="wallThickness"
                                value={store.wallThickness}
                                onChange={store.setWallThickness as any}
                                min={defaultConstraints.wallThickness.min}
                                max={defaultConstraints.wallThickness.max}
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
                                min={defaultConstraints.cornerRadius.min}
                                max={defaultConstraints.cornerRadius.max}
                                step={defaultConstraints.cornerRadius.steps}
                                className="flex-grow"
                            />
                            <Input
                                type="number"
                                name="cornerRadius"
                                value={store.cornerRadius}
                                onChange={store.setCornerRadius as any}
                                min={defaultConstraints.cornerRadius.min}
                                max={defaultConstraints.cornerRadius.max}
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
        </TabsContent>
    )
}
