'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

//
// CONFIGURATION
//
const GRID = [
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1],
]
const CELL_SIZE = 1
const WALL_THICKNESS = 0.05
const CORNER_RADIUS = 0.2
const LINE_WIDTH = 5
const WALL_HEIGHT = 1
const GENERATE_BOTTOM = true

export default function DebugOffsetPage() {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // 1) init scene, camera, renderer
        const { scene, camera, renderer } = initBasics(containerRef.current)
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true

        // 2) compute raw outlines
        const rawOuter = getOutline(GRID)
        const rawInner = offsetPolygonCCW(rawOuter, WALL_THICKNESS)

        // 3) compute rounded outlines
        const outerRounded = getRoundedOutline(rawOuter, CORNER_RADIUS)
        const innerRounded = getRoundedOutline(
            rawInner,
            CORNER_RADIUS - WALL_THICKNESS
        )

        // 4) draw lines
        addOutlineLines(scene, outerRounded, 0xff0000)
        addOutlineLines(scene, innerRounded, 0x0000ff)

        // 5) build & add meshes
        const wallMesh = buildWallMesh(outerRounded, innerRounded)
        scene.add(wallMesh)

        if (GENERATE_BOTTOM) {
            const bottomMesh = buildBottomMesh(outerRounded)
            scene.add(bottomMesh)
        }

        // 6) lights, grid, shadows
        scene.add(new THREE.AmbientLight(0xffffff, 0.6))
        const sun = new THREE.DirectionalLight(0xffffff, 0.6)
        sun.position.set(5, 10, 5)
        sun.castShadow = true
        scene.add(sun)
        scene.add(new THREE.GridHelper(10, 10))

        renderer.shadowMap.enabled = true
        wallMesh.castShadow = true
        wallMesh.receiveShadow = true

        // 7) resize + animation loop
        window.addEventListener('resize', onWindowResize)
        let frameId: number
        ;(function animate() {
            controls.update()
            renderer.render(scene, camera)
            frameId = requestAnimationFrame(animate)
        })()

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
        }

        return () => {
            cancelAnimationFrame(frameId)
            window.removeEventListener('resize', onWindowResize)
            controls.dispose()
            renderer.dispose()
        }
    }, [])

    return (
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

//
// OUTLINE LINES
//
function addOutlineLines(
    scene: THREE.Scene,
    pts: THREE.Vector2[],
    color: number
) {
    const positions: number[] = []
    pts.forEach((v) => positions.push(v.x, 0, v.y))
    if (pts.length) {
        const v0 = pts[0]
        positions.push(v0.x, 0, v0.y)
    }

    const geo = new LineGeometry()
    geo.setPositions(positions)

    const mat = new LineMaterial({
        color,
        linewidth: LINE_WIDTH,
        worldUnits: false,
    })
    mat.resolution.set(window.innerWidth, window.innerHeight)

    const line = new Line2(geo, mat)
    line.computeLineDistances()
    scene.add(line)
}

//
// MESH BUILDERS
//
function buildWallMesh(
    outerPts: THREE.Vector2[],
    innerPts: THREE.Vector2[]
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
        depth: WALL_HEIGHT,
        bevelEnabled: false,
    })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, WALL_HEIGHT, 0)

    const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.2,
    })
    return new THREE.Mesh(geo, mat)
}

function buildBottomMesh(outerPts: THREE.Vector2[]): THREE.Mesh {
    const shape = new THREE.Shape()
    shape.moveTo(outerPts[0].x, outerPts[0].y)
    outerPts.slice(1).forEach((pt) => shape.lineTo(pt.x, pt.y))
    shape.closePath()

    const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: WALL_THICKNESS,
        bevelEnabled: false,
    })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, WALL_THICKNESS, 0)

    const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.2,
    })
    return new THREE.Mesh(geo, mat)
}

//
// GEOMETRY UTILS
//
function getOutline(grid: number[][]): THREE.Vector2[] {
    const rows = grid.length
    const cols = grid[0].length
    type Seg = { a: THREE.Vector2; b: THREE.Vector2 }
    const segs: Seg[] = []

    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            if (!grid[z][x]) continue
            if (z === 0 || !grid[z - 1][x])
                segs.push({
                    a: new THREE.Vector2(x, z),
                    b: new THREE.Vector2(x + 1, z),
                })
            if (x === cols - 1 || !grid[z][x + 1])
                segs.push({
                    a: new THREE.Vector2(x + 1, z),
                    b: new THREE.Vector2(x + 1, z + 1),
                })
            if (z === rows - 1 || !grid[z + 1][x])
                segs.push({
                    a: new THREE.Vector2(x + 1, z + 1),
                    b: new THREE.Vector2(x, z + 1),
                })
            if (x === 0 || !grid[z][x - 1])
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
    return loop.map((p) => p.clone().multiplyScalar(CELL_SIZE))
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
    segmentsPerCorner = 5
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
            : radius === CORNER_RADIUS
              ? CORNER_RADIUS - WALL_THICKNESS
              : CORNER_RADIUS

        const pA = curr.clone().addScaledVector(dPrev, -r)
        const pB = curr.clone().addScaledVector(dNext, r)

        path.lineTo(pA.x, pA.y)
        path.quadraticCurveTo(curr.x, curr.y, pB.x, pB.y)
    }

    path.closePath()
    const ptsOut = path.getPoints(N * segmentsPerCorner)
    return ptsOut.map((p) => new THREE.Vector2(p.x, p.y))
}
