import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { parameters } from '@/lib/defaults'
import { useEffect, useState } from 'react'

export default function SliderInput({
    id,
    label,
    value,
    setValue,
    min,
    max,
    step,
}: {
    id: string
    label: string
    value: number
    setValue: (value: number) => void
    min: number
    max: number
    step: number
}) {
    const [localValue, setLocalValue] = useState<number>(value)

    const handleInputUpdate = (
        value: number,
        setLocal: (value: number) => void,
        setStore: (value: number) => void
    ) => {
        setLocal(value)
        setStore(value)
    }

    const handleKeyPress = (
        e: React.KeyboardEvent<HTMLInputElement>,
        value: number,
        setLocal: (value: number) => void,
        setStore: (value: number) => void
    ) => {
        if (e.key === 'Enter') {
            handleInputUpdate(value, setLocal, setStore)
            e.currentTarget.blur()
        }
    }

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    return (
        <div className="space-y-2">
            <div className="flex items-top justify-between">
                <Label htmlFor={id}>{label}</Label>
                <Input
                    type="number"
                    name={id}
                    value={localValue}
                    onChange={(e) => setLocalValue(Number(e.target.value))}
                    onKeyDown={(e) =>
                        handleKeyPress(e, localValue, setLocalValue, setValue)
                    }
                    onBlur={(e) => {
                        handleInputUpdate(
                            Number(e.target.value),
                            setLocalValue,
                            setValue
                        )
                    }}
                    min={parameters.totalWidth.min}
                    max={parameters.totalWidth.max}
                />
            </div>
            <Slider
                id={`${id}-slider`}
                name={id}
                value={[value]}
                onValueChange={(value) => setValue(value[0])}
                min={min}
                max={max}
                step={step}
            />
        </div>
    )
}
