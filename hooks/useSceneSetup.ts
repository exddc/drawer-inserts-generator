import { useEffect, RefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { setupGrid } from '@/lib/gridGenerator'
import { useBoxStore } from '@/lib/store'

/**
 * Custom hook to set up the Three.js scene, camera, renderer, and controls
 */
export function useSceneSetup(
    containerRef: RefObject<HTMLDivElement>,
    rendererRef: RefObject<THREE.WebGLRenderer>,
    sceneRef: RefObject<THREE.Scene>,
    cameraRef: RefObject<THREE.PerspectiveCamera>,
    controlsRef: RefObject<OrbitControls>,
    boxMeshGroupRef: RefObject<THREE.Group>,
    gridHelperRef: RefObject<THREE.GridHelper>,
    axesHelperRef: RefObject<THREE.AxesHelper>,
    raycasterRef: RefObject<THREE.Raycaster>,
    mouseRef: RefObject<THREE.Vector2>
) {
    const { width, depth, debugMode } = useBoxStore()

    useEffect(() => {
        if (!containerRef.current) return

        // Initialize scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xffffff)
        sceneRef.current = scene

        // Set up camera
        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        )
        camera.position.set(-110, -130, 110)
        camera.up.set(0, 0, 1)
        cameraRef.current = camera

        // Set up renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })
        renderer.setSize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
        )
        renderer.shadowMap.enabled = true
        renderer.info.autoReset = false
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Set up controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        }
        controlsRef.current = controls

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(150, 200, 100)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight2.position.set(-150, 50, -100)
        directionalLight2.castShadow = true
        scene.add(directionalLight2)

        // Set up grid and axes
        const gridHelper = setupGrid(scene, width, depth)
        // @ts-ignore - To be fixed
        gridHelperRef.current = gridHelper
        scene.rotateX(Math.PI / 2) // Make Z the up direction for easier placement in CAD or Slicer Software

        const axesHelper = new THREE.AxesHelper(100)
        scene.add(axesHelper)
        axesHelperRef.current = axesHelper

        // Create box group
        const boxGroup = new THREE.Group()
        scene.add(boxGroup)
        boxMeshGroupRef.current = boxGroup

        // Set up raycaster
        raycasterRef.current = new THREE.Raycaster()

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate)
            if (controlsRef.current) controlsRef.current.update()
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                if (debugMode) {
                    rendererRef.current.info.reset()
                }
                rendererRef.current.render(sceneRef.current, cameraRef.current)
            }
        }
        animate()

        // Handle window resize
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return

            cameraRef.current.aspect = 
                containerRef.current.clientWidth / containerRef.current.clientHeight
            cameraRef.current.updateProjectionMatrix()
            rendererRef.current.setSize(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
            )
        }
        window.addEventListener('resize', handleResize)

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize)
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement)
            }
        }
    }, [])

    // Debug Mode effect
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.info.autoReset = !debugMode
        }
    }, [debugMode])

    return null
}