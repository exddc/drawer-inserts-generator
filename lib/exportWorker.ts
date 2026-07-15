import type {
    ExportWorkerRequest,
    ExportWorkerResponse,
} from '@/lib/exportProtocol'
import { ExportModelError, validatePrintableModel } from '@/lib/printableModel'

type WorkerMessenger = {
    onmessage: ((event: MessageEvent<ExportWorkerRequest>) => void) | null
    postMessage: (
        message: ExportWorkerResponse,
        transfer?: Transferable[]
    ) => void
}

export async function processExportRequest(
    { format, model }: ExportWorkerRequest,
    send: WorkerMessenger['postMessage']
): Promise<void> {
    try {
        progress(send, 5, 'Validating printable model…')
        validatePrintableModel(model)
        progress(send, 15, 'Generating watertight geometry…')

        const exporters = await import('@/lib/exportUtils')
        const output =
            format === 'stl'
                ? exporters.generateStl(model)
                : format === '3mf'
                  ? await exporters.generateThreeMf(model)
                  : await exporters.generateSeparateStlZip(model)
        progress(send, 95, 'Finalizing download…')

        const buffer =
            output instanceof Uint8Array
                ? new Uint8Array(output).buffer
                : output
        send({ type: 'result', data: buffer }, [buffer])
    } catch (error) {
        send({
            type: 'error',
            name: error instanceof Error ? error.name : 'ExportError',
            message:
                error instanceof Error
                    ? error.message
                    : 'The export could not be generated.',
            code: error instanceof ExportModelError ? error.code : undefined,
        })
    }
}

function progress(
    send: WorkerMessenger['postMessage'],
    percent: number,
    message: string
): void {
    send({ type: 'progress', percent, message })
}

if (typeof self !== 'undefined') {
    const workerScope = self as unknown as WorkerMessenger
    workerScope.onmessage = ({ data }) => {
        void processExportRequest(data, (message, transfer) =>
            workerScope.postMessage(message, transfer)
        )
    }
}
