'use client';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DebugInfoProps {
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    boxMeshGroup: THREE.Group | null;
    enabled: boolean;
}

export default function DebugInfoPanel({
    renderer,
    scene,
    boxMeshGroup,
    enabled,
}: DebugInfoProps) {
    const [fps, setFps] = useState<number>(0);
    const [memory, setMemory] = useState<string>('');
    const [triangleCount, setTriangleCount] = useState<number>(0);
    const [pageSize, setPageSize] = useState<string>('');
    const [renderInfo, setRenderInfo] = useState<{
        calls: number;
        triangles: number;
    }>({ calls: 0, triangles: 0 });

    const frameCountRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());
    const frameTimeRef = useRef<number[]>([]);

    // Update FPS counter
    useEffect(() => {
        if (!enabled) return;

        // Function to update FPS counter
        const updateFps = () => {
            frameCountRef.current++;

            const now = performance.now();
            const elapsed = now - lastTimeRef.current;

            // Update FPS every 500ms
            if (elapsed >= 500) {
                const fps = Math.round(
                    (frameCountRef.current * 1000) / elapsed
                );
                setFps(fps);

                // Track last 20 frame times for smoother FPS calculation
                frameTimeRef.current.push(elapsed / frameCountRef.current);
                if (frameTimeRef.current.length > 20) {
                    frameTimeRef.current.shift();
                }

                // Reset counter
                frameCountRef.current = 0;
                lastTimeRef.current = now;
            }

            // Update renderer info if available
            if (renderer) {
                const info = renderer.info;
                setRenderInfo({
                    calls: info.render.calls,
                    triangles: info.render.triangles,
                });
            }

            requestAnimationFrame(updateFps);
        };

        const animationId = requestAnimationFrame(updateFps);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [enabled, renderer]);

    // Update memory usage and page size
    useEffect(() => {
        if (!enabled) return;

        const updateMemory = () => {
            // Get memory info if available
            if ((performance as any).memory) {
                const memoryInfo = (performance as any).memory;
                const usedHeapSize = memoryInfo.usedJSHeapSize / (1024 * 1024);
                const totalHeapSize =
                    memoryInfo.totalJSHeapSize / (1024 * 1024);
                setMemory(
                    `${usedHeapSize.toFixed(1)}MB / ${totalHeapSize.toFixed(
                        1
                    )}MB`
                );
            } else {
                setMemory('Not available');
            }

            // Estimate page size by checking document size
            try {
                const pageSize =
                    new Blob([document.documentElement.outerHTML]).size /
                    (1024 * 1024);
                setPageSize(`${pageSize.toFixed(2)}MB`);
            } catch (e) {
                setPageSize('N/A');
            }
        };

        // Update triangle count
        const countTriangles = () => {
            if (boxMeshGroup) {
                let count = 0;
                boxMeshGroup.traverse((obj) => {
                    if (obj instanceof THREE.Mesh) {
                        const geometry = obj.geometry;
                        if (geometry instanceof THREE.BufferGeometry) {
                            if (geometry.index) {
                                count += geometry.index.count / 3;
                            } else if (geometry.attributes.position) {
                                count += geometry.attributes.position.count / 3;
                            }
                        }
                    }
                });
                setTriangleCount(Math.round(count));
            }
        };

        // Initial update
        updateMemory();
        countTriangles();

        // Set interval for updates
        const memoryInterval = setInterval(updateMemory, 2000);
        const triangleInterval = setInterval(countTriangles, 5000);

        return () => {
            clearInterval(memoryInterval);
            clearInterval(triangleInterval);
        };
    }, [enabled, boxMeshGroup]);

    if (!enabled) return null;

    return (
        <div className="fixed top-20 right-4 z-50 bg-black/80 text-white p-3 rounded-md text-xs font-mono whitespace-nowrap">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="font-semibold">FPS:</div>
                <div
                    className={`${
                        fps < 30
                            ? 'text-red-400'
                            : fps < 50
                            ? 'text-yellow-400'
                            : 'text-green-400'
                    }`}
                >
                    {fps}
                </div>

                <div className="font-semibold">Memory:</div>
                <div>{memory}</div>

                <div className="font-semibold">Page Size:</div>
                <div>{pageSize}</div>

                <div className="font-semibold">Triangles:</div>
                <div>{triangleCount.toLocaleString()}</div>

                <div className="font-semibold">Draw Calls:</div>
                <div>{renderInfo.calls}</div>

                <div className="font-semibold">Meshes:</div>
                <div>{boxMeshGroup?.children.length || 0}</div>

                {/* Box positions debug */}
                <div className="col-span-2 mt-2 pt-2 border-t border-gray-600">
                    <div className="font-semibold mb-1">Box Positions:</div>
                    {boxMeshGroup?.children.map((child, index) => {
                        const pos = child.position;
                        return (
                            <div key={index} className="text-xs">
                                Box {index + 1}: x: {pos.x.toFixed(1)}, z:{' '}
                                {pos.z.toFixed(1)}, w:{' '}
                                {child.userData?.dimensions?.width || 'N/A'}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
