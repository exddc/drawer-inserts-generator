'use client'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { TabsContent } from '@/components/ui/tabs'

import { useBoxStore } from '@/lib/store'

export default function GeneralSettings() {
    const { debugMode, updateInput, showGrid, showAxes } = useBoxStore()

    // Generic Checkbox change handler
    const handleCheckboxChange = (name: string, checked: boolean) => {
        updateInput(name, checked)
    }

    return (
        <TabsContent value="generalSettings" className="space-y-4">
            {/* Display options section */}
            <h3 className="mb-3 font-medium">Display Options</h3>

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
        </TabsContent>
    )
}
