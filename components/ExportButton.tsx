'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ExportFormat, ExportProgress } from '@/lib/exportProtocol'
import type { PrintableModel } from '@/lib/printableModel'
import { useStore } from '@/lib/store'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export default function ExportButton() {
    const [isExporting, setIsExporting] = useState(false)
    const cancellation = useRef<AbortController | null>(null)
    const hasVisibleParts = useStore((state) =>
        state.grid.some((row) =>
            row.some((cell) => cell.visibility !== 'hidden')
        )
    )

    const startExport = async (format: ExportFormat) => {
        if (cancellation.current) return
        const controller = new AbortController()
        cancellation.current = controller
        setIsExporting(true)
        const cancel = () => controller.abort()
        const toastId = toast.loading('Preparing export…', {
            description: '0%',
            action: { label: 'Cancel', onClick: cancel },
        })

        try {
            const state = useStore.getState()
            const model: PrintableModel = {
                totalWidth: state.totalWidth,
                totalDepth: state.totalDepth,
                wallThickness: state.wallThickness,
                cornerRadius: state.cornerRadius,
                wallHeight: state.wallHeight,
                generateBottom: state.generateBottom,
                grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
            }
            const { downloadExport, runExport } =
                await import('@/lib/exportClient')
            const updateProgress = ({ percent, message }: ExportProgress) =>
                toast.loading(message, {
                    id: toastId,
                    description: `${percent}%`,
                    action: { label: 'Cancel', onClick: cancel },
                })
            const exported = await runExport({
                format,
                model,
                signal: controller.signal,
                onProgress: updateProgress,
            })
            downloadExport(exported)
            toast.success('Export ready', {
                id: toastId,
                description: exported.filename,
            })
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                toast.info('Export cancelled', { id: toastId })
            } else {
                toast.error('Export failed', {
                    id: toastId,
                    description:
                        error instanceof Error
                            ? error.message
                            : 'The export could not be generated.',
                })
            }
        } finally {
            cancellation.current = null
            setIsExporting(false)
        }
    }

    const disabled = isExporting || !hasVisibleParts
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="sm"
                    className="w-full"
                    disabled={disabled}
                    title={
                        !hasVisibleParts
                            ? 'There are no visible boxes to export.'
                            : undefined
                    }
                >
                    {!hasVisibleParts
                        ? 'No visible boxes'
                        : isExporting
                          ? 'Exporting…'
                          : 'Export Model'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => startExport('stl')}>
                    Export as STL (Print Plate)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => startExport('3mf')}>
                    Export as 3MF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => startExport('zip')}>
                    Export as ZIP (Separate STL Files)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
