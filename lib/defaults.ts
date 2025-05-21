export const parameters = {
    totalWidth: { default: 150, min: 1, max: 500, steps: 1 },
    totalDepth: { default: 150, min: 1, max: 500, steps: 1 },
    wallThickness: { default: 2, min: 0.1, max: 15, steps: 0.1 },
    cornerRadius: { default: 4, min: 0, max: 30, steps: 0.1 },
    wallHeight: { default: 30, min: 0.1, max: 100, steps: 0.1 },
    maxBoxWidth: { default: 100, min: 1, max: 500, steps: 1 },
    maxBoxDepth: { default: 100, min: 1, max: 500, steps: 1 },
}

export const cameraSettings = {
    fov: 75,
    near: 0.1,
    far: 1000,
    position: { x: 100, y: 100, z: 100 },
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
    },
}
