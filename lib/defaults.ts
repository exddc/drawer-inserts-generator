export const parameters = {
    totalWidth: { default: 4, min: 1, max: 10, steps: 1 },
    totalDepth: { default: 4, min: 1, max: 10, steps: 1 },
    wallThickness: { default: 0.05, min: 0.01, max: 1, steps: 0.01 },
    cornerRadius: { default: 0.2, min: 0, max: 1, steps: 0.01 },
    wallHeight: { default: 1, min: 0.1, max: 2, steps: 0.1 },
    maxBoxWidth: { default: 3, min: 1, max: 10, steps: 1 },
    maxBoxDepth: { default: 3, min: 1, max: 10, steps: 1 },
}

export const cameraSettings = {
    fov: 60,
    near: 0.1,
    far: 100,
    position: { x: 5, y: 5, z: 5 },
}

export const material = {
    standard: {
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.2,
    },
    selected: {
        color: 0xff0000,
        roughness: 0.4,
        metalness: 0.2,
    }
}