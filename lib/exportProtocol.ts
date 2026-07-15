import type { PrintableModel } from '@/lib/printableModel'

export type ExportFormat = 'stl' | '3mf' | 'zip'

export type ExportWorkerRequest = {
    format: ExportFormat
    model: PrintableModel
}

export type ExportProgress = {
    percent: number
    message: string
}

export type ExportWorkerResponse =
    | ({ type: 'progress' } & ExportProgress)
    | { type: 'result'; data: ArrayBuffer }
    | { type: 'error'; name: string; message: string; code?: string }
