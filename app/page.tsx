'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { getBoxInfoFromObject } from '@/lib/boxUtils';
import ConfigSidebar from '@/components/ConfigSidebar';
import DebugInfoPanel from '@/components/DebugInfoPanel';
import { useBoxStore } from '@/lib/store';
import { createBoxModel, setupGrid } from '@/lib/modelGenerator';
import ConfigSidebarWrapper from '@/components/ConfigSidebarWrapper';

export default function Home() {
    // Get state from Zustand store
    const {
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        debugMode,
        boxWidths,
        boxDepths,
        loadFromUrl,
    } = useBoxStore();

    // Refs for Three.js
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const boxMeshGroupRef = useRef<THREE.Group | null>(null);

    // Refs for debug tooltip
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const raycasterRef = useRef<THREE.Raycaster | null>(null);
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

    // Load configuration from URL if present
    useEffect(() => {
        loadFromUrl();
    }, [loadFromUrl]);

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
        camera.position.set(-110, -130, 110);
        camera.up.set(0, 0, 1);
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
        // Enable info tracking for debug statistics
        renderer.info.autoReset = false;
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

        // Setup grid based on initial dimensions
        setupGrid(scene, width, depth);
        scene.rotateX(Math.PI / 2);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(100);
        scene.add(axesHelper);

        // Create a group to hold all boxes
        const boxGroup = new THREE.Group();
        scene.add(boxGroup);
        boxMeshGroupRef.current = boxGroup;

        // Setup raycaster for debug mode
        raycasterRef.current = new THREE.Raycaster();

        // Create tooltip element for debug info
        const tooltip = document.createElement('div');
        tooltip.className =
            'fixed hidden p-2 bg-black/80 text-white text-xs rounded pointer-events-none z-50';
        document.body.appendChild(tooltip);
        tooltipRef.current = tooltip;

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                // Reset renderer info at the beginning of each frame when debug mode is on
                if (debugMode) {
                    rendererRef.current.info.reset();
                }
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

        // Create initial box model
        createBoxModel(boxMeshGroupRef.current, {
            boxWidths,
            boxDepths,
            height,
            wallThickness,
            cornerRadius,
            hasBottom,
        });

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(
                    rendererRef.current.domElement
                );
            }
            // Remove tooltip element
            if (tooltipRef.current) {
                document.body.removeChild(tooltipRef.current);
            }
        };
    }, []);

    // Update grid and box model when dimensions change
    useEffect(() => {
        // Update grid size
        if (sceneRef.current) {
            setupGrid(sceneRef.current, width, depth);
        }

        // Update box model
        if (boxMeshGroupRef.current) {
            createBoxModel(boxMeshGroupRef.current, {
                boxWidths,
                boxDepths,
                height,
                wallThickness,
                cornerRadius,
                hasBottom,
            });
        }
    }, [
        width,
        depth,
        height,
        wallThickness,
        cornerRadius,
        hasBottom,
        boxWidths,
        boxDepths,
    ]);

    // Update renderer info settings when debug mode changes
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.info.autoReset = !debugMode;
        }
    }, [debugMode]);

    // Set up event listeners for debug mode
    useEffect(() => {
        if (!containerRef.current || !debugMode) return;

        // Event handlers for debug interactions
        const handleMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return;

            // Calculate mouse position in normalized device coordinates
            const rect = containerRef.current.getBoundingClientRect();
            mouseRef.current.x =
                ((event.clientX - rect.left) /
                    containerRef.current.clientWidth) *
                    2 -
                1;
            mouseRef.current.y =
                -(
                    (event.clientY - rect.top) /
                    containerRef.current.clientHeight
                ) *
                    2 +
                1;
        };

        const handleClick = (event: MouseEvent) => {
            if (
                !containerRef.current ||
                !raycasterRef.current ||
                !sceneRef.current ||
                !cameraRef.current ||
                !tooltipRef.current
            )
                return;

            // Update the ray with the camera and mouse positions
            raycasterRef.current.setFromCamera(
                mouseRef.current,
                cameraRef.current
            );

            // Calculate objects intersecting the ray
            const intersects = raycasterRef.current.intersectObjects(
                boxMeshGroupRef.current?.children || [],
                true
            );

            if (intersects.length > 0) {
                // Get the first intersected object
                const object = intersects[0].object;

                // Find the parent box (either the object itself or its parent)
                let boxObject = object;
                while (
                    boxObject.parent &&
                    boxObject.parent !== boxMeshGroupRef.current
                ) {
                    boxObject = boxObject.parent;
                }

                // Get box dimensions from userData or compute from geometry
                const boxInfo = getBoxInfoFromObject(boxObject);

                // Show tooltip with box info
                tooltipRef.current.innerHTML = `
                    <div><strong>Box Info:</strong></div>
                    <div>Position: X: ${boxInfo.position.x.toFixed(
                        2
                    )}, Y: ${boxInfo.position.y.toFixed(
                    2
                )}, Z: ${boxInfo.position.z.toFixed(2)}</div>
                    <div>Width: ${boxInfo.width.toFixed(2)}</div>
                    <div>Depth: ${boxInfo.depth.toFixed(2)}</div>
                    <div>Height: ${boxInfo.height.toFixed(2)}</div>
                    <div>Wall Thickness: ${wallThickness}</div>
                `;

                // Position the tooltip near the mouse
                tooltipRef.current.style.left = `${event.clientX + 10}px`;
                tooltipRef.current.style.top = `${event.clientY + 10}px`;
                tooltipRef.current.classList.remove('hidden');
            } else {
                // Hide tooltip if no box was clicked
                tooltipRef.current.classList.add('hidden');
            }
        };

        // Add event listeners
        containerRef.current.addEventListener('mousemove', handleMouseMove);
        containerRef.current.addEventListener('click', handleClick);

        // Cleanup
        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener(
                    'mousemove',
                    handleMouseMove
                );
                containerRef.current.removeEventListener('click', handleClick);
            }

            if (tooltipRef.current) {
                tooltipRef.current.classList.add('hidden');
            }
        };
    }, [debugMode, wallThickness]);

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="flex-grow overflow-hidden flex flex-col">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Settings Panel */}
                    <ResizablePanel
                        defaultSize={20}
                        minSize={15}
                        maxSize={30}
                        className="flex flex-col"
                    >
                        <div className="flex-grow overflow-auto">
                            {/* Use the wrapper component which will handle the null check */}
                            <ConfigSidebarWrapper
                                sceneRef={sceneRef}
                                boxMeshGroupRef={boxMeshGroupRef}
                            />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* 3D Preview */}
                    <ResizablePanel defaultSize={80} className="h-full">
                        <div
                            ref={containerRef}
                            className="w-full h-full relative"
                        ></div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Debug Info Panel */}
            <DebugInfoPanel
                renderer={rendererRef.current}
                scene={sceneRef.current}
                boxMeshGroup={boxMeshGroupRef.current}
                enabled={debugMode}
            />
        </div>
    );
}
