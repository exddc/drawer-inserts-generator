import * as THREE from 'three';

/**
 * Creates a single wall with specified dimensions
 * @param {number} width - Width of the wall
 * @param {number} height - Height of the wall
 * @param {number} thickness - Thickness of the wall
 * @param {THREE.Material} material - Material to use for the wall
 * @returns {THREE.Mesh} - The wall mesh
 */
export function createWall(width, height, thickness, material) {
  const geometry = new THREE.BoxGeometry(width, height, thickness);
  const wall = new THREE.Mesh(geometry, material);
  wall.castShadow = true;
  wall.receiveShadow = true;
  return wall;
}

/**
 * Creates the outer shape of the box (for compatibility with the original function)
 * This function is no longer used for wall generation
 */
export function createOuterShape(width, depth, cornerRadius, excludeWalls = []) {
  console.warn('createOuterShape is deprecated. Use individual walls instead.');
  return new THREE.Shape();
}

/**
 * Creates the inner shape of the box (for compatibility with the original function)
 * This function is no longer used for wall generation
 */
export function createInnerShape(width, depth, wallThickness, cornerRadius, excludeWalls = []) {
  console.warn('createInnerShape is deprecated. Use individual walls instead.');
  return new THREE.Path();
}

/**
 * Creates a complete box with individual walls, excluding specified walls
 * @param {object} dimensions - Box dimensions object
 * @param {string[]} excludeWalls - Array of walls to exclude
 * @returns {THREE.Group} - Group containing all the walls
 */
export function createBoxWalls(dimensions, excludeWalls = []) {
  const {
    width,
    depth,
    height,
    wallThickness,
    color = 0x7a9cbf,
  } = dimensions;
  
  const wallsGroup = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.4,
    metalness: 0.2,
  });
  
  // Half dimensions for positioning
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const halfHeight = height / 2;
  
  // Create and position each wall if it's not excluded
  
  // Front wall (positive Z)
  if (!excludeWalls.includes('front')) {
    const frontWall = createWall(width, height, wallThickness, material);
    frontWall.position.set(0, halfHeight, halfDepth - (wallThickness / 2));
    wallsGroup.add(frontWall);
  }
  
  // Back wall (negative Z)
  if (!excludeWalls.includes('back')) {
    const backWall = createWall(width, height, wallThickness, material);
    backWall.position.set(0, halfHeight, -halfDepth + (wallThickness / 2));
    wallsGroup.add(backWall);
  }
  
  // Left wall (negative X)
  if (!excludeWalls.includes('left')) {
    const leftWall = createWall(wallThickness, height, depth - (2 * wallThickness), material);
    leftWall.position.set(-halfWidth + (wallThickness / 2), halfHeight, 0);
    wallsGroup.add(leftWall);
  }
  
  // Right wall (positive X)
  if (!excludeWalls.includes('right')) {
    const rightWall = createWall(wallThickness, height, depth - (2 * wallThickness), material);
    rightWall.position.set(halfWidth - (wallThickness / 2), halfHeight, 0);
    wallsGroup.add(rightWall);
  }
  
  // Bottom (if needed)
  if (dimensions.hasBottom) {
    const bottomWall = createWall(width, wallThickness, depth, material);
    bottomWall.position.set(0, wallThickness / 2, 0);
    wallsGroup.add(bottomWall);
  }

  
  return wallsGroup;
}