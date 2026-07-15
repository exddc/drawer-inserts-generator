import { runExport } from '@/lib/exportClient'
import type { ExportWorkerResponse } from '@/lib/exportProtocol'
import { processExportRequest } from '@/lib/exportWorker'
import type { PrintableModel } from '@/lib/printableModel'
import { describe, expect, it } from 'vitest'

function model(visible = true): PrintableModel {
    return {
        totalWidth: 20,
        totalDepth: 20,
        wallThickness: 2,
        cornerRadius: 4,
        wallHeight: 30,
        generateBottom: true,
        grid: [
            [
                {
                    group: 0,
                    width: 20,
                    depth: 20,
                    visibility: visible ? 'visible' : 'hidden',
                },
            ],
        ],
    }
}

describe('export worker protocol', () => {
    it('reports progress and returns transferable export data', async () => {
        const responses: ExportWorkerResponse[] = []

        await processExportRequest(
            { format: 'stl', model: model() },
            (message) => responses.push(message)
        )

        expect(
            responses.filter((response) => response.type === 'progress')
        ).toHaveLength(3)
        const result = responses.find((response) => response.type === 'result')
        expect(result).toMatchObject({ type: 'result' })
        expect(
            result?.type === 'result' && result.data.byteLength
        ).toBeGreaterThan(84)
    })

    it('serializes model validation failures instead of rejecting', async () => {
        const responses: ExportWorkerResponse[] = []

        await processExportRequest(
            { format: '3mf', model: model(false) },
            (message) => responses.push(message)
        )

        expect(responses.at(-1)).toEqual({
            type: 'error',
            name: 'ExportModelError',
            code: 'no-visible-parts',
            message: 'There are no visible boxes to export.',
        })
    })

    it('honors cancellation before loading a worker', async () => {
        const controller = new AbortController()
        controller.abort()

        await expect(
            runExport({
                format: 'stl',
                model: model(),
                signal: controller.signal,
                onProgress: () => undefined,
            })
        ).rejects.toMatchObject({ name: 'AbortError' })
    })
})
