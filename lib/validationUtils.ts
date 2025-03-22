import { defaultConstraints, FormInputs, InputConstraints } from '@/lib/types'

/**
 * Validate and adjust a numeric input value based on constraints
 */
export function validateNumericInput(
    name: string,
    value: number,
    currentValues: FormInputs
): number {
    if (name === 'minBoxWidth' && currentValues.maxBoxWidth) {
        return Math.min(
            Math.max(defaultConstraints.minBoxWidth!.min, value),
            currentValues.maxBoxWidth
        )
    }

    if (name === 'maxBoxWidth') {
        const minValue =
            currentValues.minBoxWidth || defaultConstraints.minBoxWidth!.min
        return Math.min(Math.max(minValue, value), currentValues.width)
    }

    if (name === 'minBoxDepth' && currentValues.maxBoxDepth) {
        return Math.min(
            Math.max(defaultConstraints.minBoxDepth!.min, value),
            currentValues.maxBoxDepth
        )
    }

    if (name === 'maxBoxDepth') {
        const minValue =
            currentValues.minBoxDepth || defaultConstraints.minBoxDepth!.min
        return Math.min(Math.max(minValue, value), currentValues.depth)
    }

    const constraint = defaultConstraints[name as keyof InputConstraints]
    if (constraint) {
        const { min, max } = constraint
        let validatedValue = value

        if (name === 'height' && currentValues.hasBottom) {
            const minHeight = Math.max(min, currentValues.wallThickness + 1)
            validatedValue = Math.max(minHeight, Math.min(validatedValue, max))
        } else {
            validatedValue = Math.max(min, Math.min(validatedValue, max))
        }

        if (name === 'cornerRadius') {
            let effectiveWidth = currentValues.width
            let effectiveDepth = currentValues.depth

            if (currentValues.useMultipleBoxes) {
                if (currentValues.minBoxWidth) {
                    effectiveWidth = currentValues.minBoxWidth
                }
                if (currentValues.minBoxDepth) {
                    effectiveDepth = currentValues.minBoxDepth
                }
            }

            const maxCornerX =
                (effectiveWidth - 2 * currentValues.wallThickness) / 2
            const maxCornerY =
                (effectiveDepth - 2 * currentValues.wallThickness) / 2
            const maxCorner = Math.min(maxCornerX, maxCornerY, max)
            validatedValue = Math.min(validatedValue, maxCorner)
        }

        return validatedValue
    }

    return value
}

/**
 * Calculate the maximum allowed corner radius based on current dimensions
 * Takes into account multiple boxes if enabled
 */
export function calculateMaxCornerRadius(
    width: number,
    depth: number,
    wallThickness: number,
    maxConstraint: number,
    useMultipleBoxes: boolean = false,
    minBoxWidth: number | null = null,
    minBoxDepth: number | null = null
): number {
    let maxCornerX = 10
    let maxCornerY = 10

    if (!useMultipleBoxes) {
        maxCornerX = (width - 2 * wallThickness) / 2
        maxCornerY = (depth - 2 * wallThickness) / 2
    }

    return Math.min(maxCornerX, maxCornerY, maxConstraint)
}
