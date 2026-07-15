import type {
    ExportFormat,
    ExportProgress,
    ExportWorkerRequest,
    ExportWorkerResponse,
} from '@/lib/exportProtocol'
import type { PrintableModel } from '@/lib/printableModel'

export type CompletedExport = {
    data: ArrayBuffer
    filename: string
    contentType: string
}

export async function runExport({
    format,
    model,
    signal,
    onProgress,
}: {
    format: ExportFormat
    model: PrintableModel
    signal: AbortSignal
    onProgress: (progress: ExportProgress) => void
}): Promise<CompletedExport> {
    if (signal.aborted) {
        throw new DOMException('Export cancelled.', 'AbortError')
    }
    const worker = new Worker(new URL('./exportWorker.ts', import.meta.url), {
        type: 'module',
    })

    try {
        const data = await new Promise<ArrayBuffer>((resolve, reject) => {
            const abort = () => {
                worker.terminate()
                reject(new DOMException('Export cancelled.', 'AbortError'))
            }
            signal.addEventListener('abort', abort, { once: true })
            worker.onmessage = ({
                data,
            }: MessageEvent<ExportWorkerResponse>) => {
                if (data.type === 'progress') {
                    onProgress(data)
                    return
                }
                signal.removeEventListener('abort', abort)
                if (data.type === 'result') resolve(data.data)
                else {
                    const error = new Error(data.message)
                    error.name = data.name
                    reject(error)
                }
            }
            worker.onerror = (event) => {
                signal.removeEventListener('abort', abort)
                reject(new Error(event.message || 'The export worker failed.'))
            }
            const request: ExportWorkerRequest = { format, model }
            worker.postMessage(request)
        })

        const formatDimension = (value: number) =>
            Number(value.toFixed(4)).toString()
        const base = `drawer-inserts-${formatDimension(model.totalWidth)}x${formatDimension(model.totalDepth)}x${formatDimension(model.wallHeight)}`
        if (format === 'stl') {
            return {
                data,
                filename: `${base}-print-plate.stl`,
                contentType: 'model/stl',
            }
        }
        if (format === '3mf') {
            return { data, filename: `${base}.3mf`, contentType: 'model/3mf' }
        }
        return {
            data,
            filename: `${base}-grid.zip`,
            contentType: 'application/zip',
        }
    } finally {
        worker.terminate()
    }
}

export function downloadExport(exported: CompletedExport): void {
    const href = URL.createObjectURL(
        new Blob([exported.data], { type: exported.contentType })
    )
    const link = document.createElement('a')
    link.href = href
    link.download = exported.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(href), 100)
}
