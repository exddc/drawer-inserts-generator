import JSZip from 'jszip'
import * as THREE from 'three'

type ThreeMfMesh = {
    vertices: THREE.Vector3[]
    triangles: [number, number, number][]
}

/** Serialize printable meshes as a standards-based 3MF OPC package. */
export async function exportThreeMf(
    object: THREE.Object3D,
    title: string
): Promise<Uint8Array> {
    object.updateMatrixWorld(true)
    const meshes = collectMeshes(object)
    if (meshes.length === 0)
        throw new Error('Cannot export an empty 3MF model.')

    const resources = meshes
        .map(
            (mesh, index) => `
        <object id="${index + 1}" type="model">
            <mesh>
                <vertices>
${mesh.vertices
    .map(
        (vertex) =>
            `                    <vertex x="${number(vertex.x)}" y="${number(vertex.y)}" z="${number(vertex.z)}"/>`
    )
    .join('\n')}
                </vertices>
                <triangles>
${mesh.triangles
    .map(
        ([v1, v2, v3]) =>
            `                    <triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`
    )
    .join('\n')}
                </triangles>
            </mesh>
        </object>`
        )
        .join('')
    const buildItems = meshes
        .map((_, index) => `        <item objectid="${index + 1}"/>`)
        .join('\n')
    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
    <metadata name="Title">${escapeXml(title)}</metadata>
    <metadata name="Application">Box Grid Generator</metadata>
    <resources>${resources}
    </resources>
    <build>
${buildItems}
    </build>
</model>`

    const zip = new JSZip()
    zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`
    )
    zip.folder('_rels')!.file(
        '.rels',
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`
    )
    zip.folder('3D')!.file('3dmodel.model', modelXml)

    return zip.generateAsync({
        type: 'uint8array',
        mimeType: 'model/3mf',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    })
}

function collectMeshes(object: THREE.Object3D): ThreeMfMesh[] {
    const meshes: ThreeMfMesh[] = []
    object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const position = child.geometry.getAttribute('position')
        const index = child.geometry.getIndex()
        const vertices = Array.from(
            { length: position.count },
            (_, vertexIndex) =>
                new THREE.Vector3()
                    .fromBufferAttribute(position, vertexIndex)
                    .applyMatrix4(child.matrixWorld)
        )
        const triangleIndices = index
            ? Array.from({ length: index.count }, (_, item) => index.getX(item))
            : Array.from({ length: position.count }, (_, item) => item)
        const triangles: [number, number, number][] = []
        for (let item = 0; item < triangleIndices.length; item += 3) {
            triangles.push([
                triangleIndices[item],
                triangleIndices[item + 1],
                triangleIndices[item + 2],
            ])
        }
        meshes.push({ vertices, triangles })
    })
    return meshes
}

function number(value: number): string {
    return Number(value.toFixed(6)).toString()
}

function escapeXml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
}
