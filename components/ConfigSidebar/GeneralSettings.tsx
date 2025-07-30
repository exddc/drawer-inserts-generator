'use client'
import { useStore } from '@/lib/store'
import CheckboxInput from './CheckboxInput'

export default function GeneralSettings() {
    const store = useStore()

    return (
        <>
            <h3 className="mb-3 font-medium">Display Options</h3>

            <div className="space-y-2">
                <CheckboxInput
                    id="showHelperGrid"
                    label="Show Grid"
                    checked={store.showHelperGrid}
                    setChecked={store.setShowHelperGrid}
                />

                <CheckboxInput
                    id="showCornerLines"
                    label="Show Corner Lines"
                    checked={store.showCornerLines}
                    setChecked={store.setShowCornerLines}
                />
            </div>
        </>
    )
}
