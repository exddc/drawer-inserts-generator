'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

//
// CONFIGURATION
//
type Cell = {
    group: number
    width: number
    depth: number
    color?: number
}

export default function Test() {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<THREE.Scene>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera>(null)
    const rendererRef = useRef<THREE.WebGLRenderer>(null)
    const controlsRef = useRef<OrbitControls>(null)
    const boxRef = useRef<THREE.Group>(null)

    const [wallThickness, setWallThickness] = useState(0.05)
    const [cornerRadius, setCornerRadius] = useState(0.2)
    const [wallHeight, setWallHeight] = useState(1)
    const [generateBottom, setGenerateBottom] = useState(true)

    const [totalWidth, setTotalWidth] = useState(4)
    const [totalDepth, setTotalDepth] = useState(4)

    useEffect(() => {
        if (!containerRef.current) return
        const { scene, camera, renderer } = initBasics(containerRef.current)
        sceneRef.current = scene
        cameraRef.current = camera
        rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controlsRef.current = controls

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
            if (!cameraRef.current || !rendererRef.current) return
            cameraRef.current.aspect = window.innerWidth / window.innerHeight
            cameraRef.current.updateProjectionMatrix()
            rendererRef.current.setSize(window.innerWidth, window.innerHeight)
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

        function onPointerDown(event: MouseEvent) {
            // detect modifier for multi‐select
            const isMultiSelect = event.metaKey || event.ctrlKey

            // normalize mouse coords into [-1,1]
            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouse, camera)

            // raycast against everything
            const hits = raycaster.intersectObjects(scene.children, true)
            if (!hits.length) return

            // pick the first hit on a wall (child 0) or bottom (child 1)
            const hit = hits.find(({ object }) => {
                if (!(object instanceof THREE.Mesh)) return false
                const idx = object.parent.children.indexOf(object)
                const isWall = idx === 0
                const isBottom = generateBottom && idx === 1
                return isWall || isBottom
            })
            if (!hit) return

            const mesh = hit.object as THREE.Mesh
            const box = mesh.parent as THREE.Group

            // if no modifier, clear previous highlights
            if (!isMultiSelect) {
                selectedGroups.forEach((grp) =>
                    grp.traverse((c) => {
                        if (c instanceof THREE.Mesh)
                            c.material.color.setHex(0x888888)
                    })
                )
                selectedGroups = []
            }

            // toggle this box in the array
            const idx = selectedGroups.indexOf(box)
            if (idx !== -1) {
                // was already selected → deselect
                box.traverse((c) => {
                    if (c instanceof THREE.Mesh)
                        c.material.color.setHex(0x888888)
                })
                selectedGroups.splice(idx, 1)
            } else {
                // not yet selected → highlight & add
                box.traverse((c) => {
                    if (c instanceof THREE.Mesh)
                        c.material.color.setHex(0xff0000)
                })
                selectedGroups.push(box)
            }
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
        const scene = sceneRef.current
        if (!scene) return

        // remove old
        if (boxRef.current) scene.remove(boxRef.current)

        // add new
        const grid = generateGrid(totalWidth, totalDepth)
        const box = generateCustomBox(
            grid,
            wallThickness,
            cornerRadius,
            wallHeight,
            generateBottom
        )
        boxRef.current = box
        box.position.set(-totalWidth / 2, 0, -totalDepth / 2)
        scene.add(box)
    }, [
        wallThickness,
        cornerRadius,
        wallHeight,
        generateBottom,
        totalWidth,
        totalDepth,
    ])

    return (
        <>
            {/* 4) simple overlay */}
            <div
                style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 1,
                    background: 'rgba(255,255,255,0.8)',
                    padding: 8,
                    borderRadius: 4,
                }}
            >
                <div>
                    <label>
                        Wall thickness: {wallThickness.toFixed(2)}
                        <input
                            type="range"
                            min={0.01}
                            max={0.2}
                            step={0.01}
                            value={wallThickness}
                            onChange={(e) => setWallThickness(+e.target.value)}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Corner radius: {cornerRadius.toFixed(2)}
                        <input
                            type="range"
                            min={0}
                            max={0.5}
                            step={0.01}
                            value={cornerRadius}
                            onChange={(e) => setCornerRadius(+e.target.value)}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Wall height: {wallHeight.toFixed(2)}
                        <input
                            type="range"
                            min={0.5}
                            max={5}
                            step={0.1}
                            value={wallHeight}
                            onChange={(e) => setWallHeight(+e.target.value)}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Bottom:{' '}
                        <input
                            type="checkbox"
                            checked={generateBottom}
                            onChange={(e) =>
                                setGenerateBottom(e.target.checked)
                            }
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Total width: {totalWidth}
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={totalWidth}
                            onChange={(e) => setTotalWidth(+e.target.value)}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Total depth: {totalDepth}
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={totalDepth}
                            onChange={(e) => setTotalDepth(+e.target.value)}
                        />
                    </label>
                </div>
            </div>

            <div
                ref={containerRef}
                style={{
                    width: '100vw',
                    height: '100vh',
                    margin: 0,
                    padding: 0,
                    overflow: 'hidden',
                }}
            />
        </>
    )
}

//
// MAIN HELPER
//
function generateCustomBox(
    grid: Cell[][],
    wall_thickness: number,
    corner_radius: number,
    wall_height: number,
    generate_bottom: boolean
): THREE.Group {
    const group = new THREE.Group()
    const ids = Array.from(new Set(grid.flat().map((c) => c.group))).filter(
        (i) => i > 0
    )

    ids.forEach((id) => {
        const rawO = getOutline(grid, id)
        if (!rawO.length) return
        const rawI = offsetPolygonCCW(rawO, wall_thickness)
        const outR = getRoundedOutline(
            rawO,
            corner_radius,
            5,
            corner_radius,
            wall_thickness
        )
        const inR = getRoundedOutline(
            rawI,
            corner_radius - wall_thickness,
            5,
            corner_radius,
            wall_thickness
        )
        const boxGroup = new THREE.Group()
        boxGroup.add(buildWallMesh(outR, inR, wall_height))
        if (generate_bottom) boxGroup.add(buildBottomMesh(outR, wall_thickness))
        group.add(boxGroup)
    })

    const widths = grid[0].map((c) => c.width)
    const depths = grid.map((row) => row[0].depth)
    const cumW: number[] = [0]
    widths.forEach((w) => cumW.push(cumW[cumW.length - 1] + w))
    const cumD: number[] = [0]
    depths.forEach((d) => cumD.push(cumD[cumD.length - 1] + d))

    // For each cell that is NOT filled, build a 1×1 cell‐grid
    for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[z][x]
            if (cell.group !== 0) continue

            // Build a 1×1 grid containing just this cell
            const singleGrid: Cell[][] = [
                [{ group: 0, width: cell.width, depth: cell.depth }],
            ]
            const rawO = getOutline(singleGrid, 0)
            const rawI = offsetPolygonCCW(rawO, wall_thickness)
            const outR = getRoundedOutline(
                rawO,
                corner_radius,
                5,
                corner_radius,
                wall_thickness
            )
            const inR = getRoundedOutline(
                rawI,
                corner_radius - wall_thickness,
                5,
                corner_radius,
                wall_thickness
            )
            const x0 = cumW[x],
                z0 = cumD[z]
            outR.forEach((p) => {
                p.x += x0
                p.y += z0
            })
            inR.forEach((p) => {
                p.x += x0
                p.y += z0
            })

            const cellGroup = new THREE.Group()
            cellGroup.userData.selectable = true
            cellGroup.add(buildWallMesh(outR, inR, wall_height))
            if (generate_bottom)
                cellGroup.add(buildBottomMesh(outR, wall_thickness))
            group.add(cellGroup)
        }
    }

    return group
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

//
// MESH BUILDERS
//
function buildWallMesh(
    outerPts: THREE.Vector2[],
    innerPts: THREE.Vector2[],
    wallHeight: number
): THREE.Mesh {
    const shape = new THREE.Shape()
    if (outerPts.length) {
        shape.moveTo(outerPts[0].x, outerPts[0].y)
        outerPts.slice(1).forEach((pt) => shape.lineTo(pt.x, pt.y))
        shape.closePath()
    }

    if (innerPts.length) {
        const hole = new THREE.Path()
        hole.moveTo(innerPts[0].x, innerPts[0].y)
        innerPts.slice(1).forEach((pt) => hole.lineTo(pt.x, pt.y))
        hole.closePath()
        shape.holes.push(hole)
    }

    const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallHeight,
        bevelEnabled: false,
    })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, wallHeight, 0)

    const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide,
    })
    return new THREE.Mesh(geo, mat)
}

function buildBottomMesh(
    outerPts: THREE.Vector2[],
    thickness: number
): THREE.Mesh {
    const shape = new THREE.Shape()
    shape.moveTo(outerPts[0].x, outerPts[0].y)
    outerPts.slice(1).forEach((pt) => shape.lineTo(pt.x, pt.y))
    shape.closePath()

    const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: thickness,
        bevelEnabled: false,
    })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, thickness, 0)

    const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide,
    })
    return new THREE.Mesh(geo, mat)
}

//
// GEOMETRY UTILS
//
function getOutline(grid: Cell[][], groupId: number): THREE.Vector2[] {
    const rows = grid.length
    const cols = grid[0].length

    // gather column‐widths from the 0th row
    const widths = grid[0].map((c) => c.width)
    // gather row‐depths   from the 0th column
    const depths = grid.map((row) => row[0].depth)

    // build prefix sums
    const cumW = [0]
    widths.forEach((w) => cumW.push(cumW[cumW.length - 1] + w))
    const cumD = [0]
    depths.forEach((d) => cumD.push(cumD[cumD.length - 1] + d))
    type Seg = { a: THREE.Vector2; b: THREE.Vector2 }
    const segs: Seg[] = []

    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            if (grid[z][x].group !== groupId) continue
            if (z === 0 || grid[z - 1][x].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x, z),
                    b: new THREE.Vector2(x + 1, z),
                })
            if (x === cols - 1 || grid[z][x + 1].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x + 1, z),
                    b: new THREE.Vector2(x + 1, z + 1),
                })
            if (z === rows - 1 || grid[z + 1][x].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x + 1, z + 1),
                    b: new THREE.Vector2(x, z + 1),
                })
            if (x === 0 || grid[z][x - 1].group !== groupId)
                segs.push({
                    a: new THREE.Vector2(x, z + 1),
                    b: new THREE.Vector2(x, z),
                })
        }
    }

    const loop: THREE.Vector2[] = []
    let cur = segs.shift()!
    loop.push(cur.a, cur.b)
    while (segs.length) {
        const tail = loop[loop.length - 1]
        const idx = segs.findIndex((s) => s.a.equals(tail))
        if (idx === -1) break
        loop.push(segs[idx].b)
        segs.splice(idx, 1)
    }
    if (loop.length > 1 && loop[0].equals(loop[loop.length - 1])) {
        loop.pop()
    }
    return loop.map((p) => new THREE.Vector2(cumW[p.x], cumD[p.y]))
}

function offsetPolygonCCW(pts: THREE.Vector2[], t: number) {
    const N = pts.length
    const inner: THREE.Vector2[] = []
    for (let i = 0; i < N; i++) {
        const prev = pts[(i + N - 1) % N],
            curr = pts[i],
            next = pts[(i + 1) % N]

        const d1 = curr.clone().sub(prev).normalize()
        const d2 = next.clone().sub(curr).normalize()
        const n1 = new THREE.Vector2(-d1.y, d1.x)
        const n2 = new THREE.Vector2(-d2.y, d2.x)

        const p1 = prev.clone().addScaledVector(n1, t)
        const p2 = curr.clone().addScaledVector(n2, t)
        const diff = p2.clone().sub(p1)
        const crossD = d1.x * d2.y - d1.y * d2.x

        let pt: THREE.Vector2
        if (Math.abs(crossD) > 1e-6) {
            const s = (diff.x * d2.y - diff.y * d2.x) / crossD
            pt = p1.clone().addScaledVector(d1, s)
        } else {
            pt = curr.clone().addScaledVector(n1, t)
        }
        inner.push(pt)
    }
    return inner
}

function getRoundedOutline(
    pts: THREE.Vector2[],
    radius: number,
    segmentsPerCorner = 5,
    corner_radius: number,
    wall_thickness: number
): THREE.Vector2[] {
    if (radius <= 0 || pts.length < 3) return pts.slice()
    const N = pts.length
    const path = new THREE.Path()

    const prev0 = pts[N - 1]
    const curr0 = pts[0]
    const d0 = curr0.clone().sub(prev0).normalize()
    path.moveTo(curr0.x - d0.x * radius, curr0.y - d0.y * radius)

    for (let i = 0; i < N; i++) {
        const prev = pts[(i + N - 1) % N]
        const curr = pts[i]
        const next = pts[(i + 1) % N]

        const dPrev = curr.clone().sub(prev).normalize()
        const dNext = next.clone().sub(curr).normalize()
        const cross = dPrev.x * dNext.y - dPrev.y * dNext.x
        const isConvex = cross >= 0

        const r = isConvex
            ? radius
            : radius === corner_radius
              ? corner_radius - wall_thickness
              : corner_radius

        const pA = curr.clone().addScaledVector(dPrev, -r)
        const pB = curr.clone().addScaledVector(dNext, r)

        path.lineTo(pA.x, pA.y)
        path.quadraticCurveTo(curr.x, curr.y, pB.x, pB.y)
    }

    path.closePath()
    const ptsOut = path.getPoints(N * segmentsPerCorner)
    return ptsOut.map((p) => new THREE.Vector2(p.x, p.y))
}

function generateGrid(totalWidth: number, totalDepth: number): Cell[][] {
    const cols = Math.floor(totalWidth)
    const rows = Math.floor(totalDepth)
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            group: 0,
            width: 1,
            depth: 1,
        }))
    )
}
