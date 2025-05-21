'use client'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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

            <div className="mt-4 space-y-2">
                <Label htmlFor="actionsBarPosition">Actions Bar Position</Label>
                <Select
                    value={store.actionsBarPosition}
                    onValueChange={(value) =>
                        store.setActionsBarPosition(value as 'top' | 'bottom')
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
        </TabsContent>
    )
}
