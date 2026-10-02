import * as THREE from 'three';
import type { CombatEvent } from '../game/types';

/** Small, bounded pool: no geometry/material creation or destruction during contact. */
export class ImpactParticles {
  readonly root = new THREE.Group();
  private geometry = new THREE.SphereGeometry(1, 4, 3);
  private slots = Array.from({ length: 28 }, () => {
    const material = new THREE.MeshBasicMaterial({ color: '#dce5ee', transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(this.geometry, material); mesh.visible = false; this.root.add(mesh);
    return { mesh, material, velocity: new THREE.Vector3(), life: 0 };
  });
  private cursor = 0;
  emit(event: Extract<CombatEvent, { type: 'hit' }>, point: THREE.Vector3) {
    const count = event.strength < 6 ? 2 : Math.min(7, Math.floor(event.strength / 2));
    for (let i = 0; i < count; i++) {
      const slot = this.slots[this.cursor++ % this.slots.length];
      const blood = event.zone === 'head' && event.strength > 14 && i === 0;
      slot.life = .27; slot.mesh.visible = true; slot.mesh.position.copy(point); slot.mesh.scale.setScalar(blood ? .009 : .005);
      slot.material.color.set(blood ? '#763239' : '#dce5ee'); slot.material.opacity = .55;
      slot.velocity.set((event.direction?.x ?? 0) * .45 + (Math.random() - .5) * .6, .35 + Math.random() * .5, (event.direction?.z ?? 0) * .45 + (Math.random() - .5) * .6);
    }
  }
  update(dt: number) {
    for (const slot of this.slots) if (slot.life > 0) {
      slot.life = Math.max(0, slot.life - dt); slot.velocity.y -= dt * 5; slot.mesh.position.addScaledVector(slot.velocity, dt);
      slot.material.opacity = slot.life * 2; slot.mesh.visible = slot.life > 0;
    }
  }
}
