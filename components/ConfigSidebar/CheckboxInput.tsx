import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export default function CheckboxInput({
    id,
    label,
    checked,
    setChecked,
}: {
    id: string
    label: string
    checked: boolean
    setChecked: (checked: boolean) => void
}) {
    return (
        <div className="flex items-top justify-between pt-2">
            <Label htmlFor={id}>{label}</Label>
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(checked) => setChecked(!!checked)}
            />
        </div>
    )
}
