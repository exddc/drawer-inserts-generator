// src/lib/boxModelGenerator.ts
import * as THREE from 'three';

interface BoxParameters {
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
  cornerRadius: number;
  hasBottom: boolean;
}

/**
 * Create a box with rounded edges and optional bottom
 */
export function createBoxWithRoundedEdges({
  width,
  depth,
  height,
  wallThickness,
  cornerRadius,
  hasBottom
}: BoxParameters): THREE.Mesh | THREE.Group {
  // Create a group to hold meshes
  const meshGroup = new THREE.Group();
  
  // Create geometry based on whether we have a bottom or not
  if (hasBottom) {
    // Create side walls geometry
    const wallsShape = new THREE.Shape();
    // Outer path
    wallsShape.moveTo(cornerRadius, 0);
    wallsShape.lineTo(width - cornerRadius, 0);
    wallsShape.quadraticCurveTo(width, 0, width, cornerRadius);
    wallsShape.lineTo(width, depth - cornerRadius);
    wallsShape.quadraticCurveTo(width, depth, width - cornerRadius, depth);
    wallsShape.lineTo(cornerRadius, depth);
    wallsShape.quadraticCurveTo(0, depth, 0, depth - cornerRadius);
    wallsShape.lineTo(0, cornerRadius);
    wallsShape.quadraticCurveTo(0, 0, cornerRadius, 0);
    
    // Inner path (hole)
    const innerPath = new THREE.Path();
    innerPath.moveTo(wallThickness + cornerRadius, wallThickness);
    innerPath.lineTo(width - wallThickness - cornerRadius, wallThickness);
    innerPath.quadraticCurveTo(width - wallThickness, wallThickness, width - wallThickness, wallThickness + cornerRadius);
    innerPath.lineTo(width - wallThickness, depth - wallThickness - cornerRadius);
    innerPath.quadraticCurveTo(width - wallThickness, depth - wallThickness, width - wallThickness - cornerRadius, depth - wallThickness);
    innerPath.lineTo(wallThickness + cornerRadius, depth - wallThickness);
    innerPath.quadraticCurveTo(wallThickness, depth - wallThickness, wallThickness, depth - wallThickness - cornerRadius);
    innerPath.lineTo(wallThickness, wallThickness + cornerRadius);
    innerPath.quadraticCurveTo(wallThickness, wallThickness, wallThickness + cornerRadius, wallThickness);
    
    wallsShape.holes.push(innerPath);
    
    // Extrude settings for walls
    const wallsExtrudeSettings = {
      steps: 1,
      depth: height,
      bevelEnabled: false,
    };
    
    // Create the walls geometry
    const wallsGeometry = new THREE.ExtrudeGeometry(wallsShape, wallsExtrudeSettings);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x7A9CBF,
      roughness: 0.4,
      metalness: 0.2,
    });
    
    // Create walls mesh
    const wallsMesh = new THREE.Mesh(wallsGeometry, material);
    wallsMesh.castShadow = true;
    wallsMesh.receiveShadow = true;
    
    // Add the walls mesh to the group
    meshGroup.add(wallsMesh);
    
    // Create bottom with the same corner radius as the box
    const bottomShape = new THREE.Shape();
    
    // Outer path with rounded corners for bottom
    bottomShape.moveTo(cornerRadius, 0);
    bottomShape.lineTo(width - cornerRadius, 0);
    bottomShape.quadraticCurveTo(width, 0, width, cornerRadius);
    bottomShape.lineTo(width, depth - cornerRadius);
    bottomShape.quadraticCurveTo(width, depth, width - cornerRadius, depth);
    bottomShape.lineTo(cornerRadius, depth);
    bottomShape.quadraticCurveTo(0, depth, 0, depth - cornerRadius);
    bottomShape.lineTo(0, cornerRadius);
    bottomShape.quadraticCurveTo(0, 0, cornerRadius, 0);
    
    // Inner path with rounded corners for inner walls
    const bottomInnerPath = new THREE.Path();
    bottomInnerPath.moveTo(wallThickness + cornerRadius, wallThickness);
    bottomInnerPath.lineTo(width - wallThickness - cornerRadius, wallThickness);
    bottomInnerPath.quadraticCurveTo(width - wallThickness, wallThickness, width - wallThickness, wallThickness + cornerRadius);
    bottomInnerPath.lineTo(width - wallThickness, depth - wallThickness - cornerRadius);
    bottomInnerPath.quadraticCurveTo(width - wallThickness, depth - wallThickness, width - wallThickness - cornerRadius, depth - wallThickness);
    bottomInnerPath.lineTo(wallThickness + cornerRadius, depth - wallThickness);
    bottomInnerPath.quadraticCurveTo(wallThickness, depth - wallThickness, wallThickness, depth - wallThickness - cornerRadius);
    bottomInnerPath.lineTo(wallThickness, wallThickness + cornerRadius);
    bottomInnerPath.quadraticCurveTo(wallThickness, wallThickness, wallThickness + cornerRadius, wallThickness);
    
    // Extrude the bottom by wallThickness height
    const bottomExtrudeSettings = {
      steps: 1,
      depth: wallThickness,
      bevelEnabled: false,
    };
    
    const bottomGeometry = new THREE.ExtrudeGeometry(bottomShape, bottomExtrudeSettings);
    const bottomMesh = new THREE.Mesh(bottomGeometry, material);
    bottomMesh.castShadow = true;
    bottomMesh.receiveShadow = true;
    
    // Add bottom mesh to the group
    meshGroup.add(bottomMesh);
    
    // Rotate the entire group to lay flat on x-y plane
    meshGroup.rotation.x = -Math.PI / 2;
    
    // Position centered horizontally with z=0 (as requested)
    meshGroup.position.set(-width / 2, 0, 0);
    
    return meshGroup;
  } else {
    // For no bottom, create a simple extruded shape with a hole through it
    const outerBox = new THREE.Shape();
    outerBox.moveTo(cornerRadius, 0);
    outerBox.lineTo(width - cornerRadius, 0);
    outerBox.quadraticCurveTo(width, 0, width, cornerRadius);
    outerBox.lineTo(width, depth - cornerRadius);
    outerBox.quadraticCurveTo(width, depth, width - cornerRadius, depth);
    outerBox.lineTo(cornerRadius, depth);
    outerBox.quadraticCurveTo(0, depth, 0, depth - cornerRadius);
    outerBox.lineTo(0, cornerRadius);
    outerBox.quadraticCurveTo(0, 0, cornerRadius, 0);
    
    // Create the hole for the inner box
    const innerBox = new THREE.Path();
    innerBox.moveTo(wallThickness + cornerRadius, wallThickness);
    innerBox.lineTo(width - wallThickness - cornerRadius, wallThickness);
    innerBox.quadraticCurveTo(width - wallThickness, wallThickness, width - wallThickness, wallThickness + cornerRadius);
    innerBox.lineTo(width - wallThickness, depth - wallThickness - cornerRadius);
    innerBox.quadraticCurveTo(width - wallThickness, depth - wallThickness, width - wallThickness - cornerRadius, depth - wallThickness);
    innerBox.lineTo(wallThickness + cornerRadius, depth - wallThickness);
    innerBox.quadraticCurveTo(wallThickness, depth - wallThickness, wallThickness, depth - wallThickness - cornerRadius);
    innerBox.lineTo(wallThickness, wallThickness + cornerRadius);
    innerBox.quadraticCurveTo(wallThickness, wallThickness, wallThickness + cornerRadius, wallThickness);
    
    // Add the inner hole
    outerBox.holes.push(innerBox);
    
    // Extrude the shape to create a 3D object
    const extrudeSettings = {
      steps: 1,
      depth: height,
      bevelEnabled: false,
    };
    
    const geometry = new THREE.ExtrudeGeometry(outerBox, extrudeSettings);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x7A9CBF,
      roughness: 0.4,
      metalness: 0.2,
    });
    
    // Create and return the mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Rotate to lay flat on the x-y plane
    mesh.rotation.x = -Math.PI / 2;
    
    // Position centered horizontally with z=0 (as requested)
    mesh.position.set(-width / 2, 0, 0);
    
    return mesh;
  }
}