export const defaultParameters = {
    totalWidth: 4,
    totalDepth: 4,
    wallThickness: 0.05,
    cornerRadius: 0.2,
    wallHeight: 1,
    generateBottom: true,
}

export const defaultConstraints = {
    totalWidth: { min: 1, max: 10, steps: 1 },
    totalDepth: { min: 1, max: 10, steps: 1 },
    wallThickness: { min: 0.01, max: 1, steps: 0.01 },
    cornerRadius: { min: 0, max: 1, steps: 0.01 },
    wallHeight: { min: 0.1, max: 10, steps: 0.1 },
    generateBottom: true,
}