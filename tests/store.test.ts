import {
    defaultModelParameters,
    getMinimumBoxSize,
} from '@/lib/parameterValidation'
import { useStore } from '@/lib/store'
import { beforeEach, describe, expect, it } from 'vitest'

describe('model parameter store', () => {
    beforeEach(() => {
        useStore.setState(defaultModelParameters)
    })

    it.each([
        ['total width', 'totalWidth', 'maxBoxWidth', 'setTotalWidth'],
        ['total depth', 'totalDepth', 'maxBoxDepth', 'setTotalDepth'],
    ] as const)(
        'extends the max box size when changing %s would create a tiny remainder',
        (_label, parameter, maxBoxParameter, setter) => {
            const initial = useStore.getState()

            initial[setter](201)

            const updated = useStore.getState()
            expect(updated[parameter]).toBe(201)
            expect(updated[maxBoxParameter]).toBe(100.5)
            expect(updated.wallThickness).toBe(initial.wallThickness)
            expect(updated.cornerRadius).toBe(initial.cornerRadius)
        }
    )

    it.each([
        ['max box width', 'maxBoxWidth', 'setMaxBoxWidth'],
        ['max box depth', 'maxBoxDepth', 'setMaxBoxDepth'],
    ] as const)(
        'extends %s when the requested value would create a tiny remainder',
        (_label, parameter, setter) => {
            const state = useStore.getState()

            expect(state[setter](149)).toBe(150)
            expect(useStore.getState()[parameter]).toBe(150)
        }
    )

    it('gates total and max box dimensions at the smallest valid box size', () => {
        const state = useStore.getState()
        const minBoxSize = getMinimumBoxSize(
            state.wallThickness,
            state.cornerRadius
        )

        expect(minBoxSize).toBe(13)
        expect(state.setTotalWidth(1)).toBe(minBoxSize)
        expect(state.setMaxBoxWidth(1)).toBe(minBoxSize)
        expect(useStore.getState()).toMatchObject({
            totalWidth: minBoxSize,
            maxBoxWidth: minBoxSize,
        })
    })

    it('revalidates both grid axes when wall settings raise the minimum', () => {
        const state = useStore.getState()

        expect(state.setCornerRadius(30)).toBe(30)
        expect(useStore.getState()).toMatchObject({
            totalWidth: 150,
            totalDepth: 150,
            maxBoxWidth: 150,
            maxBoxDepth: 150,
            wallThickness: 2,
            cornerRadius: 30,
        })
    })

    it('still clamps the parameter that is being changed', () => {
        const state = useStore.getState()

        expect(state.setWallThickness(999)).toBe(15)
        expect(state.setCornerRadius(999)).toBe(30)
        expect(state.setTotalWidth(-10)).toBe(91)

        expect(useStore.getState()).toMatchObject({
            wallThickness: 15,
            cornerRadius: 30,
            totalWidth: 91,
        })
    })
})
