'use client'
import { useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { TabsContent } from '@/components/ui/tabs'
import { ColorPicker } from '@/components/ColorPicker'
import { useBoxStore } from '@/lib/store'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

export default function GeneralSettings() {
    const {
        debugMode,
        updateInput,
        showGrid,
        showAxes,
        actionsBarPosition,
        setActionsBarPosition,
        boxColor,
        highlightColor,
    } = useBoxStore()

    // Generic Checkbox change handler
    const handleCheckboxChange = (name: string, checked: boolean) => {
        updateInput(name, checked)
    }

    // Handle color changes
    const handleBoxColorChange = (newColor: string) => {
        updateInput('boxColor', newColor)
    }

    const handleHighlightColorChange = (newColor: string) => {
        updateInput('highlightColor', newColor)
    }

    return (
        <TabsContent value="generalSettings" className="space-y-4">
            {/* Display options section */}
            <h3 className="mb-3 font-medium">Display Options</h3>

            <div className="mb-4 space-y-2">
                <Label htmlFor="actionsBarPosition">Actions Bar Position</Label>
                <Select
                    value={actionsBarPosition}
                    onValueChange={(value) =>
                        setActionsBarPosition(value as 'top' | 'bottom')
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="mb-2 flex items-center space-x-2">
                <Checkbox
                    id="showGrid"
                    checked={showGrid}
                    onCheckedChange={(checked) =>
                        handleCheckboxChange('showGrid', checked as boolean)
                    }
                />
                <Label htmlFor="showGrid" className="flex items-center gap-2">
                    Show Grid
                </Label>
            </div>

            <div className="mb-2 flex items-center space-x-2">
                <Checkbox
                    id="showAxes"
                    checked={showAxes}
                    onCheckedChange={(checked) =>
                        handleCheckboxChange('showAxes', checked as boolean)
                    }
                />
                <Label htmlFor="showAxes" className="flex items-center gap-2">
                    Show Axes
                </Label>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="debugMode"
                    checked={debugMode}
                    onCheckedChange={(checked) =>
                        handleCheckboxChange('debugMode', checked as boolean)
                    }
                />
                <Label htmlFor="debugMode">Debug Mode</Label>
            </div>

            {debugMode && (
                <div className="text-muted-foreground mt-1 ml-6 text-xs">
                    Click on any box to see its details
                </div>
            )}

            <h3 className="mb-3 font-medium">Color Options</h3>
            <div className="flex items-center space-x-2">
                <ColorPicker color={boxColor} onChange={handleBoxColorChange} />
                <Label>Model Color</Label>
            </div>
            <div className="flex items-center space-x-2">
                <ColorPicker
                    color={highlightColor}
                    onChange={handleHighlightColorChange}
                    defaultColor="#f59e0b"
                />
                <Label>Highlight Color</Label>
            </div>
        </TabsContent>
    )
}
