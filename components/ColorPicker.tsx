'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import * as ColorUtils from '@/lib/colorUtils'
import type { ColorPickerProps } from '@/lib/types'
import * as React from 'react'

export function ColorPicker({
    color = '#000000',
    onChange,
    defaultColor = '#7a9cbf',
}: ColorPickerProps) {
    const [currentColor, setCurrentColor] = React.useState(color)
    const colorPlaneRef = React.useRef<HTMLDivElement>(null)
    const isDragging = React.useRef(false)

    const rgb = ColorUtils.hexToRgb(currentColor) || { r: 0, g: 0, b: 0 }
    const hsl = ColorUtils.rgbToHsl(rgb)

    const handleColorChange = (newColor: string) => {
        setCurrentColor(newColor)
        onChange?.(newColor)
    }

    const updateHSL = (h: number, s: number, l: number) => {
        const rgb = ColorUtils.hslToRgb({ h, s, l })
        handleColorChange(ColorUtils.rgbToHex(rgb))
    }

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true
        handleColorPlaneChange(e)
    }

    const handleMouseUp = () => {
        isDragging.current = false
    }

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (isDragging.current) {
            handleColorPlaneChange(e)
        }
    }

    const handleColorPlaneChange = (e: React.MouseEvent | React.TouchEvent) => {
        if (!colorPlaneRef.current) return

        const rect = colorPlaneRef.current.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

        updateHSL(hsl.h, Math.round(x * 100), Math.round((1 - y) * 100))
    }

    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            isDragging.current = false
        }

        window.addEventListener('mouseup', handleGlobalMouseUp)
        window.addEventListener('touchend', handleGlobalMouseUp)

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp)
            window.removeEventListener('touchend', handleGlobalMouseUp)
        }
    }, [])

    const handleHexChange = (hex: string) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            handleColorChange(hex)
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="ustify-start text-left font-normal"
                >
                    <div className="flex w-full items-center gap-2">
                        <div
                            className="h-4 w-4 rounded border !bg-cover !bg-center transition-all"
                            style={{ backgroundColor: currentColor }}
                        />
                        <div className="flex-1 truncate">{currentColor}</div>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div
                        ref={colorPlaneRef}
                        className="relative h-48 w-full cursor-crosshair touch-none rounded-lg border"
                        style={{
                            background: `
                linear-gradient(
                  180deg,
                  #fff 0%,
                  rgba(128, 128, 128, 0) 50%,
                  #000 100%
                ),
                radial-gradient(
                  ellipse at 100% 50%,
                  /* Hue at 0%, fade to transparent by 100% */
                  hsl(${hsl.h}, 100%, 50%) 0%,
                  transparent 100%
                )
              `,
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                    >
                        <div
                            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                            style={{
                                left: `${hsl.s}%`,
                                top: `${100 - hsl.l}%`,
                                backgroundColor: currentColor,
                            }}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Hue</Label>
                        <div className="relative">
                            <Slider
                                value={[hsl.h]}
                                max={360}
                                step={1}
                                className="[&_.bg-blue-500]:bg-transparent [&_.bg-red-500]:bg-transparent [&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                                onValueChange={([h]) =>
                                    updateHSL(h, hsl.s, hsl.l)
                                }
                                style={{
                                    backgroundImage: `linear-gradient(to right, 
                    hsl(0, 100%, 50%),
                    hsl(60, 100%, 50%),
                    hsl(120, 100%, 50%),
                    hsl(180, 100%, 50%),
                    hsl(240, 100%, 50%),
                    hsl(300, 100%, 50%),
                    hsl(360, 100%, 50%)
                  )`,
                                }}
                            />
                            <style jsx global>{`
                                .slider-thumb {
                                    background-color: hsl(
                                        ${hsl.h},
                                        100%,
                                        50%
                                    ) !important;
                                    border: 2px solid white !important;
                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
                                }
                            `}</style>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            value={currentColor}
                            onChange={(e) => handleHexChange(e.target.value)}
                            className="font-mono"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleColorChange(defaultColor)}
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
