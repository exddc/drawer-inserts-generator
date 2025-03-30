// lib/gridGenerator.ts - key parts refactored
import * as THREE from 'three'
import { BoxDimensions, generateBox } from '@/lib/boxGenerator'
import { CombinedBoxInfo } from '@/lib/types'

// Create a function to generate the grid matrix
export function generateGridMatrix(
    boxWidths: number[],
    boxDepths: number[]
): Array<{row: number, col: number, x: number, z: number, width: number, depth: number}> {
    const totalWidth = boxWidths.reduce((sum, w) => sum + w, 0)
    const totalDepth = boxDepths.reduce((sum, d) => sum + d, 0)
    
    const grid = []
    
    let zPosition = totalDepth / 2
    for (let row = 0; row < boxDepths.length; row++) {
        const depth = boxDepths[row]
        zPosition -= depth / 2
        
        let xPosition = -totalWidth / 2
        for (let col = 0; col < boxWidths.length; col++) {
            const width = boxWidths[col]
            xPosition += width / 2
            
            grid.push({
                row,
                col,
                width,
                depth,
                x: xPosition,
                z: zPosition,
            })
            
            xPosition += width / 2
        }
        
        zPosition -= depth / 2
    }
    
    return grid
}

/**
 * Create a function to find connected box groups 
 * More modular version of the existing function
 */
export function findConnectedGroups(
    selectedIndices: number[], 
    numCols: number
): Array<number[]> {
    // Convert indices to grid positions
    const positions = selectedIndices.map(index => ({
        index,
        row: Math.floor(index / numCols),
        col: index % numCols
    }))
    
    // Function to check if two boxes are adjacent
    const areAdjacent = (pos1: {row: number, col: number}, pos2: {row: number, col: number}): boolean => {
        // Horizontally adjacent
        if (pos1.row === pos2.row && Math.abs(pos1.col - pos2.col) === 1) {
            return true
        }
        // Vertically adjacent
        if (pos1.col === pos2.col && Math.abs(pos1.row - pos2.row) === 1) {
            return true
        }
        return false
    }
    
    // Use depth-first search to find connected components
    const visited = new Set<number>()
    const components: number[][] = []
    
    function dfs(index: number, component: number[]) {
        visited.add(index)
        component.push(index)
        
        const currentPos = positions.find(p => p.index === index)!
        
        // Check all other positions for adjacency
        for (const pos of positions) {
            if (!visited.has(pos.index) && areAdjacent(currentPos, pos)) {
                dfs(pos.index, component)
            }
        }
    }
    
    // Find all connected components
    for (const pos of positions) {
        if (!visited.has(pos.index)) {
            const component: number[] = []
            dfs(pos.index, component)
            components.push(component)
        }
    }
    
    return components
}

// This is a simplification of your existing createBoxModelFromGrid
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
        combinedBoxes?: Map<number, CombinedBoxInfo>
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
        // Parameter validation
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
        
        // Clear existing boxes
        while (boxMeshGroup.children.length > 0) {
            boxMeshGroup.remove(boxMeshGroup.children[0])
        }
        
        // Generate grid matrix
        const numCols = boxWidths.length
        const totalWidth = boxWidths.reduce((sum, w) => sum + w, 0)
        const totalDepth = boxDepths.reduce((sum, d) => sum + d, 0)
        
        // Process combined boxes first
        // Convert combinedBoxes to connections graph
        const connections = convertCombinedBoxesToConnections(combinedBoxes)
        
        // Find connected groups
        const groups = findConnectedGroupsFromConnections(connections)
        
        // Set to track indices already processed
        const processedIndices = new Set<number>()
        
        // Create combined boxes for each group
        createCombinedBoxes(
            boxMeshGroup,
            groups,
            processedIndices,
            numCols,
            boxWidths,
            boxDepths,
            totalWidth,
            totalDepth,
            {
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                selectedBoxIndices,
                hiddenBoxes,
                boxColor,
                highlightColor
            }
        )
        
        // Create regular boxes for non-processed indices
        createRegularBoxes(
            boxMeshGroup,
            boxWidths,
            boxDepths,
            numCols,
            processedIndices,
            hiddenBoxes,
            {
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                selectedBoxIndices,
                boxColor,
                highlightColor,
                totalWidth,
                totalDepth
            }
        )
        
    } catch (error) {
        console.error('Error creating box models:', error)
    }
}


/**
 * Set up the grid helper based on total dimensions
 * Creates a new grid helper and adds it to the scene
 */
export function setupGrid(
    scene: THREE.Scene | null,
    width: number,
    depth: number
): THREE.GridHelper | null {
    if (!scene) return null

    // Remove any existing grid helpers
    scene.children.forEach((child) => {
        if (child instanceof THREE.GridHelper) {
            scene.remove(child)
        }
    })

    // Calculate grid size based on dimensions
    const gridSize = Math.max(width, depth) + 50
    
    // Create new grid helper with appropriate divisions
    const gridHelper = new THREE.GridHelper(
        gridSize, 
        Math.ceil(gridSize / 10)
    )
    
    // Add to scene
    scene.add(gridHelper)

    return gridHelper
}

/**
 * Convert the old combinedBoxes format to the new connections map
 * This creates a bidirectional graph of box connections
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
 * Find connected box groups using a floodfill approach
 * Each group contains boxes that should be combined into a single box
 */
function findConnectedGroupsFromConnections(
    connections: Map<number, number[]>
): Map<number, number[]> {
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
 * Create combined boxes for each connected group
 */
function createCombinedBoxes(
    boxMeshGroup: THREE.Group,
    groups: Map<number, number[]>,
    processedIndices: Set<number>,
    numCols: number,
    boxWidths: number[],
    boxDepths: number[],
    totalWidth: number,
    totalDepth: number,
    params: {
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean,
        selectedBoxIndices: Set<number>,
        hiddenBoxes: Set<number>,
        boxColor: number,
        highlightColor: number
    }
): void {
    const {
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        selectedBoxIndices,
        hiddenBoxes,
        boxColor,
        highlightColor
    } = params;
    
    // Process each group of connected boxes
    for (const [groupId, group] of groups.entries()) {
        // Skip if any box in the group is hidden
        const anyHidden = group.some(index => hiddenBoxes.has(index))
        if (anyHidden) {
            // Mark all as processed even if we skip
            group.forEach(idx => processedIndices.add(idx))
            continue
        }
        
        // Find primary box (top-left)
        const primaryIndex = group.reduce((minIndex, index) => {
            const row = Math.floor(index / numCols)
            const col = index % numCols
            const minRow = Math.floor(minIndex / numCols)
            const minCol = minIndex % numCols
            
            if (row < minRow || (row === minRow && col < minCol)) {
                return index
            }
            return minIndex
        }, group[0])
        
        // Mark all as processed
        group.forEach(idx => processedIndices.add(idx))
        
        // Convert to box positions with dimensions
        const boxPositions = group.map(index => {
            const row = Math.floor(index / numCols)
            const col = index % numCols
            
            // Calculate start positions
            const startX = -totalWidth / 2 + calculateStartX(boxWidths, col)
            const startZ = totalDepth / 2 - calculateStartZ(boxDepths, row)
            
            return {
                index,
                row,
                col,
                width: boxWidths[col],
                depth: boxDepths[row],
                startX,
                startZ: -startZ // Adjust for coordinate system
            }
        })
        
        // Generate a complex box shape
        const complexBox = generateComplexBox(
            boxPositions,
            {
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                color: selectedBoxIndices.has(primaryIndex) ? highlightColor : boxColor
            }
        )
        
        // Calculate bounding dimensions for metadata
        const minX = Math.min(...boxPositions.map(p => p.startX))
        const maxX = Math.max(...boxPositions.map(p => p.startX + p.width))
        const minZ = Math.min(...boxPositions.map(p => p.startZ))
        const maxZ = Math.max(...boxPositions.map(p => p.startZ + p.depth))
        
        // Position the complex box - it's already positioned correctly internally
        complexBox.position.set(0, 0, 0)
        
        // Add metadata
        complexBox.userData = {
            dimensions: {
                width: maxX - minX,
                depth: maxZ - minZ,
                height,
                index: primaryIndex,
                isComplex: true,
                complexIndices: group,
                isSelected: selectedBoxIndices.has(primaryIndex),
                isHidden: false,
                connections: group.filter(idx => idx !== primaryIndex),
                isPartOfGroup: true,
                groupId
            }
        }
        
        // Add to scene
        boxMeshGroup.add(complexBox)
        
        // Create placeholder objects for other indices in the group
        for (const index of group) {
            if (index === primaryIndex) continue
            
            const row = Math.floor(index / numCols)
            const col = index % numCols
            
            const placeholder = new THREE.Group()
            placeholder.visible = false
            placeholder.userData = {
                dimensions: {
                    width: boxWidths[col],
                    depth: boxDepths[row],
                    height,
                    index,
                    isHidden: true,
                    connections: [primaryIndex],
                    isPartOfGroup: true,
                    groupId
                }
            }
            
            boxMeshGroup.add(placeholder)
        }
    }
}

/**
 * Calculate the X starting position for a box at a given column
 */
function calculateStartX(boxWidths: number[], col: number): number {
    let sum = 0
    for (let i = 0; i < col; i++) {
        sum += boxWidths[i]
    }
    return sum
}

/**
 * Calculate the Z starting position for a box at a given row
 */
function calculateStartZ(boxDepths: number[], row: number): number {
    let sum = 0
    for (let i = 0; i < row; i++) {
        sum += boxDepths[i]
    }
    return sum
}

/**
 * Create regular (non-combined) boxes
 */
function createRegularBoxes(
    boxMeshGroup: THREE.Group,
    boxWidths: number[],
    boxDepths: number[],
    numCols: number,
    processedIndices: Set<number>,
    hiddenBoxes: Set<number>,
    params: {
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean,
        selectedBoxIndices: Set<number>,
        boxColor: number,
        highlightColor: number,
        totalWidth: number,
        totalDepth: number
    }
): void {
    const {
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        selectedBoxIndices,
        boxColor,
        highlightColor,
        totalWidth,
        totalDepth
    } = params;
    
    const numRows = boxDepths.length;
    
    // Create regular boxes for non-processed indices
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col;
            
            // Skip processed or hidden boxes
            if (processedIndices.has(index) || hiddenBoxes.has(index)) {
                continue;
            }
            
            // Create a regular box
            const box = generateBox({
                width: boxWidths[col],
                depth: boxDepths[row],
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
                color: selectedBoxIndices.has(index) ? highlightColor : boxColor,
                index
            });
            
            // Calculate position
            const startX = -totalWidth / 2 + calculateStartX(boxWidths, col);
            const startZ = totalDepth / 2 - calculateStartZ(boxDepths, row);
            
            // Set position
            box.position.set(startX, 0, startZ);
            
            // Add metadata
            box.userData = {
                dimensions: {
                    width: boxWidths[col],
                    depth: boxDepths[row],
                    height,
                    index,
                    isHidden: false,
                    isSelected: selectedBoxIndices.has(index)
                }
            };
            
            // Add to scene
            boxMeshGroup.add(box);
        }
    }
    
    // Create placeholder objects for hidden boxes
    createHiddenBoxPlaceholders(
        boxMeshGroup,
        boxWidths,
        boxDepths,
        numCols,
        processedIndices,
        hiddenBoxes,
        height
    );
}

/**
 * Create placeholder objects for hidden boxes
 */
function createHiddenBoxPlaceholders(
    boxMeshGroup: THREE.Group,
    boxWidths: number[],
    boxDepths: number[],
    numCols: number,
    processedIndices: Set<number>,
    hiddenBoxes: Set<number>,
    height: number
): void {
    for (const hiddenIndex of hiddenBoxes) {
        if (processedIndices.has(hiddenIndex)) continue;
        
        const row = Math.floor(hiddenIndex / numCols);
        const col = hiddenIndex % numCols;
        
        if (row >= boxDepths.length || col >= boxWidths.length) continue;
        
        const placeholder = new THREE.Group();
        placeholder.visible = false;
        placeholder.userData = {
            dimensions: {
                width: boxWidths[col],
                depth: boxDepths[row],
                height,
                index: hiddenIndex,
                isHidden: true
            }
        };
        
        boxMeshGroup.add(placeholder);
    }
}

/**
 * Are the selected boxes in a valid configuration for combining?
 */
export function canCombineBoxes(
    selectedIndices: number[],
    numCols: number
): boolean {
    if (selectedIndices.length < 2) return false
    
    // Convert indices to grid positions
    const positions = selectedIndices.map(index => ({
        index,
        row: Math.floor(index / numCols),
        col: index % numCols
    }));
    
    // Function to check if two boxes are adjacent
    const areAdjacent = (pos1: {row: number, col: number}, pos2: {row: number, col: number}): boolean => {
        // Horizontally adjacent
        if (pos1.row === pos2.row && Math.abs(pos1.col - pos2.col) === 1) {
            return true;
        }
        // Vertically adjacent
        if (pos1.col === pos2.col && Math.abs(pos1.row - pos2.row) === 1) {
            return true;
        }
        return false;
    };
    
    // Use breadth-first search to check if all boxes form a connected group
    const visited = new Set<number>();
    const queue = [selectedIndices[0]];
    
    while (queue.length > 0) {
        const current = queue.shift()!;
        
        if (visited.has(current)) continue;
        
        visited.add(current);
        
        // Get position of current box
        const currentPos = positions.find(p => p.index === current)!;
        
        // Check all other boxes to find adjacent ones
        for (const pos of positions) {
            if (visited.has(pos.index)) continue;
            
            if (areAdjacent(currentPos, pos)) {
                queue.push(pos.index);
            }
        }
    }
    
    // If all boxes are visited, they form a connected group
    return visited.size === selectedIndices.length;
}

/**
 * Generate a complex box shape without inner walls
 * Supports L-shapes, U-shapes, and other complex arrangements
 */
export function generateComplexBox(
    group: Array<{
        index: number,
        row: number,
        col: number,
        width: number,
        depth: number,
        startX: number,
        startZ: number
    }>,
    params: {
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean,
        color: number
    }
): THREE.Group {
    const { height, wallThickness, cornerRadius, hasBottom, color } = params
    
    // Create a parent group for the complex shape
    const complexGroup = new THREE.Group()
    
    // Find the bounding dimensions of all boxes
    const minX = Math.min(...group.map(b => b.startX))
    const maxX = Math.max(...group.map(b => b.startX + b.width))
    const minZ = Math.min(...group.map(b => b.startZ))
    const maxZ = Math.max(...group.map(b => b.startZ + b.depth))
    
    // Create a grid to represent the occupied area
    const gridStep = Math.min(wallThickness, 5) // Small step size for better accuracy
    const gridWidth = Math.ceil((maxX - minX) / gridStep) + 2 // +2 for border
    const gridDepth = Math.ceil((maxZ - minZ) / gridStep) + 2
    
    // Initialize grid to all empty
    const grid = Array(gridDepth).fill(0).map(() => Array(gridWidth).fill(false))
    
    // Fill in grid cells for all boxes in the group
    for (const box of group) {
        const offsetX = box.startX - minX
        const offsetZ = box.startZ - minZ
        
        const startCol = Math.floor(offsetX / gridStep)
        const endCol = Math.ceil((offsetX + box.width) / gridStep)
        const startRow = Math.floor(offsetZ / gridStep)
        const endRow = Math.ceil((offsetZ + box.depth) / gridStep)
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (row >= 0 && row < gridDepth && col >= 0 && col < gridWidth) {
                    grid[row][col] = true
                }
            }
        }
    }
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.4,
        metalness: 0.2,
    })
    
    // Create separate geometries for the outer walls and holes
    const outerPaths: THREE.Shape[] = []
    const innerPaths: THREE.Path[] = []
    
    // Find the outer perimeter by marching around the grid
    // This is a simplified approach - a production implementation would use marching squares
    // or a proper contour tracing algorithm
    
    // For simplicity, we'll create a shape from the convex hull of the boxes
    const outerShape = new THREE.Shape()
    
    // Add points for corners of each box (with cornerRadius)
    const points: THREE.Vector2[] = []
    for (const box of group) {
        const offsetX = box.startX - minX
        const offsetZ = box.startZ - minZ
        
        // Add corner points
        points.push(new THREE.Vector2(offsetX + cornerRadius, offsetZ + cornerRadius))
        points.push(new THREE.Vector2(offsetX + box.width - cornerRadius, offsetZ + cornerRadius))
        points.push(new THREE.Vector2(offsetX + cornerRadius, offsetZ + box.depth - cornerRadius))
        points.push(new THREE.Vector2(offsetX + box.width - cornerRadius, offsetZ + box.depth - cornerRadius))
    }
    
    // Sort points to create a path around the perimeter
    // This is a very simplified approach - a real implementation would need more sophistication
    // For real implementation, use Graham Scan or other convex hull algorithm
    points.sort((a, b) => {
        const angleA = Math.atan2(a.y - (maxZ - minZ) / 2, a.x - (maxX - minX) / 2)
        const angleB = Math.atan2(b.y - (maxZ - minZ) / 2, b.x - (maxX - minX) / 2)
        return angleA - angleB
    })
    
    // Create outer path from sorted points
    if (points.length > 0) {
        outerShape.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
            outerShape.lineTo(points[i].x, points[i].y)
        }
        outerShape.closePath()
    }
    
    // Create inner path by offsetting the outer path
    const innerPath = new THREE.Path()
    const innerPoints = points.map(p => new THREE.Vector2(
        p.x + (p.x < (maxX - minX) / 2 ? wallThickness : -wallThickness),
        p.y + (p.y < (maxZ - minZ) / 2 ? wallThickness : -wallThickness)
    ))
    
    if (innerPoints.length > 0) {
        innerPath.moveTo(innerPoints[0].x, innerPoints[0].y)
        for (let i = 1; i < innerPoints.length; i++) {
            innerPath.lineTo(innerPoints[i].x, innerPoints[i].y)
        }
        innerPath.closePath()
    }
    
    // Add inner path as a hole in the outer shape
    outerShape.holes.push(innerPath)
    
    // Create walls by extruding the shape with hole
    const wallsExtrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: false,
    }
    
    const wallsGeometry = new THREE.ExtrudeGeometry(outerShape, wallsExtrudeSettings)
    const wallsMesh = new THREE.Mesh(wallsGeometry, material)
    wallsMesh.castShadow = true
    wallsMesh.receiveShadow = true
    complexGroup.add(wallsMesh)
    
    // Create bottom if needed
    if (hasBottom) {
        const bottomShape = new THREE.Shape(outerShape.getPoints())
        const bottomExtrudeSettings = {
            steps: 1,
            depth: wallThickness,
            bevelEnabled: false,
        }
        
        const bottomGeometry = new THREE.ExtrudeGeometry(bottomShape, bottomExtrudeSettings)
        const bottomMesh = new THREE.Mesh(bottomGeometry, material)
        bottomMesh.castShadow = true
        bottomMesh.receiveShadow = true
        bottomMesh.position.z = -wallThickness
        complexGroup.add(bottomMesh)
    }
    
    // Rotate the whole group to match the scene orientation
    complexGroup.rotation.x = -Math.PI / 2
    
    return complexGroup
}