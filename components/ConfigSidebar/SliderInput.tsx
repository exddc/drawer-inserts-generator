import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
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
    setValue: (value: number) => number
    min: number
    max: number
    step: number
}) {
    const [localValue, setLocalValue] = useState<number | ''>(value)

    const handleInputUpdate = (
        value: number | '',
        setLocal: (value: number | '') => void,
        setStore: (value: number) => number
    ) => {
        const nextValue = setStore(value === '' ? Number.NaN : value)
        setLocal(nextValue)
    }

    const handleKeyPress = (
        e: React.KeyboardEvent<HTMLInputElement>,
        value: number | '',
        setLocal: (value: number | '') => void,
        setStore: (value: number) => number
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
                    onChange={(e) =>
                        setLocalValue(
                            e.target.value === ''
                                ? ''
                                : e.currentTarget.valueAsNumber
                        )
                    }
                    onKeyDown={(e) =>
                        handleKeyPress(e, localValue, setLocalValue, setValue)
                    }
                    onBlur={(e) => {
                        handleInputUpdate(
                            e.target.value === ''
                                ? ''
                                : e.currentTarget.valueAsNumber,
                            setLocalValue,
                            setValue
                        )
                    }}
                    min={min}
                    max={max}
                    step={step}
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
