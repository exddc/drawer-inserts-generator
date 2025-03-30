import { useEffect, RefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { setupGrid } from '@/lib/gridGenerator'
import { useBoxStore } from '@/lib/store'

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

    // Initialize scene, camera, renderer
    useEffect(() => {
        if (!containerRef.current) return

        // Scene setup
        const scene = initializeScene()
        sceneRef.current = scene

        // Camera setup
        const camera = initializeCamera(containerRef.current)
        cameraRef.current = camera

        // Renderer setup
        const renderer = initializeRenderer(containerRef.current)
        rendererRef.current = renderer

        // Controls setup
        const controls = initializeControls(camera, renderer.domElement)
        controlsRef.current = controls

        // Lighting setup
        setupLighting(scene)

        // Grid and axes setup
        const gridHelper = setupGrid(scene, width, depth)
        gridHelperRef.current = gridHelper

        const axesHelper = new THREE.AxesHelper(100)
        scene.add(axesHelper)
        axesHelperRef.current = axesHelper

        // Box group setup
        const boxGroup = new THREE.Group()
        scene.add(boxGroup)
        boxMeshGroupRef.current = boxGroup

        // Raycaster setup
        raycasterRef.current = new THREE.Raycaster()

        // Animation loop
        const animate = createAnimationLoop(
            controlsRef,
            rendererRef,
            sceneRef,
            cameraRef,
            debugMode
        )
        
        animate()

        // Handle window resize
        const handleResize = createResizeHandler(
            containerRef,
            cameraRef,
            rendererRef
        )
        
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

// Helper functions
function initializeScene(): THREE.Scene {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    scene.rotateX(Math.PI / 2) // Make Z the up direction for easier placement in CAD or Slicer Software
    return scene
}

function initializeCamera(container: HTMLDivElement): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    )
    camera.position.set(-110, -130, 110)
    camera.up.set(0, 0, 1)
    return camera
}

function initializeRenderer(container: HTMLDivElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.info.autoReset = false
    container.appendChild(renderer.domElement)
    return renderer
}

function initializeControls(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLCanvasElement
): OrbitControls {
    const controls = new OrbitControls(camera, domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
    }
    return controls
}

function setupLighting(scene: THREE.Scene): void {
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
}

function createAnimationLoop(
    controlsRef: RefObject<OrbitControls>,
    rendererRef: RefObject<THREE.WebGLRenderer>,
    sceneRef: RefObject<THREE.Scene>,
    cameraRef: RefObject<THREE.PerspectiveCamera>,
    debugMode: boolean
): () => void {
    return function animate() {
        requestAnimationFrame(animate)
        if (controlsRef.current) controlsRef.current.update()
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            if (debugMode) {
                rendererRef.current.info.reset()
            }
            rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
    }
}

function createResizeHandler(
    containerRef: RefObject<HTMLDivElement>,
    cameraRef: RefObject<THREE.PerspectiveCamera>,
    rendererRef: RefObject<THREE.WebGLRenderer>
): () => void {
    return function handleResize() {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return

        cameraRef.current.aspect = 
            containerRef.current.clientWidth / containerRef.current.clientHeight
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
        )
    }
}