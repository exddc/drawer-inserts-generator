import { ValidKey } from './types'


export const keyPress = (key: ValidKey) => {
    if (typeof window === 'undefined') return;
    
    window.dispatchEvent(
        new KeyboardEvent('keydown', {
            key: key,
            code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
            bubbles: true,
            cancelable: true,
        })
    );
};