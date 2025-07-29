'use client'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import { useStore } from '@/lib/store'

export default function GeneralSettings() {
    const store = useStore()

    return (
        <TabsContent value="generalSettings" className="space-y-4">
            {/* Display options section */}
            <h3 className="mb-3 font-medium">Display Options</h3>

            <div className="mb-2 flex items-center space-x-2">
                <Checkbox
                    id="showHelperGrid"
                    checked={store.showHelperGrid}
                    onCheckedChange={(checked) =>
                        store.setShowHelperGrid(!!checked)
                    }
                />
                <Label
                    htmlFor="showHelperGrid"
                    className="flex items-center gap-2"
                >
                    Show Grid
                </Label>
            </div>
            <div className="mb-2 flex items-center space-x-2">
                <Checkbox
                    id="showCornerLines"
                    checked={store.showCornerLines}
                    onCheckedChange={(checked) =>
                        store.setShowCornerLines(!!checked)
                    }
                />
                <Label
                    htmlFor="showCornerLines"
                    className="flex items-center gap-2"
                >
                    Show Corner Lines
                </Label>
            </div>
        </TabsContent>
    )
}
