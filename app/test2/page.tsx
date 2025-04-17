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
    [0, 0, 0],
    [1, 0, 1],
    [1, 1, 1],
]
const cellSize = 1
const wallThickness = 0.2 // how far inwards
const lineWidth = 5 // in pixels

//
// 1) extract CCW outline of the filled cells (uncentered)
//
function getOutline(grid: number[][]): THREE.Vector2[] {
    const rows = grid.length,
        cols = grid[0].length
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

    // stitch segments into a single CCW loop
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

    // scale by cellSize
    return loop.map((p) => new THREE.Vector2(p.x * cellSize, p.y * cellSize))
}

//
// 2) offset a CCW polygon inward by t by intersecting edge‐offset lines
//
function offsetPolygonCCW(pts: THREE.Vector2[], t: number) {
    const N = pts.length
    const inner: THREE.Vector2[] = []

    for (let i = 0; i < N; i++) {
        const prev = pts[(i + N - 1) % N],
            curr = pts[i],
            next = pts[(i + 1) % N]

        // Direction prev→curr and curr→next
        const d1 = curr.clone().sub(prev).normalize()
        const d2 = next.clone().sub(curr).normalize()
        // Left‐normals (since loop is CCW, inward is left of each edge)
        const n1 = new THREE.Vector2(-d1.y, d1.x)
        const n2 = new THREE.Vector2(-d2.y, d2.x)

        // Offset lines: L1 through prev+n1*t in direction d1,
        //               L2 through curr+n2*t in direction d2.
        const p1 = prev.clone().add(n1.clone().multiplyScalar(t))
        const p2 = curr.clone().add(n2.clone().multiplyScalar(t))

        // Solve intersection: p1 + s·d1 = p2 + u·d2
        // => s = ((p2 - p1)×d2) / (d1×d2)
        const diff = p2.clone().sub(p1)
        const crossD = d1.x * d2.y - d1.y * d2.x

        let pt: THREE.Vector2
        if (Math.abs(crossD) > 1e-6) {
            const s = (diff.x * d2.y - diff.y * d2.x) / crossD
            pt = p1.clone().add(d1.clone().multiplyScalar(s))
        } else {
            // Parallel edges: fallback to simple offset of curr
            pt = curr.clone().add(n1.clone().multiplyScalar(t))
        }

        inner.push(pt)
    }

    return inner
}

export default function DebugOffsetPage() {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Scene & Camera
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf4f4f4)
        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        )
        camera.position.set(5, 7, 5)
        camera.lookAt(0, 0, 0)

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight)

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true

        // 1) Outer outline (red)
        const outer2D = getOutline(GRID)
        const outerPos: number[] = []
        outer2D.forEach((v) => outerPos.push(v.x, 0, v.y))
        if (outer2D.length) {
            const v0 = outer2D[0]
            outerPos.push(v0.x, 0, v0.y)
        }
        const outerGeo = new LineGeometry()
        outerGeo.setPositions(outerPos)
        const outerMat = new LineMaterial({
            color: 0xff0000,
            linewidth: lineWidth,
            worldUnits: false,
        })
        outerMat.resolution.set(window.innerWidth, window.innerHeight)
        const outerLine = new Line2(outerGeo, outerMat)
        outerLine.computeLineDistances()
        scene.add(outerLine)

        // 2) Inner offset outline (blue)
        const inner2D = offsetPolygonCCW(outer2D, wallThickness)
        const innerPos: number[] = []
        inner2D.forEach((v) => innerPos.push(v.x, 0, v.y))
        if (inner2D.length) {
            const v0 = inner2D[0]
            innerPos.push(v0.x, 0, v0.y)
        }
        const innerGeo = new LineGeometry()
        innerGeo.setPositions(innerPos)
        const innerMat = new LineMaterial({
            color: 0x0000ff,
            linewidth: lineWidth,
            worldUnits: false,
        })
        innerMat.resolution.set(window.innerWidth, window.innerHeight)
        const innerLine = new Line2(innerGeo, innerMat)
        innerLine.computeLineDistances()
        scene.add(innerLine)

        // Grid Helper
        scene.add(new THREE.GridHelper(10, 10))

        // Mount & Animate
        const canvas = renderer.domElement
        ref.current!.appendChild(canvas)
        window.addEventListener('resize', onResize)

        let id: number
        ;(function animate() {
            controls.update()
            renderer.render(scene, camera)
            id = requestAnimationFrame(animate)
        })()

        function onResize() {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
            outerMat.resolution.set(window.innerWidth, window.innerHeight)
            innerMat.resolution.set(window.innerWidth, window.innerHeight)
        }

        return () => {
            cancelAnimationFrame(id)
            window.removeEventListener('resize', onResize)
            controls.dispose()
            renderer.dispose()
            outerGeo.dispose()
            outerMat.dispose()
            innerGeo.dispose()
            innerMat.dispose()
            if (ref.current!.contains(canvas)) {
                ref.current!.removeChild(canvas)
            }
        }
    }, [])

    return (
        <div
            ref={ref}
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
