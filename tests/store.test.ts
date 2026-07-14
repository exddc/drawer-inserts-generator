import { defaultModelParameters } from '@/lib/parameterValidation'
import { useStore } from '@/lib/store'
import { beforeEach, describe, expect, it } from 'vitest'

describe('model parameter store', () => {
    beforeEach(() => {
        useStore.setState(defaultModelParameters)
    })

    it.each([
        ['total width', 'totalWidth', 'setTotalWidth', 201],
        ['total depth', 'totalDepth', 'setTotalDepth', 201],
        ['max box width', 'maxBoxWidth', 'setMaxBoxWidth', 149],
        ['max box depth', 'maxBoxDepth', 'setMaxBoxDepth', 149],
    ] as const)(
        'preserves wall settings when changing %s across a segment boundary',
        (_label, parameter, setter, value) => {
            const initial = useStore.getState()

            initial[setter](value)

            const updated = useStore.getState()
            expect(updated[parameter]).toBe(value)
            expect(updated.wallThickness).toBe(initial.wallThickness)
            expect(updated.cornerRadius).toBe(initial.cornerRadius)
        }
    )

    it('still clamps the parameter that is being changed', () => {
        const state = useStore.getState()

        expect(state.setWallThickness(999)).toBe(15)
        expect(state.setCornerRadius(999)).toBe(25)
        expect(state.setTotalWidth(-10)).toBe(1)

        expect(useStore.getState()).toMatchObject({
            wallThickness: 15,
            cornerRadius: 25,
            totalWidth: 1,
        })
    })
})
