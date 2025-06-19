export const keyPress = (key: string) => {
    window.dispatchEvent(
        new KeyboardEvent('keydown', {
            key: key,
            code: key,
        })
    )
}