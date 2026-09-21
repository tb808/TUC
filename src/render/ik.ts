import * as THREE from 'three';

const down = new THREE.Vector3(0, -1, 0);
const origin = new THREE.Vector3(), direction = new THREE.Vector3(), bend = new THREE.Vector3();
const joint = new THREE.Vector3(), local = new THREE.Vector3(), end = new THREE.Vector3();

/** Two-bone IK with a stable elbow/knee pole and a small bend at full extension. */
export function solveLimb(upper: THREE.Bone, lower: THREE.Bone, target: THREE.Vector3, pole: THREE.Vector3, lengthA: number, lengthB: number) {
  upper.parent!.updateWorldMatrix(true, false);
  origin.copy(upper.position); upper.parent!.localToWorld(origin);
  direction.subVectors(target, origin);
  const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(lengthA - lengthB) + .005, lengthA + lengthB - .006);
  direction.normalize();
  bend.copy(pole).addScaledVector(direction, -pole.dot(direction));
  if (bend.lengthSq() < .00001) bend.set(1, 0, 0).addScaledVector(direction, -direction.x);
  bend.normalize();
  const along = (lengthA * lengthA - lengthB * lengthB + distance * distance) / (2 * distance);
  joint.copy(origin).addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, lengthA * lengthA - along * along)));
  local.copy(joint); upper.parent!.worldToLocal(local); local.sub(upper.position).normalize();
  upper.quaternion.setFromUnitVectors(down, local);
  upper.updateWorldMatrix(false, true);
  end.copy(origin).addScaledVector(direction, distance);
  upper.worldToLocal(end); end.sub(lower.position).normalize();
  lower.quaternion.setFromUnitVectors(down, end);
  lower.updateWorldMatrix(false, true);
}
