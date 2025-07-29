'use client'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { parameters } from '@/lib/defaults'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ChevronsDown } from 'lucide-react'
import { useState } from 'react'
import CheckboxInput from './CheckboxInput'
import SliderInput from './SliderInput'

export default function ModelSettings() {
    const store = useStore()
    const [generalCollapsable, setGeneralCollapsable] = useState(true)
    const [gridCollapsable, setGridCollapsable] = useState(true)
    return (
        <>
            <Collapsible
                defaultOpen={true}
                onOpenChange={setGeneralCollapsable}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium">General</h3>
                    <CollapsibleTrigger className="cursor-pointer">
                        <ChevronsDown
                            className={cn(
                                'inline-block h-4 w-4 transition-transform duration-300',
                                generalCollapsable && 'rotate-180'
                            )}
                        />
                    </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-4">
                    <SliderInput
                        id="total_width"
                        label="Total Width (mm)"
                        value={store.totalWidth}
                        setValue={store.setTotalWidth}
                        min={parameters.totalWidth.min}
                        max={parameters.totalWidth.max}
                        step={parameters.totalWidth.steps}
                    />
                    <SliderInput
                        id="total_depth"
                        label="Total Depth (mm)"
                        value={store.totalDepth}
                        setValue={store.setTotalDepth}
                        min={parameters.totalDepth.min}
                        max={parameters.totalDepth.max}
                        step={parameters.totalDepth.steps}
                    />

                    <SliderInput
                        id="wall_height"
                        label="Wall Height (mm)"
                        value={store.wallHeight}
                        setValue={store.setWallHeight}
                        min={parameters.wallHeight.min}
                        max={parameters.wallHeight.max}
                        step={parameters.wallHeight.steps}
                    />

                    <SliderInput
                        id="wall_thickness"
                        label="Wall Thickness (mm)"
                        value={store.wallThickness}
                        setValue={store.setWallThickness}
                        min={parameters.wallThickness.min}
                        max={parameters.wallThickness.max}
                        step={parameters.wallThickness.steps}
                    />

                    <SliderInput
                        id="corner_radius"
                        label="Corner Radius (mm)"
                        value={store.cornerRadius}
                        setValue={store.setCornerRadius}
                        min={parameters.cornerRadius.min}
                        max={parameters.cornerRadius.max}
                        step={parameters.cornerRadius.steps}
                    />

                    <CheckboxInput
                        id="hasBottom"
                        label="Generate Bottom"
                        checked={store.generateBottom}
                        setChecked={store.setGenerateBottom}
                    />
                </CollapsibleContent>
            </Collapsible>

            {/* Grid Layout Settings */}
            <Collapsible defaultOpen={true} onOpenChange={setGridCollapsable}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium">Grid Layout</h3>
                    <CollapsibleTrigger className="cursor-pointer">
                        <ChevronsDown
                            className={cn(
                                'inline-block h-4 w-4 transition-transform duration-300',
                                gridCollapsable && 'rotate-180'
                            )}
                        />
                    </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-4">
                    <SliderInput
                        id="max_box_width"
                        label="Max Box Width (mm)"
                        value={store.maxBoxWidth}
                        setValue={store.setMaxBoxWidth}
                        min={parameters.maxBoxWidth.min}
                        max={parameters.maxBoxWidth.max}
                        step={parameters.maxBoxWidth.steps}
                    />

                    <SliderInput
                        id="max_box_depth"
                        label="Max Box Depth (mm)"
                        value={store.maxBoxDepth}
                        setValue={store.setMaxBoxDepth}
                        min={parameters.maxBoxDepth.min}
                        max={parameters.maxBoxDepth.max}
                        step={parameters.maxBoxDepth.steps}
                    />
                </CollapsibleContent>
            </Collapsible>
        </>
    )
}
