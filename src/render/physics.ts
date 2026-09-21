import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { CombatEvent } from '../game/types';
import type { Combat } from '../game/combat';
export class ImpactPhysics {
  world!: RAPIER.World;
  torsos: RAPIER.RigidBody[] = []; anchors: RAPIER.RigidBody[] = []; bodies: RAPIER.RigidBody[] = [];
  async init() {
    await RAPIER.init(); this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(.1, 1.4, 1.94).setTranslation(Math.cos(a) * 4.75, 1.4, Math.sin(a) * 4.75).setRotation(q));
    }
    for (let i = 0; i < 2; i++) {
      const anchor = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(i * 3, 8, 0));
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(i * 3, 8, 0).setAngularDamping(5).setLinearDamping(8));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(.23, .3, .15).setMass(4).setCollisionGroups(0), body);
      this.world.createImpulseJoint(RAPIER.JointData.spherical({ x: 0, y: -.22, z: 0 }, { x: 0, y: -.22, z: 0 }), anchor, body, true);
      this.anchors.push(anchor); this.torsos.push(body);
      const root = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(i ? 1.5 : -1.5, .95, 0));
      this.world.createCollider(RAPIER.ColliderDesc.capsule(.5, .3), root); this.bodies.push(root);
    }
  }
  step(match: Combat) {
    for (let i = 0; i < 2; i++) {
      const f = match.fighters[i]; this.bodies[i].setNextKinematicTranslation({ x: f.position.x, y: .95, z: f.position.z });
      const b = this.torsos[i], q = b.rotation(), av = b.angvel();
      b.setAngvel({ x: av.x * .86 - q.x * 8, y: av.y * .86 - q.y * 8, z: av.z * .86 - q.z * 8 }, true);
    }
    this.world.timestep = 1 / 60; this.world.step();
  }
  hit(event: Extract<CombatEvent, { type: 'hit' }>) { const s = Math.min(1, event.strength / 14); this.torsos[event.target]?.applyTorqueImpulse({ x: s * -.16, y: s * .08, z: s * (event.attacker ? .12 : -.12) }, true); }
  rotation(id: number) { const r = this.torsos[id]?.rotation(); return r ? new THREE.Quaternion(r.x, r.y, r.z, r.w) : new THREE.Quaternion(); }
}
