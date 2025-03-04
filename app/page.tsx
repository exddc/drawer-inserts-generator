'use client';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';

// Define the form input types
interface FormInputs {
    width: number;
    depth: number;
    height: number;
    wallThickness: number;
    cornerRadius: number;
    hasBottom: boolean;
}

// Default values
const defaultInputs: FormInputs = {
    width: 100,
    depth: 150,
    height: 50,
    wallThickness: 2,
    cornerRadius: 5,
    hasBottom: true,
};

// Input constraints
const constraints = {
    width: { min: 10, max: 500 },
    depth: { min: 10, max: 500 },
    height: { min: 5, max: 300 },
    wallThickness: { min: 0.5, max: 10 },
    cornerRadius: { min: 0, max: 50 },
};

export default function Home() {
    // State for form inputs
    const [inputs, setInputs] = useState<FormInputs>(defaultInputs);

    // Refs for Three.js
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const boxMeshRef = useRef<THREE.Mesh | null>(null);

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let newValue = parseFloat(value);

        // Apply constraints
        if (constraints.hasOwnProperty(name)) {
            const { min, max } = constraints[name as keyof typeof constraints];

            // Special case for height when bottom is enabled
            if (name === 'height' && inputs.hasBottom) {
                // If we have a bottom, ensure height is at least wallThickness + 1mm
                const minHeight = Math.max(min, inputs.wallThickness + 1);
                newValue = Math.max(minHeight, Math.min(newValue, max));
            } else {
                newValue = Math.max(min, Math.min(newValue, max));
            }

            // Validate cornerRadius can't be larger than half of width or depth minus wallThickness
            if (name === 'cornerRadius') {
                const maxCornerX =
                    (inputs.width - 2 * inputs.wallThickness) / 2;
                const maxCornerY =
                    (inputs.depth - 2 * inputs.wallThickness) / 2;
                const maxCorner = Math.min(maxCornerX, maxCornerY, max);
                newValue = Math.min(newValue, maxCorner);
            }
        }

        setInputs((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    // Handle checkbox change
    const handleCheckboxChange = (checked: boolean) => {
        setInputs((prev) => {
            // If enabling bottom, ensure height is at least wallThickness + 1mm
            let updatedHeight = prev.height;
            if (checked && prev.height <= prev.wallThickness) {
                updatedHeight = prev.wallThickness + 1;
            }

            return {
                ...prev,
                hasBottom: checked,
                height: updatedHeight,
            };
        });
    };

    // Initialize Three.js
    useEffect(() => {
        if (!containerRef.current) return;

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        sceneRef.current = scene;

        // Create camera
        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth /
                containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(150, 150, 150);
        cameraRef.current = camera;

        // Create renderer with transparent background for glassy look
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setSize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
        );
        renderer.shadowMap.enabled = true;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Add orbit controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(150, 200, 100);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Add second light from different angle for better shadows
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-150, 50, -100);
        directionalLight2.castShadow = true;
        scene.add(directionalLight2);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(200, 20);
        scene.add(gridHelper);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(100);
        scene.add(axesHelper);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        // Handle window resize
        const handleResize = () => {
            if (
                !containerRef.current ||
                !cameraRef.current ||
                !rendererRef.current
            )
                return;

            cameraRef.current.aspect =
                containerRef.current.clientWidth /
                containerRef.current.clientHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
            );
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(
                    rendererRef.current.domElement
                );
            }
        };
    }, []);

    // Update the box when inputs change
    useEffect(() => {
        if (!sceneRef.current) return;

        // Remove previous box if it exists
        if (boxMeshRef.current) {
            sceneRef.current.remove(boxMeshRef.current);
        }

        // Create new box based on inputs
        const { width, depth, height, wallThickness, cornerRadius, hasBottom } =
            inputs;
        const box = createBoxWithRoundedEdges(
            width,
            depth,
            height,
            wallThickness,
            cornerRadius,
            hasBottom
        );
        sceneRef.current.add(box);
        boxMeshRef.current = box;
    }, [inputs]);

    // Function to create a box with rounded edges
    const createBoxWithRoundedEdges = (
        width: number,
        depth: number,
        height: number,
        wallThickness: number,
        cornerRadius: number,
        hasBottom: boolean
    ): THREE.Mesh | THREE.Group => {
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
            wallsShape.quadraticCurveTo(
                width,
                depth,
                width - cornerRadius,
                depth
            );
            wallsShape.lineTo(cornerRadius, depth);
            wallsShape.quadraticCurveTo(0, depth, 0, depth - cornerRadius);
            wallsShape.lineTo(0, cornerRadius);
            wallsShape.quadraticCurveTo(0, 0, cornerRadius, 0);

            // Inner path (hole)
            const innerPath = new THREE.Path();
            innerPath.moveTo(wallThickness + cornerRadius, wallThickness);
            innerPath.lineTo(
                width - wallThickness - cornerRadius,
                wallThickness
            );
            innerPath.quadraticCurveTo(
                width - wallThickness,
                wallThickness,
                width - wallThickness,
                wallThickness + cornerRadius
            );
            innerPath.lineTo(
                width - wallThickness,
                depth - wallThickness - cornerRadius
            );
            innerPath.quadraticCurveTo(
                width - wallThickness,
                depth - wallThickness,
                width - wallThickness - cornerRadius,
                depth - wallThickness
            );
            innerPath.lineTo(
                wallThickness + cornerRadius,
                depth - wallThickness
            );
            innerPath.quadraticCurveTo(
                wallThickness,
                depth - wallThickness,
                wallThickness,
                depth - wallThickness - cornerRadius
            );
            innerPath.lineTo(wallThickness, wallThickness + cornerRadius);
            innerPath.quadraticCurveTo(
                wallThickness,
                wallThickness,
                wallThickness + cornerRadius,
                wallThickness
            );

            wallsShape.holes.push(innerPath);

            // Extrude settings for walls
            const wallsExtrudeSettings = {
                steps: 1,
                depth: height,
                bevelEnabled: false,
            };

            // Create the walls geometry
            const wallsGeometry = new THREE.ExtrudeGeometry(
                wallsShape,
                wallsExtrudeSettings
            );

            // Create material
            const material = new THREE.MeshStandardMaterial({
                color: 0x7a9cbf,
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
            bottomShape.quadraticCurveTo(
                width,
                depth,
                width - cornerRadius,
                depth
            );
            bottomShape.lineTo(cornerRadius, depth);
            bottomShape.quadraticCurveTo(0, depth, 0, depth - cornerRadius);
            bottomShape.lineTo(0, cornerRadius);
            bottomShape.quadraticCurveTo(0, 0, cornerRadius, 0);

            // Inner path with rounded corners for inner walls
            const bottomInnerPath = new THREE.Path();
            bottomInnerPath.moveTo(wallThickness + cornerRadius, wallThickness);
            bottomInnerPath.lineTo(
                width - wallThickness - cornerRadius,
                wallThickness
            );
            bottomInnerPath.quadraticCurveTo(
                width - wallThickness,
                wallThickness,
                width - wallThickness,
                wallThickness + cornerRadius
            );
            bottomInnerPath.lineTo(
                width - wallThickness,
                depth - wallThickness - cornerRadius
            );
            bottomInnerPath.quadraticCurveTo(
                width - wallThickness,
                depth - wallThickness,
                width - wallThickness - cornerRadius,
                depth - wallThickness
            );
            bottomInnerPath.lineTo(
                wallThickness + cornerRadius,
                depth - wallThickness
            );
            bottomInnerPath.quadraticCurveTo(
                wallThickness,
                depth - wallThickness,
                wallThickness,
                depth - wallThickness - cornerRadius
            );
            bottomInnerPath.lineTo(wallThickness, wallThickness + cornerRadius);
            bottomInnerPath.quadraticCurveTo(
                wallThickness,
                wallThickness,
                wallThickness + cornerRadius,
                wallThickness
            );

            // Extrude the bottom by wallThickness height
            const bottomExtrudeSettings = {
                steps: 1,
                depth: wallThickness,
                bevelEnabled: false,
            };

            const bottomGeometry = new THREE.ExtrudeGeometry(
                bottomShape,
                bottomExtrudeSettings
            );
            const bottomMesh = new THREE.Mesh(bottomGeometry, material);
            bottomMesh.castShadow = true;
            bottomMesh.receiveShadow = true;

            // Add bottom mesh to the group
            meshGroup.add(bottomMesh);

            // Rotate the entire group to lay flat on x-y plane
            meshGroup.rotation.x = -Math.PI / 2;
            meshGroup.position.set(-width / 2, 0, depth / 2);

            return meshGroup;
        } else {
            // For no bottom, create a simple extruded shape with a hole through it
            const outerBox = new THREE.Shape();
            outerBox.moveTo(cornerRadius, 0);
            outerBox.lineTo(width - cornerRadius, 0);
            outerBox.quadraticCurveTo(width, 0, width, cornerRadius);
            outerBox.lineTo(width, depth - cornerRadius);
            outerBox.quadraticCurveTo(
                width,
                depth,
                width - cornerRadius,
                depth
            );
            outerBox.lineTo(cornerRadius, depth);
            outerBox.quadraticCurveTo(0, depth, 0, depth - cornerRadius);
            outerBox.lineTo(0, cornerRadius);
            outerBox.quadraticCurveTo(0, 0, cornerRadius, 0);

            // Create the hole for the inner box
            const innerBox = new THREE.Path();
            innerBox.moveTo(wallThickness + cornerRadius, wallThickness);
            innerBox.lineTo(
                width - wallThickness - cornerRadius,
                wallThickness
            );
            innerBox.quadraticCurveTo(
                width - wallThickness,
                wallThickness,
                width - wallThickness,
                wallThickness + cornerRadius
            );
            innerBox.lineTo(
                width - wallThickness,
                depth - wallThickness - cornerRadius
            );
            innerBox.quadraticCurveTo(
                width - wallThickness,
                depth - wallThickness,
                width - wallThickness - cornerRadius,
                depth - wallThickness
            );
            innerBox.lineTo(
                wallThickness + cornerRadius,
                depth - wallThickness
            );
            innerBox.quadraticCurveTo(
                wallThickness,
                depth - wallThickness,
                wallThickness,
                depth - wallThickness - cornerRadius
            );
            innerBox.lineTo(wallThickness, wallThickness + cornerRadius);
            innerBox.quadraticCurveTo(
                wallThickness,
                wallThickness,
                wallThickness + cornerRadius,
                wallThickness
            );

            // Add the inner hole
            outerBox.holes.push(innerBox);

            // Extrude the shape to create a 3D object
            const extrudeSettings = {
                steps: 1,
                depth: height,
                bevelEnabled: false,
            };

            const geometry = new THREE.ExtrudeGeometry(
                outerBox,
                extrudeSettings
            );

            // Create material
            const material = new THREE.MeshStandardMaterial({
                color: 0x7a9cbf,
                roughness: 0.4,
                metalness: 0.2,
            });

            // Create and return the mesh
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Rotate to lay flat on the x-y plane
            mesh.rotation.x = -Math.PI / 2;

            // Position the mesh
            mesh.position.set(-width / 2, 0, depth / 2);

            return mesh;
        }
    };

    // Function to export the model as STL
    const exportSTL = () => {
        if (!boxMeshRef.current || !sceneRef.current) return;

        const exporter = new STLExporter();
        const stlString = exporter.parse(sceneRef.current);

        const blob = new Blob([stlString], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'drawer-insert.stl';
        link.click();
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            <Head>
                <title>Drawer Insert Generator</title>
                <meta
                    name="description"
                    content="Generate custom drawer inserts for 3D printing"
                />
            </Head>

            <header className="border-b p-4">
                <h1 className="text-xl font-bold">Drawer Insert Generator</h1>
            </header>

            <div className="flex-grow overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    {/* Settings Panel */}
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                        <div className="h-full overflow-auto p-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="width">Width (mm)</Label>
                                    <Input
                                        id="width"
                                        type="number"
                                        name="width"
                                        value={inputs.width}
                                        onChange={handleInputChange}
                                        min={constraints.width.min}
                                        max={constraints.width.max}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="depth">Depth (mm)</Label>
                                    <Input
                                        id="depth"
                                        type="number"
                                        name="depth"
                                        value={inputs.depth}
                                        onChange={handleInputChange}
                                        min={constraints.depth.min}
                                        max={constraints.depth.max}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="height">Height (mm)</Label>
                                    <Input
                                        id="height"
                                        type="number"
                                        name="height"
                                        value={inputs.height}
                                        onChange={handleInputChange}
                                        min={
                                            inputs.hasBottom
                                                ? Math.max(
                                                      constraints.height.min,
                                                      inputs.wallThickness + 1
                                                  )
                                                : constraints.height.min
                                        }
                                        max={constraints.height.max}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="wallThickness">
                                        Wall Thickness (mm)
                                    </Label>
                                    <Input
                                        id="wallThickness"
                                        type="number"
                                        name="wallThickness"
                                        value={inputs.wallThickness}
                                        onChange={handleInputChange}
                                        min={constraints.wallThickness.min}
                                        max={constraints.wallThickness.max}
                                        step="0.5"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cornerRadius">
                                        Corner Radius (mm)
                                    </Label>
                                    <Input
                                        id="cornerRadius"
                                        type="number"
                                        name="cornerRadius"
                                        value={inputs.cornerRadius}
                                        onChange={handleInputChange}
                                        min={constraints.cornerRadius.min}
                                        max={Math.min(
                                            (inputs.width -
                                                2 * inputs.wallThickness) /
                                                2,
                                            (inputs.depth -
                                                2 * inputs.wallThickness) /
                                                2,
                                            constraints.cornerRadius.max
                                        )}
                                    />
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox
                                        id="hasBottom"
                                        checked={inputs.hasBottom}
                                        onCheckedChange={handleCheckboxChange}
                                    />
                                    <Label htmlFor="hasBottom">
                                        Include Bottom
                                    </Label>
                                </div>

                                <Button
                                    onClick={exportSTL}
                                    className="w-full mt-6"
                                >
                                    Export STL
                                </Button>
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* 3D Preview */}
                    <ResizablePanel defaultSize={80}>
                        <div ref={containerRef} className="w-full h-full"></div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <footer className="border-t p-2 text-center text-muted-foreground text-sm">
                Built with Next.js 15, Three.js, and shadcn/ui
            </footer>
        </div>
    );
}
