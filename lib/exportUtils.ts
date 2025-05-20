// lib/exportUtils.ts
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { useStore } from '@/lib/store'

/**
 * Export the entire scene as one single STL
 */
export function handleStlExport(): void {
  const state = useStore.getState()
  const origScene = state.sceneRef.current
  if (!origScene) return

  // Wrap & rotate so Three's Y-up becomes STL Z-up
  const tmpScene = new THREE.Scene()
  const sceneClone = origScene.clone(true)
  sceneClone.position.set(0, 0, 0)
  sceneClone.rotation.set(Math.PI / 2, 0, 0)
  tmpScene.add(sceneClone)
  tmpScene.updateMatrixWorld()

  const exporter = new STLExporter()
  let stlString: string
  try {
    stlString = exporter.parse(tmpScene, { binary: false })
  } catch {
    stlString = exporter.parse(tmpScene)
  }

  const blob = new Blob([stlString], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `drawer-inserts-${state.totalWidth}x${state.totalDepth}x${state.wallHeight}-single-box.stl`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 100)
}

/**
 * Export unique boxes (deduped by W×D×H, swap-insensitive) as separate STLs
 * with a `_qtyN` suffix and pack into a ZIP.
 */
export async function handleExportMultipleSTLs(): Promise<void> {
  const state = useStore.getState()
  const boxGroup = state.boxRef.current
  const grid = state.gridRef.current
  if (!boxGroup || grid.length === 0) return

  const boxWidths = grid[0].map(cell => cell.width)
  const boxDepths = grid.map(row => row[0].depth)

  // group boxes by dimensions (ignoring width↔depth swap)
  type GroupInfo = {
    representative: THREE.Object3D
    count: number
    w: number
    d: number
    h: number
    isCombined: boolean
  }
  const groups = new Map<string, GroupInfo>()

  boxGroup.children.forEach((box, idx) => {
    if (!box.visible) return

    const ud = (box.userData.dimensions || {}) as {
      width?: number
      depth?: number
      height?: number
      isCombined?: boolean
    }
    const rawW = ud.width ?? boxWidths[idx % boxWidths.length]
    const rawD = ud.depth ?? boxDepths[Math.floor(idx / boxWidths.length)]
    const h = ud.height ?? state.wallHeight
    const isCombined = ud.isCombined ?? false
    const [w, d] = [rawW, rawD].sort((a, b) => a - b)
    const prefix = isCombined ? 'combined_box' : 'box'
    const key = `${prefix}_${w.toFixed(2)}_${d.toFixed(2)}_${h.toFixed(2)}`

    if (groups.has(key)) {
      groups.get(key)!.count++
    } else {
      groups.set(key, {
        representative: box,
        count: 1,
        w,
        d,
        h,
        isCombined,
      })
    }
  })

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const exporter = new STLExporter()
  let uniqIndex = 1

  for (const [, info] of groups) {
    const { representative, count, w, d, h, isCombined } = info

    // Wrap & rotate so Three's Y-up becomes STL Z-up
    const tmpScene = new THREE.Scene()
    const sceneClone = representative.clone(true)
    sceneClone.position.set(0, 0, 0)
    sceneClone.rotation.set(Math.PI / 2, 0, 0)
    tmpScene.add(sceneClone)
    tmpScene.updateMatrixWorld()

    let stlString: string
    try {
      stlString = exporter.parse(tmpScene, { binary: false })
    } catch {
      stlString = exporter.parse(tmpScene)
    }

    const qtySuffix = count > 1 ? `_qty${count}` : ''
    const filename = `${isCombined ? 'combined_box' : 'box'}_${uniqIndex}_${w.toFixed(0)}x${d.toFixed(0)}x${h.toFixed(0)}mm${qtySuffix}.stl`
    zip.file(filename, stlString)
    uniqIndex++
  }

  // README
  const uniqueCount = groups.size
  const cols = boxWidths.length
  const rows = boxDepths.length
  const readme = `# Box Grid Export

This ZIP contains ${uniqueCount} unique box designs (_qtyN suffix shows multiples_).

## File Naming Convention
- Regular boxes: box_[i]_[W]x[D]x[H]mm[_qtyN].stl  
- Combined boxes: combined_box_[i]_[W]x[D]x[H]mm[_qtyN].stl  

## Grid Layout
- Grid size: ${cols}×${rows}  
- Total width: ${state.totalWidth} mm  
- Total depth: ${state.totalDepth} mm  
- Box height: ${state.wallHeight} mm  
- Wall thickness: ${state.wallThickness} mm  

Thanks for using Box Grid Generator by timoweiss.me!
Happy printing!
`
  zip.file('README.txt', readme)

  const content = await zip.generateAsync({ type: 'blob' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(content)
  link.download = `drawer-inserts-${state.totalWidth}x${state.totalDepth}x${state.wallHeight}-grid.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 100)
}