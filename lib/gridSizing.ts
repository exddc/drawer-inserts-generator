export const dimensionTolerance = 1e-9

export function segmentSizes(
    total: number,
    maxSize: number,
    minSize = 0
): number[] {
    if (!Number.isFinite(total) || !Number.isFinite(maxSize)) return [1]
    if (total <= 0 || maxSize <= 0) return [1]

    const segmentCount = Math.max(
        1,
        Math.ceil(total / maxSize - dimensionTolerance)
    )
    const segments = Array(Math.max(0, segmentCount - 1)).fill(maxSize)
    segments.push(total - maxSize * (segmentCount - 1))

    const lastSegment = segments[segments.length - 1]
    if (lastSegment + dimensionTolerance >= minSize) return segments

    const balancedSize = total / segmentCount
    const balancedSegments = Array(Math.max(0, segmentCount - 1)).fill(
        balancedSize
    )
    balancedSegments.push(total - balancedSize * (segmentCount - 1))
    return balancedSegments
}
