'use client'

import { generateCustomBox } from '@/lib/boxHelper'
import { resizeGrid } from '@/lib/gridHelper'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function Home() {
    const state = useStore()

    useEffect(() => {
        if (!state.containerRef.current) return
        const { scene, camera, renderer } = initBasics(
            state.containerRef.current
        )
        state.sceneRef.current = scene
        state.cameraRef.current = camera
        state.rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        state.controlsRef.current = controls
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
        }
        renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault()
        })

        // lights + grid
        scene.add(new THREE.AmbientLight(0xffffff, 0.6))
        const sun = new THREE.DirectionalLight(0xffffff, 0.6)
        sun.position.set(5, 10, 5)
        sun.castShadow = true
        scene.add(sun)
        scene.add(new THREE.GridHelper(10, 10))
        renderer.shadowMap.enabled = true

        // resize handler
        const onWindowResize = () => {
            if (!state.cameraRef.current || !state.rendererRef.current) return
            state.cameraRef.current.aspect =
                window.innerWidth / window.innerHeight
            state.cameraRef.current.updateProjectionMatrix()
            state.rendererRef.current.setSize(
                window.innerWidth,
                window.innerHeight
            )
        }
        window.addEventListener('resize', onWindowResize)

        // animation loop
        let frameId: number
        const animate = () => {
            controls.update()
            renderer.render(scene, camera)
            frameId = requestAnimationFrame(animate)
        }
        animate()

        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        let selectedGroups: THREE.Group[] = []

        window.addEventListener('keydown', onKeyDown)

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                // clear highlights
                selectedGroups.forEach((grp) =>
                    grp.traverse((c) => {
                        if (c instanceof THREE.Mesh)
                            c.material.color.setHex(0x888888)
                    })
                )
                // reset selection array
                selectedGroups = []
            }
        }

        function updateCombineButton() {
            const btn = document.getElementById(
                'combine-btn'
            ) as HTMLButtonElement | null
            if (btn) btn.disabled = selectedGroups.length < 2
        }

        // 2) Hook it up to your button:
        const combineBtn = document.getElementById('combine-btn')!
        combineBtn.addEventListener('click', onCombineClick)

        function onCombineClick() {
            if (selectedGroups.length < 2) return

            // 1) pick a new unused ID
            const existing = new Set<number>(
                (state.boxRef.current!.children as THREE.Group[]).map(
                    (g) => g.userData.group as number
                )
            )
            let newId = 1
            while (existing.has(newId)) newId++

            // 2) stamp that ID into the master grid for each selected box
            const grid = state.gridRef.current!
            selectedGroups.forEach((grp) => {
                const cells: { x: number; z: number }[] = grp.userData.cells
                cells.forEach(({ x, z }) => {
                    grid[z][x].group = newId
                })
            })

            // 3) rebuild the entire box‐layer from the updated grid
            const scene = state.sceneRef.current!
            scene.remove(state.boxRef.current!)
            const newBox = generateCustomBox(
                grid,
                state.wallThickness,
                state.cornerRadius,
                state.wallHeight,
                state.generateBottom
            )
            state.boxRef.current = newBox
            newBox.position.set(-state.totalWidth / 2, 0, -state.totalDepth / 2)
            scene.add(newBox)

            // 4) clear highlights & reset UI
            selectedGroups.forEach((grp) =>
                grp.traverse((c) => {
                    if (c instanceof THREE.Mesh)
                        c.material.color.setHex(0x888888)
                })
            )
            selectedGroups = []
            updateCombineButton()
        }

        function onPointerDown(event: MouseEvent) {
            if (event.button !== 0) return // only left mouse button

            const isMultiSelect = event.metaKey || event.ctrlKey

            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouse, camera)

            const hits = raycaster.intersectObjects(scene.children, true)
            if (!hits.length) return

            const hit = hits.find(({ object }) => {
                if (!(object instanceof THREE.Mesh)) return false
                //@ts-ignore
                const idx = object.parent.children.indexOf(object)
                const isWall = idx === 0
                const isBottom = state.generateBottom && idx === 1
                return isWall || isBottom
            })
            if (!hit) return

            const box = (hit.object as THREE.Mesh).parent as THREE.Group

            if (!isMultiSelect) {
                selectedGroups.forEach((grp) =>
                    grp.traverse((c) => {
                        if (c instanceof THREE.Mesh)
                            c.material.color.setHex(0x888888)
                    })
                )
                selectedGroups = []
            }

            const i = selectedGroups.indexOf(box)
            if (i !== -1) {
                box.traverse((c) => {
                    if (c instanceof THREE.Mesh)
                        c.material.color.setHex(0x888888)
                })
                selectedGroups.splice(i, 1)
            } else {
                box.traverse((c) => {
                    if (c instanceof THREE.Mesh)
                        c.material.color.setHex(0xff0000)
                })
                selectedGroups.push(box)
            }

            updateCombineButton()
        }

        renderer.domElement.addEventListener('pointerdown', onPointerDown)

        return () => {
            cancelAnimationFrame(frameId)
            window.removeEventListener('resize', onWindowResize)
            renderer.domElement.removeEventListener(
                'pointerdown',
                onPointerDown
            )
            controls.dispose()
            renderer.dispose()
        }
    }, [])

    useEffect(() => {
        const scene = state.sceneRef.current
        if (!scene) return

        // remove old
        if (state.boxRef.current) scene.remove(state.boxRef.current)

        // only resize the grid if cols/rows actually changeds
        const old = state.gridRef.current
        if (
            old.length !== state.totalDepth ||
            old[0].length !== state.totalWidth
        ) {
            state.gridRef.current = resizeGrid(
                old,
                state.totalWidth,
                state.totalDepth
            )
        }

        const grid = state.gridRef.current
        const box = generateCustomBox(
            grid,
            state.wallThickness,
            state.cornerRadius,
            state.wallHeight,
            state.generateBottom
        )
        state.boxRef.current = box
        box.position.set(-state.totalWidth / 2, 0, -state.totalDepth / 2)
        scene.add(box)
    }, [
        state.wallThickness,
        state.cornerRadius,
        state.wallHeight,
        state.generateBottom,
        state.totalWidth,
        state.totalDepth,
    ])

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* 4) simple overlay */}
            <div
                style={{
                    position: 'absolute',
                    top: 80,
                    left: 10,
                    zIndex: 1,
                    background: 'rgba(255,255,255,0.8)',
                    padding: 8,
                    borderRadius: 4,
                }}
            >
                <div>
                    <label>
                        Wall thickness: {state.wallThickness.toFixed(2)}
                        <input
                            type="range"
                            min={0.01}
                            max={0.2}
                            step={0.01}
                            value={state.wallThickness}
                            onChange={(e) =>
                                state.setWallThickness(+e.target.value)
                            }
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Corner radius: {state.cornerRadius.toFixed(2)}
                        <input
                            type="range"
                            min={0}
                            max={0.5}
                            step={0.01}
                            value={state.cornerRadius}
                            onChange={(e) =>
                                state.setCornerRadius(+e.target.value)
                            }
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Wall height: {state.wallHeight.toFixed(2)}
                        <input
                            type="range"
                            min={0.5}
                            max={5}
                            step={0.1}
                            value={state.wallHeight}
                            onChange={(e) =>
                                state.setWallHeight(+e.target.value)
                            }
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Bottom:{' '}
                        <input
                            type="checkbox"
                            checked={state.generateBottom}
                            onChange={(e) =>
                                state.setGenerateBottom(e.target.checked)
                            }
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Total width: {state.totalWidth}
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={state.totalWidth}
                            onChange={(e) =>
                                state.setTotalWidth(+e.target.value)
                            }
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Total depth: {state.totalDepth}
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={state.totalDepth}
                            onChange={(e) =>
                                state.setTotalDepth(+e.target.value)
                            }
                        />
                    </label>
                </div>
                <button
                    id="combine-btn"
                    disabled
                    className="px-2 py-1 text-sm rounded-md font-medium text-white bg-blue-600 hover:enabled:bg-blue-700 disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Combine
                </button>
            </div>

            <div
                ref={state.containerRef}
                style={{
                    width: '100vw',
                    height: '100vh',
                    margin: 0,
                    padding: 0,
                    overflow: 'hidden',
                }}
            />
        </div>
    )
}

//
// INIT
//
function initBasics(container: HTMLDivElement): {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
} {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f4f4)

    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    )
    camera.position.set(5, 7, 5)
    camera.lookAt(scene.position)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(renderer.domElement)

    return { scene, camera, renderer }
}
