import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clamp } from '../game/combat';
import type { Fighter, Grapple, MatchResult } from '../game/types';
import { batchRigidParts } from './batch';

export interface FighterVisual { root: THREE.Group; update(fighter: Fighter, grapple: Grapple | null, time: number, dt: number, impact: THREE.Quaternion, result: MatchResult | null): void }
const sphere = new THREE.SphereGeometry(1, 20, 16);
function shape(parent: THREE.Object3D, material: THREE.Material, xyz: number[], scale: number[]) {
  const mesh = new THREE.Mesh(sphere, material); mesh.position.set(xyz[0], xyz[1], xyz[2]); mesh.scale.set(scale[0], scale[1], scale[2]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function bone(parent: THREE.Object3D, name: string, x: number, y: number, z: number) { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); return b; }
function contour(parent: THREE.Object3D, material: THREE.Material, points: number[][], depth: number) {
  const geometry = new THREE.LatheGeometry(points.map(([y, r]) => new THREE.Vector2(r, y)), 24);
  const mesh = new THREE.Mesh(geometry, material); mesh.scale.z = depth; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export class FighterRig implements FighterVisual {
  root = new THREE.Group(); hips: THREE.Bone; spine: THREE.Bone; head: THREE.Bone;
  arms: THREE.Bone[] = []; forearms: THREE.Bone[] = []; legs: THREE.Bone[] = []; shins: THREE.Bone[] = []; skeleton: THREE.Skeleton;
  private skin: THREE.MeshStandardMaterial; private skinBase: THREE.Color; private bruise: THREE.Mesh; private cut: THREE.Mesh; private model: THREE.Group | null = null;
  private mapped = new Map<string, THREE.Object3D>(); private gait = 0;
  constructor(id: number) {
    this.skin = new THREE.MeshStandardMaterial({ color: id ? '#a87558' : '#c58b68', roughness: .66, metalness: .015 }); this.skinBase = this.skin.color.clone();
    const shorts = new THREE.MeshStandardMaterial({ color: id ? '#a92234' : '#215ba2', roughness: .8 });
    const seam = new THREE.MeshStandardMaterial({ color: '#e2ddd0', roughness: .8 });
    const gloves = new THREE.MeshStandardMaterial({ color: '#161b1a', roughness: .48 });
    const wrap = new THREE.MeshStandardMaterial({ color: id ? '#e33d44' : '#428fe0', roughness: .8 });
    const hair = new THREE.MeshStandardMaterial({ color: '#201914', roughness: .98 });
    this.hips = bone(this.root, 'hips', 0, .98, 0);
    shape(this.hips, shorts, [0, -.055, 0], [.225, .2, .155]);
    shape(this.hips, gloves, [0, .08, 0], [.224, .045, .157]);
    this.spine = bone(this.hips, 'spine', 0, .07, 0);
    // A continuous tapered torso avoids the separated spherical-mannequin silhouette.
    contour(this.spine, this.skin, [[-.08,0],[-.07,.15],[0,.185],[.08,.191],[.16,.211],[.25,.246],[.34,.263],[.39,.253],[.435,.2],[.47,.103],[.5,.078],[.51,0]], .59);
    for (const s of [-1, 1]) {
      shape(this.spine, this.skin, [s * .111, .327, .091], [.121, .085, .06]);
      shape(this.spine, this.skin, [s * .068, .17, .104], [.061, .097, .022]);
      shape(this.spine, this.skin, [s * .07, .04, .1], [.059, .076, .018]);
    }
    shape(this.spine, this.skin, [0, .493, 0], [.079, .1, .077]);
    this.head = bone(this.spine, 'head', 0, .623, .018);
    shape(this.head, this.skin, [0, .025, 0], [.116, .155, .111]);
    shape(this.head, this.skin, [0, -.07, .027], [.09, .087, .092]);
    shape(this.head, hair, [0, .102, -.015], [.117, .085, .105]);
    shape(this.head, this.skin, [0, .005, .111], [.029, .047, .036]);
    const eye = new THREE.MeshStandardMaterial({ color: '#151c19', roughness: .36 });
    for (const s of [-1, 1]) {
      shape(this.head, this.skin, [s * .117, .005, 0], [.022, .04, .028]);
      shape(this.head, eye, [s * .045, .03, .099], [.024, .011, .012]);
      shape(this.head, hair, [s * .045, .052, .094], [.033, .009, .015]);
    }
    shape(this.head, hair, [0, -.092, .072], [.074, .034, .022]);
    shape(this.head, new THREE.MeshStandardMaterial({ color: '#694b40' }), [0, -.049, .106], [.037, .007, .009]);
    this.bruise = shape(this.head, new THREE.MeshStandardMaterial({ color: '#7d3541', transparent: true, opacity: 0, roughness: .7 }), [.072, .013, .092], [.034, .027, .012]);
    this.cut = shape(this.head, new THREE.MeshStandardMaterial({ color: '#81211e', transparent: true, opacity: 0 }), [-.048, .07, .099], [.032, .006, .009]);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const upper = bone(this.spine, i ? 'rightUpperArm' : 'leftUpperArm', s * .278, .387, 0);
      contour(upper, this.skin, [[-.322,0],[-.3,.055],[-.25,.065],[-.19,.08],[-.11,.091],[-.035,.09],[.023,.07],[.055,0]], .93);
      const lower = bone(upper, i ? 'rightForeArm' : 'leftForeArm', 0, -.3, 0);
      contour(lower, this.skin, [[-.251,0],[-.235,.043],[-.19,.046],[-.11,.061],[-.04,.063],[.008,.046],[.027,0]], .93);
      shape(lower, wrap, [0, -.226, 0], [.059, .05, .058]);
      shape(lower, gloves, [0, -.289, .008], [.079, .078, .071]);
      shape(lower, wrap, [0, -.29, .069], [.047, .025, .01]);
      this.arms.push(upper); this.forearms.push(lower);
      const thigh = bone(this.hips, i ? 'rightThigh' : 'leftThigh', s * .115, -.11, 0);
      contour(thigh, shorts, [[-.223,0],[-.221,.105],[-.2,.112],[-.07,.125],[.012,.11],[.032,0]], 1.09);
      shape(thigh, this.skin, [0, -.24, 0], [.102, .186, .102]);
      shape(thigh, seam, [s * .119, -.125, .005], [.004, .072, .009]);
      const shin = bone(thigh, i ? 'rightShin' : 'leftShin', 0, -.405, 0);
      shape(shin, this.skin, [0, -.038, .014], [.07, .071, .07]);
      shape(shin, this.skin, [0, -.193, -.011], [.063, .197, .064]);
      shape(shin, this.skin, [0, -.36, .061], [.066, .052, .13]);
      this.legs.push(thigh); this.shins.push(shin);
    }
    const bones: THREE.Bone[] = []; this.root.traverse(o => { if (o instanceof THREE.Bone) bones.push(o); }); this.skeleton = new THREE.Skeleton(bones);
    bones.forEach(batchRigidParts);
  }
  /** Optional GLB uses meters, +Z forward and bone names matching this rig. Keeps procedural fallback until validated. */
  async loadGLB(url: string) {
    const gltf = await new GLTFLoader().loadAsync(url), mapped = new Map<string, THREE.Object3D>();
    for (const b of this.skeleton.bones) { const target = gltf.scene.getObjectByName(b.name); if (!target) throw new Error(`GLB fehlt Bone: ${b.name}`); mapped.set(b.name, target); }
    this.model?.removeFromParent(); this.model = gltf.scene; this.mapped = mapped; this.root.add(gltf.scene); this.hips.visible = false;
    gltf.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  update(f: Fighter, grapple: Grapple | null, time: number, dt: number, impact: THREE.Quaternion, result: MatchResult | null) {
    const speed = Math.hypot(f.velocity.x, f.velocity.z); this.gait += dt * speed * 7;
    const exhaustion = 1 - f.damage.stamina / 100, breath = Math.sin(time * (3.2 + exhaustion * 3)) * (.008 + exhaustion * .009);
    this.root.position.set(f.position.x, 0, f.position.z); this.root.rotation.set(0, f.heading, 0);
    this.hips.position.y = .98 + breath + Math.abs(Math.sin(this.gait)) * .02 * Math.min(1, speed); this.hips.position.z = 0;
    this.hips.rotation.set(0, -.17, 0); this.spine.rotation.set(.045 + exhaustion * .07, .2, 0); this.head.rotation.set(-.06, -.08, 0);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      this.arms[i].rotation.set(-.95, s * -.17, s * .14);
      this.forearms[i].rotation.set(-1.58, 0, s * -.12);
      this.legs[i].rotation.set((i ? .16 : -.19) + Math.sin(this.gait + i * Math.PI) * .32 * Math.min(1, speed), 0, s * .13);
      this.shins[i].rotation.set(.14 + Math.max(0, Math.sin(this.gait + i * Math.PI)) * .3 * Math.min(1, speed), 0, 0);
    }
    if (f.guard) {
      this.spine.rotation.x += .09;
      this.arms.forEach((b, i) => { b.rotation.x = f.guard === 'high' ? -1.32 : -.43; b.rotation.z = i ? -.09 : .09; });
      this.forearms.forEach(b => b.rotation.x = f.guard === 'high' ? -1.45 : -1.95);
    }
    if (f.dodge > 0) { this.spine.rotation.z += Math.sin(f.dodge / .22 * Math.PI) * .32; this.hips.position.y -= .06; }
    if (f.attack) {
      const a = f.attack, t = a.technique, side = t.hand, s = side ? -1 : 1;
      const total = t.windup + t.active + t.recovery;
      const extension = a.elapsed < t.windup ? a.elapsed / t.windup * .15 : a.elapsed < t.windup + t.active ? .15 + Math.sin((a.elapsed - t.windup) / t.active * Math.PI / 2) * .85 : Math.max(0, 1 - (a.elapsed - t.windup - t.active) / t.recovery);
      const weight = Math.sin(Math.min(1, a.elapsed / total) * Math.PI);
      if (!grapple) this.hips.position.z = extension * (t.kind === 'kick' ? .17 : t.hand ? .28 : .21);
      this.spine.rotation.y -= s * weight * .5;
      if (t.kind === 'kick') {
        this.legs[side].rotation.x = -extension * (t.zone === 'head' ? 2.25 : t.zone === 'body' ? 1.66 : 1.1);
        this.legs[side].rotation.z = s * (.13 + weight * .26);
        this.shins[side].rotation.x = .14 + (1 - extension) * weight * 1.5;
        this.spine.rotation.x -= extension * .3; this.arms[side].rotation.z += s * .5 * extension;
        if (t.zone === 'head') this.hips.position.y += extension * .1;
      } else {
        this.arms[side].rotation.x = THREE.MathUtils.lerp(-.95, t.zone === 'body' ? -1.04 : -1.7, extension);
        this.arms[side].rotation.z = t.kind === 'hook' ? s * extension * 1.15 : s * (.14 - extension * .2);
        this.arms[side].rotation.y = t.kind === 'hook' ? s * extension * .85 : 0;
        this.forearms[side].rotation.x = THREE.MathUtils.lerp(-1.58, t.kind === 'hook' ? -.85 : -.1, extension);
        if (t.kind === 'clinchPunch') { this.arms[side].rotation.x = -1.3; this.forearms[side].rotation.x = -1.4 + extension * .7; }
        if (t.kind === 'groundPunch') { this.arms[side].rotation.x = -1.2 + extension * .15; this.forearms[side].rotation.x = -1.6 + extension * 1.5; }
        if (t.zone === 'body') this.spine.rotation.x += weight * .25;
      }
    }
    if (grapple) {
      const top = grapple.top === f.id;
      if (grapple.mode === 'clinch') { this.spine.rotation.x += .24; if (!f.attack) { this.arms.forEach(b => b.rotation.x = -1.5); this.forearms.forEach(b => b.rotation.x = -.9); } }
      else if (grapple.mode === 'takedown') { const t = clamp(grapple.timer / .78, 0, 1); this.hips.position.y -= t * .35; this.spine.rotation.x += top ? t * .9 : -t * .5; }
      else {
        this.hips.position.y = top ? .62 : .22;
        this.hips.rotation.x = top ? .55 : -Math.PI / 2;
        if (!top) { this.hips.position.z = .1; this.spine.rotation.x = -.05; this.legs.forEach(b => b.rotation.x = grapple.position === 'guard' ? -1.3 : -.5); this.shins.forEach(b => b.rotation.x = 1.1); }
        else { this.hips.position.z = 0; this.legs.forEach((b, i) => { b.rotation.x = -.8; b.rotation.z = i ? -.6 : .6; }); this.shins.forEach(b => b.rotation.x = 1.9); if (!f.attack) this.arms.forEach(b => b.rotation.x = -1.1); }
        if (grapple.position === 'halfGuard' && !top) { this.legs[0].rotation.x = -1.1; this.legs[0].rotation.z = .45; }
        if (grapple.position === 'sideControl' && top) { this.hips.rotation.y += .9; this.hips.rotation.x = 1; this.hips.position.y = .5; }
        if (grapple.position === 'mount' && top) { this.hips.rotation.x = .28; this.hips.position.y = .64; this.spine.rotation.x += .18; }
        if (grapple.mode === 'submission') {
          this.hips.rotation.x = top ? -1.15 : -1.5; this.hips.position.y = .28;
          if (top) { this.hips.rotation.y += Math.PI / 2; this.legs.forEach(b => b.rotation.x = -.95); this.shins.forEach(b => b.rotation.x = .3); this.arms.forEach(b => b.rotation.x = -1.5); this.forearms.forEach(b => b.rotation.x = -.65); }
          else { this.arms[0].rotation.x = -2.5; this.forearms[0].rotation.x = -.1; }
        }
        if (grapple.transition) this.hips.rotation.z += Math.sin(grapple.transition.elapsed * Math.PI / .8) * .2;
      }
    }
    if (f.state === 'knockedDown' || (result && result.winner !== f.id && ['KO','TKO'].includes(result.method))) {
      this.hips.position.y = .23; this.hips.rotation.x = -Math.PI / 2; this.spine.rotation.x = -.1; this.legs.forEach(b => b.rotation.x = -.25); this.shins.forEach(b => b.rotation.x = .45); this.arms.forEach((b, i) => { b.rotation.x = -.4; b.rotation.z = i ? -.65 : .65; });
    }
    if (result?.winner === f.id) { this.arms.forEach((b, i) => { b.rotation.x = -2.9; b.rotation.z = i ? -.35 : .35; }); this.forearms.forEach(b => b.rotation.x = -.35); }
    this.spine.quaternion.multiply(impact);
    this.head.rotation.x += f.reaction * .32; this.head.rotation.z += f.reaction * f.reactionSide * .25;
    this.skin.color.copy(this.skinBase).lerp(new THREE.Color('#ab665e'), Math.min(.24, f.damage.body / 350));
    (this.bruise.material as THREE.MeshStandardMaterial).opacity = f.swelling * .65;
    (this.cut.material as THREE.MeshStandardMaterial).opacity = Math.max(0, f.cut - .25);
    if (this.model) for (const b of this.skeleton.bones) { const mapped = this.mapped.get(b.name)!; mapped.quaternion.copy(b.quaternion); if (b === this.hips) mapped.position.copy(b.position); }
  }
}
