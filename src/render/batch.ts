import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch only rigid sibling parts with the exact same material. Bone boundaries stay intact. */
export function batchRigidParts(parent: THREE.Object3D) {
  const buckets = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of [...parent.children]) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material) || child.children.length) continue;
    const group = buckets.get(child.material) ?? []; group.push(child); buckets.set(child.material, group);
  }
  for (const [material, meshes] of buckets) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
    const geometry = mergeGeometries(parts);
    parts.forEach(part => part.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = meshes.some(m => m.castShadow); mesh.receiveShadow = meshes.some(m => m.receiveShadow);
    meshes.forEach(m => m.removeFromParent()); parent.add(mesh);
  }
}
