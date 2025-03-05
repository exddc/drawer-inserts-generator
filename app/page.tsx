'use client';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { createBoxWithRoundedEdges } from '@/lib/boxModelGenerator';
import {
    defaultConstraints,
    validateNumericInput,
    calculateMaxCornerRadius,
} from '@/lib/validationUtils';

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

export default function Home() {
    // State for form inputs
    const [inputs, setInputs] = useState<FormInputs>(defaultInputs);

    // Refs for Three.js
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const boxMeshRef = useRef<THREE.Mesh | THREE.Group | null>(null);

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let newValue = parseFloat(value);

        // Apply constraints
        newValue = validateNumericInput(
            name,
            newValue,
            defaultConstraints,
            inputs
        );

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

        // Create initial box
        createBoxModel();

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

    // Function to create and update the box model
    const createBoxModel = () => {
        if (!sceneRef.current) return;

        // Remove previous box if it exists
        if (boxMeshRef.current) {
            sceneRef.current.remove(boxMeshRef.current);
        }

        try {
            // Create new box based on inputs
            const {
                width,
                depth,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
            } = inputs;

            // Guard against invalid dimensions that might cause NaN errors
            if (
                width <= 0 ||
                depth <= 0 ||
                height <= 0 ||
                wallThickness <= 0 ||
                cornerRadius < 0 ||
                wallThickness * 2 >= width ||
                wallThickness * 2 >= depth
            ) {
                console.warn('Invalid dimensions, skipping box creation');
                return;
            }

            const box = createBoxWithRoundedEdges({
                width,
                depth,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
            });

            sceneRef.current.add(box);
            boxMeshRef.current = box;
        } catch (error) {
            console.error('Error creating box model:', error);
        }
    };

    // Update the box when inputs change
    useEffect(() => {
        createBoxModel();
    }, [inputs]);

    // Function to export the model as STL
    const exportSTL = () => {
        if (!boxMeshRef.current || !sceneRef.current) return;

        const exporter = new STLExporter();
        const stlString = exporter.parse(sceneRef.current);

        const blob = new Blob([stlString], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `drawer-insert-${inputs.width}x${inputs.depth}x${inputs.height}.stl`;
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
                                        min={defaultConstraints.width.min}
                                        max={defaultConstraints.width.max}
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
                                        min={defaultConstraints.depth.min}
                                        max={defaultConstraints.depth.max}
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
                                                      defaultConstraints.height
                                                          .min,
                                                      inputs.wallThickness + 1
                                                  )
                                                : defaultConstraints.height.min
                                        }
                                        max={defaultConstraints.height.max}
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
                                        min={
                                            defaultConstraints.wallThickness.min
                                        }
                                        max={
                                            defaultConstraints.wallThickness.max
                                        }
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
                                        min={
                                            defaultConstraints.cornerRadius.min
                                        }
                                        max={calculateMaxCornerRadius(
                                            inputs.width,
                                            inputs.depth,
                                            inputs.wallThickness,
                                            defaultConstraints.cornerRadius.max
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
