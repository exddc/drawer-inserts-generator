import * as THREE from 'three'
import { BoxDimensions, generateBox } from '@/lib/boxGenerator'

/**
 * Basic box information for rendering in the grid
 */
interface BoxInfo {
    width: number
    depth: number
    height: number
    wallThickness: number
    cornerRadius: number
    hasBottom: boolean
    x: number
    z: number
    index: number
    color: number
    visible: boolean
    
    // Connection information
    connections: number[]   // Indices of boxes this box is connected to
    isPartOfGroup: boolean  // Flag indicating if this box is part of a connected group
    groupId?: number        // Identifier for the group this box belongs to
}

/**
 * Calculate total width of all boxes
 */
function calculateTotalWidth(boxWidths: number[]): number {
    return boxWidths.reduce((sum, width) => sum + width, 0)
}

/**
 * Calculate total depth of all boxes
 */
function calculateTotalDepth(boxDepths: number[]): number {
    return boxDepths.reduce((sum, depth) => sum + depth, 0)
}

/**
 * Calculate sum of widths up to specific index
 */
function sumWidthsBeforeIndex(boxWidths: number[], index: number): number {
    return boxWidths.slice(0, index).reduce((sum, width) => sum + width, 0)
}

/**
 * Calculate sum of depths up to specific index
 */
function sumDepthsBeforeIndex(boxDepths: number[], index: number): number {
    return boxDepths.slice(0, index).reduce((sum, depth) => sum + depth, 0)
}

/**
 * Find connected box groups using a floodfill approach
 * Each group contains boxes that should be combined into a single box
 */
function findConnectedGroups(connections: Map<number, number[]>): Map<number, number[]> {
    const visited = new Set<number>()
    const groups = new Map<number, number[]>()
    let groupId = 0
    
    // Helper for floodfill
    function floodFill(startIndex: number, group: number[]) {
        const queue = [startIndex]
        
        while (queue.length > 0) {
            const current = queue.shift()!
            
            if (visited.has(current)) continue
            
            visited.add(current)
            group.push(current)
            
            // Add all connected boxes to the queue
            const connectedBoxes = connections.get(current) || []
            for (const connectedIndex of connectedBoxes) {
                if (!visited.has(connectedIndex)) {
                    queue.push(connectedIndex)
                }
            }
        }
    }
    
    // Find all connected groups
    for (const [boxIndex] of connections) {
        if (!visited.has(boxIndex)) {
            const group: number[] = []
            floodFill(boxIndex, group)
            
            // Only consider groups with 2+ boxes as combined
            if (group.length > 1) {
                groups.set(groupId++, group)
            }
        }
    }
    
    return groups
}

/**
 * Calculate the bounding box dimensions for a group of connected boxes
 */
function calculateGroupBounds(
    group: number[], 
    boxWidths: number[], 
    boxDepths: number[],
    numCols: number
): { 
    minCol: number, 
    maxCol: number, 
    minRow: number, 
    maxRow: number, 
    width: number, 
    depth: number,
    startX: number,
    startZ: number
} {
    let minCol = Number.MAX_SAFE_INTEGER
    let maxCol = 0
    let minRow = Number.MAX_SAFE_INTEGER
    let maxRow = 0
    
    for (const index of group) {
        const row = Math.floor(index / numCols)
        const col = index % numCols
        
        minCol = Math.min(minCol, col)
        maxCol = Math.max(maxCol, col)
        minRow = Math.min(minRow, row)
        maxRow = Math.max(maxRow, row)
    }
    
    // Calculate total width and depth
    let totalWidth = 0
    for (let col = minCol; col <= maxCol; col++) {
        totalWidth += boxWidths[col]
    }
    
    let totalDepth = 0
    for (let row = minRow; row <= maxRow; row++) {
        totalDepth += boxDepths[row]
    }
    
    // Calculate grid dimensions
    const gridWidth = calculateTotalWidth(boxWidths)
    const gridDepth = calculateTotalDepth(boxDepths)
    
    // Calculate starting position
    const startX = -gridWidth / 2 + sumWidthsBeforeIndex(boxWidths, minCol)
    const startZ = gridDepth / 2 - sumDepthsBeforeIndex(boxDepths, minRow)
    
    return {
        minCol,
        maxCol,
        minRow,
        maxRow,
        width: totalWidth,
        depth: totalDepth,
        startX,
        startZ
    }
}

/**
 * Generate grid of box information with connected boxes
 */
export function generateBoxGrid(
    boxWidths: number[],
    boxDepths: number[],
    params: {
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean,
        boxColor: number,
        highlightColor: number,
        selectedBoxIndices: Set<number>,
        hiddenBoxes: Set<number>,
        connections: Map<number, number[]>
    }
): BoxInfo[] {
    const {
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        boxColor,
        highlightColor,
        selectedBoxIndices,
        hiddenBoxes,
        connections
    } = params;
    
    const numCols = boxWidths.length
    const numRows = boxDepths.length
    const totalWidth = calculateTotalWidth(boxWidths)
    const totalDepth = calculateTotalDepth(boxDepths)
    
    // Find connected groups
    const groups = findConnectedGroups(connections)
    
    // Create a map to track which group each box belongs to
    const boxToGroupMap = new Map<number, number>()
    for (const [groupId, group] of groups.entries()) {
        for (const boxIndex of group) {
            boxToGroupMap.set(boxIndex, groupId)
        }
    }
    
    // Result array of all box information
    const boxInfoArray: BoxInfo[] = []
    
    // Track processed positions to avoid duplicates
    const processedIndices = new Set<number>()
    
    // Handle combined box groups
    for (const [groupId, group] of groups.entries()) {
        // Skip if any box in the group is hidden
        const anyHidden = group.some(index => hiddenBoxes.has(index))
        if (anyHidden) {
            continue
        }
        
        // Calculate bounding box for the group
        const bounds = calculateGroupBounds(group, boxWidths, boxDepths, numCols)
        
        // Find the top-left box in the group to use as the primary
        const primaryIndex = group.reduce((minIndex, index) => {
            const row = Math.floor(index / numCols)
            const col = index % numCols
            const minRow = Math.floor(minIndex / numCols)
            const minCol = minIndex % numCols
            
            // Compare row first, then column
            if (row < minRow || (row === minRow && col < minCol)) {
                return index
            }
            return minIndex
        }, group[0])
        
        // Mark all boxes in the group as processed
        group.forEach(index => processedIndices.add(index))
        
        // Create a single box info for the entire group
        boxInfoArray.push({
            width: bounds.width,
            depth: bounds.depth,
            height,
            wallThickness,
            cornerRadius,
            hasBottom,
            x: bounds.startX,
            z: bounds.startZ,
            index: primaryIndex,
            color: selectedBoxIndices.has(primaryIndex) ? highlightColor : boxColor,
            visible: true,
            connections: group.filter(idx => idx !== primaryIndex), // Store connections
            isPartOfGroup: true,
            groupId
        })
        
        // Create placeholder entries for the remaining boxes in the group
        for (const index of group) {
            if (index === primaryIndex) continue
            
            const row = Math.floor(index / numCols)
            const col = index % numCols
            const boxX = -totalWidth / 2 + sumWidthsBeforeIndex(boxWidths, col)
            const boxZ = totalDepth / 2 - sumDepthsBeforeIndex(boxDepths, row)
            
            // Add an invisible placeholder
            boxInfoArray.push({
                width: boxWidths[col],
                depth: boxDepths[row],
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                x: boxX,
                z: boxZ,
                index,
                color: boxColor,
                visible: false, // Not visible as it's part of a combined group
                connections: [primaryIndex], // Connected to the primary box
                isPartOfGroup: true,
                groupId
            })
        }
    }
    
    // Handle regular (non-combined) boxes
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col
            
            // Skip if this box was already processed or is hidden
            if (processedIndices.has(index) || hiddenBoxes.has(index)) {
                continue
            }
            
            // Calculate position
            const startX = -totalWidth / 2 + sumWidthsBeforeIndex(boxWidths, col)
            const startZ = totalDepth / 2 - sumDepthsBeforeIndex(boxDepths, row)
            
            // Get connections for this box
            const boxConnections = connections.get(index) || []
            
            // Create the box info
            boxInfoArray.push({
                width: boxWidths[col],
                depth: boxDepths[row],
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                x: startX,
                z: startZ,
                index,
                color: selectedBoxIndices.has(index) ? highlightColor : boxColor,
                visible: true,
                connections: boxConnections,
                isPartOfGroup: false
            })
        }
    }
    
    // Add hidden boxes as placeholders
    for (const hiddenIndex of hiddenBoxes) {
        if (processedIndices.has(hiddenIndex)) continue
        
        const row = Math.floor(hiddenIndex / numCols)
        const col = hiddenIndex % numCols
        
        if (row < numRows && col < numCols) {
            const startX = -totalWidth / 2 + sumWidthsBeforeIndex(boxWidths, col)
            const startZ = totalDepth / 2 - sumDepthsBeforeIndex(boxDepths, row)
            
            boxInfoArray.push({
                width: boxWidths[col],
                depth: boxDepths[row],
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                x: startX,
                z: startZ,
                index: hiddenIndex,
                color: boxColor,
                visible: false,
                connections: [],
                isPartOfGroup: false
            })
            
            processedIndices.add(hiddenIndex)
        }
    }
    
    return boxInfoArray
}

/**
 * Create 3D boxes from box information and add them to the group
 */
export function createBoxesFromInfo(boxMeshGroup: THREE.Group, boxInfoArray: BoxInfo[]): void {
    // Clear existing boxes
    while (boxMeshGroup.children.length > 0) {
        boxMeshGroup.remove(boxMeshGroup.children[0])
    }
    
    // Sort boxes by index to ensure consistent ordering
    const sortedBoxInfo = [...boxInfoArray].sort((a, b) => a.index - b.index)
    
    // Create a box entry for every index
    const totalIndices = Math.max(...boxInfoArray.map(info => info.index), 0) + 1
    const boxObjects: (THREE.Object3D | null)[] = Array(totalIndices).fill(null)
    
    // Create and position all boxes
    for (const boxInfo of sortedBoxInfo) {
        // Skip invisible boxes but create a placeholder for proper indexing
        if (!boxInfo.visible) {
            const placeholder = new THREE.Group()
            placeholder.visible = false
            placeholder.userData = {
                dimensions: {
                    width: boxInfo.width,
                    depth: boxInfo.depth,
                    height: boxInfo.height,
                    index: boxInfo.index,
                    isHidden: true,
                    connections: boxInfo.connections,
                    isPartOfGroup: boxInfo.isPartOfGroup,
                    groupId: boxInfo.groupId
                }
            }
            placeholder.position.set(boxInfo.x, 0, boxInfo.z)
            boxObjects[boxInfo.index] = placeholder
            continue
        }
        
        // Create the visible box
        const box = generateBox({
            width: boxInfo.width,
            depth: boxInfo.depth,
            height: boxInfo.height,
            wallThickness: boxInfo.wallThickness,
            cornerRadius: boxInfo.cornerRadius,
            hasBottom: boxInfo.hasBottom,
            color: boxInfo.color
        })
        
        // Add metadata
        box.userData = {
            dimensions: {
                width: boxInfo.width,
                depth: boxInfo.depth,
                height: boxInfo.height,
                index: boxInfo.index,
                isHidden: false,
                isSelected: boxInfo.color === boxInfo.color, // Bit redundant but maintains compatibility
                connections: boxInfo.connections,
                isPartOfGroup: boxInfo.isPartOfGroup,
                groupId: boxInfo.groupId
            }
        }
        
        // Position the box
        box.position.set(boxInfo.x, 0, boxInfo.z)
        
        // Store in our array
        boxObjects[boxInfo.index] = box
    }
    
    // Add all boxes to the group in index order
    boxObjects.forEach(obj => {
        if (obj) {
            boxMeshGroup.add(obj)
        }
    })
}

/**
 * Generate box models and add them to the scene
 * Main entry point for the grid generator
 */
export function createBoxModelFromGrid(
    boxMeshGroup: THREE.Group | null,
    params: {
        boxWidths: number[],
        boxDepths: number[],
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean,
        selectedBoxIndices?: Set<number>,
        hiddenBoxes?: Set<number>,
        boxColor?: number,
        highlightColor?: number,
        combinedBoxes?: Map<number, { indices: number[], direction: string }>
    }
): void {
    if (!boxMeshGroup) return
    
    const {
        boxWidths,
        boxDepths,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        selectedBoxIndices = new Set<number>(),
        hiddenBoxes = new Set<number>(),
        boxColor = 0x7a9cbf,
        highlightColor = 0xf59e0b,
        combinedBoxes = new Map(),
    } = params
    
    try {
        if (
            height <= 0 ||
            wallThickness <= 0 ||
            cornerRadius < 0 ||
            boxWidths.length === 0 ||
            boxDepths.length === 0
        ) {
            console.warn('Invalid dimensions, skipping box creation')
            return
        }
        
        // Convert old combinedBoxes format to connections map
        const connections = convertCombinedBoxesToConnections(combinedBoxes)
        
        // Generate box information
        const boxInfoArray = generateBoxGrid(
            boxWidths,
            boxDepths,
            {
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                boxColor,
                highlightColor,
                selectedBoxIndices,
                hiddenBoxes,
                connections
            }
        )
        
        // Create boxes from info
        createBoxesFromInfo(boxMeshGroup, boxInfoArray)
        
    } catch (error) {
        console.error('Error creating box models:', error)
    }
}

/**
 * Convert the old combinedBoxes format to the new connections map
 */
function convertCombinedBoxesToConnections(
    combinedBoxes: Map<number, { indices: number[], direction: string }>
): Map<number, number[]> {
    const connections = new Map<number, number[]>()
    
    for (const [primaryIndex, info] of combinedBoxes.entries()) {
        const { indices, direction } = info
        
        // Add direct connections from primary to all secondary indices
        if (!connections.has(primaryIndex)) {
            connections.set(primaryIndex, [...indices])
        } else {
            const existingConnections = connections.get(primaryIndex)!
            const newConnections = [...existingConnections]
            
            for (const idx of indices) {
                if (!newConnections.includes(idx)) {
                    newConnections.push(idx)
                }
            }
            
            connections.set(primaryIndex, newConnections)
        }
        
        // Add connections between secondary indices if they're adjacent
        // This is a simplification assuming indices are in order
        if (direction === 'width' || direction === 'depth') {
            const sortedIndices = [...indices].sort((a, b) => a - b)
            
            for (let i = 0; i < sortedIndices.length - 1; i++) {
                const current = sortedIndices[i]
                const next = sortedIndices[i + 1]
                
                // Add bidirectional connections
                if (!connections.has(current)) {
                    connections.set(current, [next, primaryIndex])
                } else {
                    const existing = connections.get(current)!
                    if (!existing.includes(next)) {
                        connections.set(current, [...existing, next])
                    }
                    if (!existing.includes(primaryIndex)) {
                        connections.set(current, [...existing, primaryIndex])
                    }
                }
                
                if (!connections.has(next)) {
                    connections.set(next, [current, primaryIndex])
                } else {
                    const existing = connections.get(next)!
                    if (!existing.includes(current)) {
                        connections.set(next, [...existing, current])
                    }
                    if (!existing.includes(primaryIndex)) {
                        connections.set(next, [...existing, primaryIndex])
                    }
                }
            }
            
            // Make sure first and last also have connections to primary
            if (sortedIndices.length > 0) {
                const first = sortedIndices[0]
                if (!connections.has(first)) {
                    connections.set(first, [primaryIndex])
                } else if (!connections.get(first)!.includes(primaryIndex)) {
                    connections.set(first, [...connections.get(first)!, primaryIndex])
                }
                
                const last = sortedIndices[sortedIndices.length - 1]
                if (!connections.has(last)) {
                    connections.set(last, [primaryIndex])
                } else if (!connections.get(last)!.includes(primaryIndex)) {
                    connections.set(last, [...connections.get(last)!, primaryIndex])
                }
            }
        }
    }
    
    return connections
}

/**
 * Helper functions to manage box connections
 */

// Add a connection between two boxes
export function connectBoxes(connections: Map<number, number[]>, box1: number, box2: number): Map<number, number[]> {
    const newConnections = new Map(connections)
    
    // Add box2 to box1's connections
    if (!newConnections.has(box1)) {
        newConnections.set(box1, [box2])
    } else {
        const existing = newConnections.get(box1)!
        if (!existing.includes(box2)) {
            newConnections.set(box1, [...existing, box2])
        }
    }
    
    // Add box1 to box2's connections (bidirectional)
    if (!newConnections.has(box2)) {
        newConnections.set(box2, [box1])
    } else {
        const existing = newConnections.get(box2)!
        if (!existing.includes(box1)) {
            newConnections.set(box2, [...existing, box1])
        }
    }
    
    return newConnections
}

// Remove a connection between two boxes
export function disconnectBoxes(connections: Map<number, number[]>, box1: number, box2: number): Map<number, number[]> {
    const newConnections = new Map(connections)
    
    // Remove box2 from box1's connections
    if (newConnections.has(box1)) {
        const existing = newConnections.get(box1)!
        newConnections.set(box1, existing.filter(b => b !== box2))
    }
    
    // Remove box1 from box2's connections
    if (newConnections.has(box2)) {
        const existing = newConnections.get(box2)!
        newConnections.set(box2, existing.filter(b => b !== box1))
    }
    
    return newConnections
}

// Connect a set of boxes in a row or column
export function connectBoxesInLine(
    connections: Map<number, number[]>, 
    boxIndices: number[]
): Map<number, number[]> {
    let newConnections = new Map(connections)
    
    // Sort the indices (important for consistent connections)
    const sortedIndices = [...boxIndices].sort((a, b) => a - b)
    
    // Connect each box to the next one in sequence
    for (let i = 0; i < sortedIndices.length - 1; i++) {
        newConnections = connectBoxes(newConnections, sortedIndices[i], sortedIndices[i + 1])
    }
    
    return newConnections
}

// Check if two boxes are connected
export function areBoxesConnected(connections: Map<number, number[]>, box1: number, box2: number): boolean {
    const box1Connections = connections.get(box1) || []
    return box1Connections.includes(box2)
}

// Get all boxes in a connected group containing the specified box
export function getConnectedGroup(connections: Map<number, number[]>, startBox: number): number[] {
    const visited = new Set<number>()
    const group: number[] = []
    
    // Use breadth-first search to find all connected boxes
    const queue = [startBox]
    
    while (queue.length > 0) {
        const current = queue.shift()!
        
        if (visited.has(current)) continue
        
        visited.add(current)
        group.push(current)
        
        // Add all connected boxes to the queue
        const connectedBoxes = connections.get(current) || []
        for (const connectedIndex of connectedBoxes) {
            if (!visited.has(connectedIndex)) {
                queue.push(connectedIndex)
            }
        }
    }
    
    return group
}

// Clear all connections
export function clearConnections(): Map<number, number[]> {
    return new Map()
}

// Are the selected boxes in a valid configuration for combining?
export function canCombineBoxes(
    selectedIndices: number[],
    numCols: number
): boolean {
    if (selectedIndices.length < 2) return false
    
    // Check if boxes are in the same row or column
    const rows = new Set<number>()
    const cols = new Set<number>()
    
    for (const index of selectedIndices) {
        const row = Math.floor(index / numCols)
        const col = index % numCols
        rows.add(row)
        cols.add(col)
    }
    
    // If all boxes are in the same row
    if (rows.size === 1) {
        // Check if the columns are consecutive
        const sortedCols = Array.from(cols).sort((a, b) => a - b)
        
        for (let i = 1; i < sortedCols.length; i++) {
            if (sortedCols[i] !== sortedCols[i-1] + 1) {
                return false
            }
        }
        
        return true
    }
    
    // If all boxes are in the same column
    if (cols.size === 1) {
        // Check if the rows are consecutive
        const sortedRows = Array.from(rows).sort((a, b) => a - b)
        
        for (let i = 1; i < sortedRows.length; i++) {
            if (sortedRows[i] !== sortedRows[i-1] + 1) {
                return false
            }
        }
        
        return true
    }
    
    return false
}

/**
 * Set up the grid helper based on total dimensions
 */
export function setupGrid(
    scene: THREE.Scene | null,
    width: number,
    depth: number
): THREE.GridHelper | null {
    if (!scene) return null

    scene.children.forEach((child) => {
        if (child instanceof THREE.GridHelper) {
            scene.remove(child)
        }
    })

    const gridSize = Math.max(width, depth) + 50
    const gridHelper = new THREE.GridHelper(gridSize, Math.ceil(gridSize / 10))
    scene.add(gridHelper)

    return gridHelper
}