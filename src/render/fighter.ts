import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clamp } from '../game/combat';
import type { Fighter, Grapple, MatchResult } from '../game/types';
import { batchRigidParts } from './batch';
import { strikeLocal, strikeMotion, smooth } from '../game/motion';
import { fabricMaterial, skinMaterial } from './materials';
import { solveLimb } from './ik';
import { FIGHTERS, type FighterProfile } from '../game/fighters';

export interface FighterVisual { root: THREE.Group; update(fighter: Fighter, grapple: Grapple | null, time: number, dt: number, impact: THREE.Quaternion, result: MatchResult | null): void }
const sphere = new THREE.SphereGeometry(1, 28, 20);
function shape(parent: THREE.Object3D, material: THREE.Material, xyz: number[], scale: number[]) {
  const mesh = new THREE.Mesh(sphere, material); mesh.position.set(xyz[0], xyz[1], xyz[2]); mesh.scale.set(scale[0], scale[1], scale[2]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function bone(parent: THREE.Object3D, name: string, x: number, y: number, z: number) { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); return b; }
function contour(parent: THREE.Object3D, material: THREE.Material, points: number[][], depth: number) {
  const curve = new THREE.SplineCurve(points.map(([y, r]) => new THREE.Vector2(r, y)));
  const geometry = new THREE.LatheGeometry(curve.getPoints(points.length * 3).map(p => new THREE.Vector2(Math.max(0, p.x), p.y)), 32);
  geometry.scale(1, 1, depth);
  if (parent.name === 'spine') {
    const vertices = geometry.getAttribute('position');
    const bump = (x: number, y: number, cx: number, cy: number, wx: number, wy: number) => Math.exp(-(((x - cx) / wx) ** 2) - ((y - cy) / wy) ** 2);
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      if (z <= 0) continue;
      let sculpt = 0;
      for (const s of [-1, 1]) {
        sculpt += .012 * bump(x, y, s * .105, .325, .105, .065);
        for (let row = 0; row < 3; row++) sculpt += .0035 * bump(x, y, s * .045, .2 - row * .061, .034, .025);
        sculpt += .004 * bump(x, y, s * .11, .422, .09, .009);
      }
      vertices.setZ(i, z + sculpt * Math.min(1, z / .08));
    }
    geometry.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export class FighterRig implements FighterVisual {
  root = new THREE.Group(); hips: THREE.Bone; spine: THREE.Bone; head: THREE.Bone;
  arms: THREE.Bone[] = []; forearms: THREE.Bone[] = []; legs: THREE.Bone[] = []; shins: THREE.Bone[] = []; feet: THREE.Bone[] = []; skeleton: THREE.Skeleton;
  private skin: THREE.MeshPhysicalMaterial; private skinBase: THREE.Color; private bruise: THREE.Mesh; private cut: THREE.Mesh; private model: THREE.Group | null = null;
  private mapped = new Map<string, THREE.Object3D>(); private gait = 0;
  private poses: THREE.Quaternion[] = []; private hipPosition = new THREE.Vector3(); private initialized = false;
  private feetPlanted = false; private stepSide = 0; private stepTime = 1;
  private footTargets = [new THREE.Vector3(), new THREE.Vector3()];
  private stepFrom = new THREE.Vector3(); private stepTo = new THREE.Vector3();
  private previousRoot = new THREE.Vector3();
  constructor(id: number, profile: FighterProfile = FIGHTERS[id]) {
    const look = profile.visual;
    this.root.scale.set(look.build, .96 + look.build * .04, look.build);
    this.skin = skinMaterial(look.skin); this.skinBase = this.skin.color.clone();
    const shorts = fabricMaterial(look.shorts);
    const seam = new THREE.MeshStandardMaterial({ color: look.accent, roughness: .8 });
    const gloves = new THREE.MeshPhysicalMaterial({ color: '#171a1d', roughness: .43, clearcoat: .28, clearcoatRoughness: .45 });
    const wrap = new THREE.MeshStandardMaterial({ color: id ? '#e33d44' : '#428fe0', roughness: .8 });
    const hair = new THREE.MeshStandardMaterial({ color: look.hair, roughness: .98 });
    this.hips = bone(this.root, 'hips', 0, .98, 0);
    this.hips.rotation.order = 'YXZ';
    contour(this.hips, shorts, [[-.22,0],[-.2,.155],[-.12,.204],[.03,.193],[.07,.182],[.075,0]], .73);
    shape(this.hips, gloves, [0, .066, 0], [.186, .025, .137]);
    this.spine = bone(this.hips, 'spine', 0, .07, 0);
    // A continuous tapered torso avoids the separated spherical-mannequin silhouette.
    contour(this.spine, this.skin, [[-.08,0],[-.07,.15],[0,.185],[.08,.191],[.16,.211],[.25,.246],[.34,.263],[.39,.253],[.435,.2],[.47,.103],[.5,.078],[.51,0]], .59);
    for (const s of [-1, 1]) {
      shape(this.spine, new THREE.MeshStandardMaterial({ color: look.skin, roughness: .78 }), [s * .13, .311, .14], [.008, .006, .002]);
    }
    shape(this.spine, this.skin, [0, .493, 0], [.079, .1, .077]);
    this.head = bone(this.spine, 'head', 0, .623, .018);
    contour(this.head, this.skin, [[-.143,0],[-.131,.042],[-.115,.062],[-.082,.086],[-.032,.098],[.028,.104],[.095,.091],[.145,.053],[.168,0]], 1.02);
    if (look.hairStyle !== 'bald') {
      const height = look.hairStyle === 'high' ? .178 : look.hairStyle === 'swept' ? .143 : .151;
      const scalp = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, look.hairStyle === 'buzz' ? .91 : 1.28), hair);
      scalp.position.set(0, look.hairStyle === 'high' ? .055 : .025, 0); scalp.scale.set(.111, height, .113); scalp.castShadow = true; this.head.add(scalp);
      if (look.hairStyle === 'high') shape(this.head, hair, [0, .149, -.015], [.092, .071, .085]);
      if (look.hairStyle === 'swept') {
        shape(this.head, hair, [.046, .125, .025], [.08, .039, .087]);
        shape(this.head, hair, [-.103, .008, -.034], [.032, .138, .07]);
      }
    }
    shape(this.head, this.skin, [0, .004, .101], [.019, .042, .032]);
    shape(this.head, this.skin, [0, -.018, .123], [.026, .015, .014]);
    const eye = new THREE.MeshStandardMaterial({ color: '#151c19', roughness: .36 });
    const whites = new THREE.MeshStandardMaterial({ color: '#b8b5a8', roughness: .42 });
    const iris = new THREE.MeshStandardMaterial({ color: profile.id === 'tyler' ? '#46636a' : '#433d2e', roughness: .26 });
    for (const s of [-1, 1]) {
      shape(this.head, this.skin, [s * .105, .001, -.005], [.016, .031, .021]);
      shape(this.head, this.skin, [s * .049, -.008, .074], [.039, .027, .019]);
      shape(this.head, whites, [s * .041, .027, .096], [.019, .008, .007]);
      shape(this.head, iris, [s * .041, .027, .102], [.006, .0065, .002]);
      shape(this.head, eye, [s * .041, .027, .104], [.0028, .004, .001]);
      shape(this.head, this.skin, [s * .041, .041, .094], [.027, .014, .013]);
      shape(this.head, hair, [s * .041, .05, .096], [.029, .005, .01]);
      shape(this.head, eye, [s * .012, -.026, .125], [.004, .0025, .002]);
    }
    if (look.beard) shape(this.head, hair, [0, -.097, .059], [.073, .026, .026]);
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
      shape(lower, gloves, [0, -.289, .008], [.068, .069, .064]);
      shape(lower, wrap, [0, -.29, .069], [.047, .025, .01]);
      for (let finger = 0; finger < 4; finger++) {
        const x = (finger - 1.5) * .025;
        shape(lower, gloves, [x, -.323, .026], [.017, .022, .044]);
        shape(lower, this.skin, [x, -.345, .019], [.012, .018, .023]);
      }
      shape(lower, this.skin, [s * .062, -.285, .026], [.022, .033, .022]);
      this.arms.push(upper); this.forearms.push(lower);
      const thigh = bone(this.hips, i ? 'rightThigh' : 'leftThigh', s * .115, -.11, 0);
      contour(thigh, shorts, [[-.224,.095],[-.22,.098],[-.18,.108],[-.07,.119],[.012,.107],[.032,0]], 1.06);
      contour(thigh, this.skin, [[-.43,0],[-.41,.061],[-.36,.07],[-.26,.089],[-.17,.101],[-.07,.108],[0,0]], 1.04);
      shape(thigh, seam, [s * .119, -.125, .005], [.004, .072, .009]);
      const shin = bone(thigh, i ? 'rightShin' : 'leftShin', 0, -.405, 0);
      shape(shin, this.skin, [0, -.01, .019], [.057, .049, .055]);
      contour(shin, this.skin, [[-.42,0],[-.404,.035],[-.34,.039],[-.23,.05],[-.14,.066],[-.065,.063],[0,.052],[.02,0]], 1.04);
      const foot = bone(shin, i ? 'rightFoot' : 'leftFoot', 0, -.405, 0);
      shape(foot, this.skin, [0, -.021, .039], [.052, .043, .112]);
      for (let toe = 0; toe < 5; toe++) shape(foot, this.skin, [(toe - 2) * .018, -.027, .12 - Math.abs(toe - (i ? 0 : 4)) * .007], [.013, .022, .034]);
      this.feet.push(foot);
      this.legs.push(thigh); this.shins.push(shin);
    }
    const bones: THREE.Bone[] = []; this.root.traverse(o => { if (o instanceof THREE.Bone) bones.push(o); }); this.skeleton = new THREE.Skeleton(bones);
    bones.forEach(batchRigidParts);
    this.poses = bones.map(b => b.quaternion.clone());
  }
  dispose() {
    const materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
    this.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    geometries.forEach(geometry => { if (geometry !== sphere) geometry.dispose(); });
    materials.forEach(material => material.dispose());
  }
  /** Optional GLB uses meters, +Z forward and bone names matching this rig. Keeps procedural fallback until validated. */
  async loadGLB(url: string) {
    const gltf = await new GLTFLoader().loadAsync(url), mapped = new Map<string, THREE.Object3D>();
    for (const b of this.skeleton.bones) { const target = gltf.scene.getObjectByName(b.name); if (!target) throw new Error(`GLB fehlt Bone: ${b.name}`); mapped.set(b.name, target); }
    this.model?.removeFromParent(); this.model = gltf.scene; this.mapped = mapped; this.root.add(gltf.scene); this.hips.visible = false;
    gltf.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  update(f: Fighter, grapple: Grapple | null, time: number, dt: number, impact: THREE.Quaternion, result: MatchResult | null) {
    if (this.initialized && dt <= 0) return;
    const speed = Math.hypot(f.velocity.x, f.velocity.z); this.gait += dt * speed * 7;
    const exhaustion = 1 - f.damage.stamina / 100, breath = Math.sin(time * (2.6 + exhaustion * 2)) * (.003 + exhaustion * .005);
    const lead = f.stance === 'orthodox' ? 0 : 1, rear = lead ? 0 : 1, stanceSide = f.stance === 'orthodox' ? 1 : -1;
    this.root.position.set(f.position.x, 0, f.position.z); this.root.rotation.set(0, f.heading, 0);
    this.hips.position.set(0, .94 + breath - Math.abs(Math.sin(this.gait)) * .009 * Math.min(1, speed), 0);
    this.hips.rotation.set(0, -.18 * stanceSide, 0); this.spine.rotation.set(.025 + exhaustion * .065, .16 * stanceSide, 0); this.head.rotation.set(.06, -.04 * stanceSide, 0);
    const lateral = f.velocity.x * Math.cos(f.heading) - f.velocity.z * Math.sin(f.heading);
    this.spine.rotation.z -= lateral * .025;
    this.head.rotation.y += Math.sin(time * .7 + f.id) * .018;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const leading = i === lead;
      this.arms[i].rotation.set(leading ? -.92 : -.73, s * -.12, s * .15);
      this.forearms[i].rotation.set(leading ? -1.78 : -1.98, 0, s * -.12);
      this.legs[i].rotation.set(leading ? -.27 : .17, 0, s * .08);
      this.shins[i].rotation.set(.3, 0, 0); this.feet[i].rotation.set(0, 0, 0);
    }
    this.spine.rotation.z += Math.sin(time * 1.8 + f.id) * .006;
    this.forearms[lead].rotation.z += Math.sin(time * 2.1 + f.id) * .012;
    if (f.guard) {
      this.spine.rotation.x += .06; this.head.rotation.x += .08;
      this.arms.forEach((b, i) => { b.rotation.x = f.guard === 'high' ? -1.02 : -.45; b.rotation.z = i ? -.09 : .09; });
      this.forearms.forEach(b => b.rotation.x = f.guard === 'high' ? -1.98 : -1.55);
    }
    if (f.defenseTime > 0) {
      const amount = smooth(clamp(f.defenseTime / (f.defense === 'parry' ? .18 : f.defense === 'check' ? .3 : .28), 0, 1));
      if (f.defense === 'parry') { this.arms[lead].rotation.y += stanceSide * .48 * amount; this.forearms[lead].rotation.z -= stanceSide * .32 * amount; this.spine.rotation.y -= stanceSide * .18 * amount; }
      if (f.defense === 'slipLeft' || f.defense === 'slipRight') { const direction = f.defense === 'slipLeft' ? -1 : 1; this.spine.rotation.z += direction * .32 * amount; this.head.rotation.z -= direction * .17 * amount; this.hips.position.x += direction * .08 * amount; }
      if (f.defense === 'pull') { this.spine.rotation.x -= .31 * amount; this.head.rotation.x += .15 * amount; this.hips.position.z -= .11 * amount; }
      if (f.defense === 'check') { this.legs[lead].rotation.x = -1.05 * amount; this.legs[lead].rotation.z = stanceSide * .48 * amount; this.shins[lead].rotation.x = 1.48 * amount; this.arms.forEach(b => b.rotation.x = -1.05); }
    }
    if (f.attack) {
      const a = f.attack, t = a.technique, side = t.hand ? rear : lead, s = side ? -1 : 1;
      const { extension, preparation } = strikeMotion(a), weight = extension;
      const legStrike = ['kick', 'frontKick', 'sideKick', 'knee'].includes(t.kind);
      if (!grapple) {
        this.hips.position.z = extension * (legStrike ? .03 : t.hand ? .18 : .12) - preparation * .024;
        this.hips.position.x = s * (legStrike ? -.055 : .018) * extension;
        this.hips.rotation.y += s * (preparation * .12 - extension * (t.kind === 'kick' || t.kind === 'sideKick' ? .65 : .23));
      }
      this.spine.rotation.y += s * (preparation * .13 - extension * .34); this.head.rotation.y -= this.spine.rotation.y * .45;
      if (legStrike) {
        const chamber = Math.max(preparation * .75, extension);
        if (t.kind === 'frontKick') {
          this.legs[side].rotation.set(-1.5 * chamber, 0, s * .08); this.shins[side].rotation.x = 1.8 * preparation + .12 * extension; this.feet[side].rotation.x = -.55 * extension;
          this.hips.position.z += extension * .14; this.spine.rotation.x += extension * .07;
        } else if (t.kind === 'sideKick') {
          this.hips.rotation.y += s * extension * 1.05; this.legs[side].rotation.set(-1.42 * chamber, -s * 1.05 * extension, s * .32); this.shins[side].rotation.x = 1.65 * preparation + .08 * extension; this.feet[side].rotation.x = -.7 * extension;
          this.spine.rotation.z -= s * extension * .28;
        } else if (t.kind === 'knee') {
          this.legs[side].rotation.set(-chamber * (t.zone === 'head' ? 2.18 : 1.62), 0, s * .16); this.shins[side].rotation.x = 1.95 - extension * .18; this.feet[side].rotation.x = .24;
          this.hips.position.z += extension * .17; this.hips.position.y += extension * .06; this.spine.rotation.x += extension * .12;
        } else {
          this.legs[side].rotation.set(-chamber * (t.zone === 'head' ? 2.5 : t.zone === 'body' ? 1.9 : 1.12), -s * extension * .3, s * (.1 + extension * .23));
          this.shins[side].rotation.x = .14 + preparation * 1.65 + (1 - extension) * chamber * .85; this.feet[side].rotation.x = -.25 * extension;
          this.spine.rotation.x -= extension * .18; this.spine.rotation.z -= s * extension * .19;
        }
        this.arms[side].rotation.x += extension * .4; this.arms[side].rotation.z += s * .32 * extension; this.hips.position.y += extension * .025;
      } else {
        this.arms[side].rotation.x -= preparation * .13; this.arms[side].rotation.z += s * preparation * .08;
        if (t.kind === 'clinchPunch') { this.arms[side].rotation.x = -1.3; this.forearms[side].rotation.x = -1.4 + extension * .7; }
        if (t.kind === 'groundPunch') { this.arms[side].rotation.x = -1.2 + extension * .15; this.forearms[side].rotation.x = -1.6 + extension * 1.5; }
        if (t.kind === 'uppercut') { this.arms[side].rotation.x = -.35 - extension * .8; this.arms[side].rotation.z = s * (.2 - extension * .18); this.forearms[side].rotation.x = -1.82 + extension * .85; this.spine.rotation.x += .17 * preparation - .21 * extension; this.hips.position.y -= preparation * .05; }
        if (t.kind === 'elbow') { this.arms[side].rotation.x = -1.2; this.arms[side].rotation.y = s * extension * .7; this.arms[side].rotation.z = s * (.25 + extension * .8); this.forearms[side].rotation.x = -2.18; this.spine.rotation.y -= s * extension * .55; }
        if (t.zone === 'body') { this.spine.rotation.x += weight * .19; this.hips.position.y -= weight * .045; } else this.spine.rotation.x -= extension * .09;
        if (!grapple && t.kind !== 'elbow') {
          this.root.updateMatrixWorld(true); const tip = strikeLocal(a);
          const resting = new THREE.Vector3(0, -.289, 0); this.forearms[side].localToWorld(resting);
          const target = this.root.localToWorld(new THREE.Vector3(tip.x, tip.y, tip.z)); resting.lerp(target, smooth(extension / .8));
          const pole = new THREE.Vector3(s * (t.kind === 'hook' ? 1 : .65), t.kind === 'uppercut' ? .8 : t.kind === 'hook' ? .08 : -.7, -.1).applyQuaternion(this.root.quaternion);
          solveLimb(this.arms[side], this.forearms[side], resting, pole, .3, .289);
        }
      }
    }
    if (grapple) {
      const top = grapple.top === f.id;
      if (grapple.mode === 'clinch') { this.spine.rotation.x += .24; if (!f.attack) { this.arms.forEach(b => b.rotation.x = -1.5); this.forearms.forEach(b => b.rotation.x = -.9); } }
      else if (grapple.mode === 'takedown') {
        const t = smooth(clamp(grapple.timer / .78, 0, 1));
        this.hips.position.y = THREE.MathUtils.lerp(this.hips.position.y, top ? .58 : .19, t);
        this.hips.rotation.x = THREE.MathUtils.lerp(this.hips.rotation.x, top ? 1.05 : -1.45, t);
        this.spine.rotation.x += t * (top ? .07 : -.1);
        this.head.rotation.x += t * (top ? .1 : -.12);
        for (let i = 0; i < 2; i++) {
          const sign = i ? -1 : 1;
          this.legs[i].rotation.x = THREE.MathUtils.lerp(this.legs[i].rotation.x, top ? -.75 : -1.1, t);
          this.legs[i].rotation.z += sign * t * .25;
          this.shins[i].rotation.x = THREE.MathUtils.lerp(this.shins[i].rotation.x, top ? .88 : 1.15, t);
          this.arms[i].rotation.x = THREE.MathUtils.lerp(this.arms[i].rotation.x, top ? -1.4 : -1.1, t);
          this.forearms[i].rotation.x = THREE.MathUtils.lerp(this.forearms[i].rotation.x, -1.4, t);
        }
      }
      else {
        const positions = ['guard', 'halfGuard', 'sideControl', 'mount'] as const;
        const transition = grapple.mode === 'ground' ? grapple.transition : null;
        const transitionT = transition ? clamp(transition.elapsed / (transition.duration ?? .8), 0, 1) : 0;
        const eased = transitionT * transitionT * (3 - 2 * transitionT);
        const fromIndex = positions.indexOf(transition?.from ?? grapple.position);
        const toIndex = positions.indexOf(transition?.to ?? grapple.position);
        const positionIndex = fromIndex + (toIndex - fromIndex) * eased;
        const weightAt = (index: number) => clamp(1 - Math.abs(positionIndex - index), 0, 1);
        const guardWeight = weightAt(0), halfWeight = weightAt(1), sideWeight = weightAt(2), mountWeight = weightAt(3);
        const side = transition ? (grapple.side ?? 1) + ((transition.targetSide ?? grapple.side ?? 1) - (grapple.side ?? 1)) * eased : (grapple.side ?? 1);
        // A sweep transfers weight throughout the roll. Blending both roles here avoids
        // the old one-frame switch from a supine fighter to a kneeling fighter.
        const roll = transition?.flips ? eased : 0;
        const topWeight = top ? 1 - roll : roll;
        const bottomWeight = 1 - topWeight;
        const effort = transition ? Math.sin(Math.PI * transitionT) : 0;
        const breathing = Math.sin(time * 3.2 + f.id) * .008;
        this.hips.position.y = .19 * bottomWeight + (.58 - sideWeight * .05 - mountWeight * .025) * topWeight + breathing;
        this.hips.position.z = .08 * bottomWeight - .035 * topWeight;
        this.hips.rotation.x = (-Math.PI / 2 + guardWeight * .12) * bottomWeight + (1.05 - halfWeight * .12 + sideWeight * .23 - mountWeight * .17) * topWeight;
        this.hips.rotation.y = side * sideWeight * .88 * topWeight;
        this.spine.rotation.x = (-.05 + mountWeight * .06) * bottomWeight + (.05 + mountWeight * .18) * topWeight;
        this.spine.rotation.z = side * sideWeight * .12 * topWeight;
        this.head.rotation.x = -.12 * bottomWeight + .12 * topWeight;
        for (let i = 0; i < 2; i++) {
          const sign = i ? -1 : 1;
          // Bottom fighter frames against the shoulders. Guard wraps the opponent,
          // half guard traps one leg, and side control/mount bring the knees in.
          const bottomLeg = -(.75 + guardWeight * .44 + halfWeight * (i ? .38 : .05) - mountWeight * .2);
          const topLeg = -.85 + guardWeight * .12 - sideWeight * (i === (side > 0 ? 1 : 0) ? .25 : 0) + mountWeight * .18;
          this.legs[i].rotation.set(bottomLeg * bottomWeight + topLeg * topWeight, sideWeight * sign * .15, sign * ((.22 + guardWeight * .1) * bottomWeight + (.38 + sideWeight * .23 - mountWeight * .13) * topWeight));
          this.shins[i].rotation.x = (1.28 - guardWeight * .18 + mountWeight * .15) * bottomWeight + (.88 + mountWeight * .05) * topWeight;
          this.feet[i].rotation.x = -.16 * bottomWeight + .1 * topWeight;
          const defendingArm = -1.12 - mountWeight * .33;
          const postingArm = -1.35 + sideWeight * .22 * sign;
          this.arms[i].rotation.x = defendingArm * bottomWeight + postingArm * topWeight;
          this.arms[i].rotation.z = sign * ((.24 + sideWeight * .18) * bottomWeight + (.38 + guardWeight * .14) * topWeight);
          this.forearms[i].rotation.x = (-1.5 + sideWeight * .3) * bottomWeight + (-1.35 + mountWeight * .16) * topWeight;
        }
        if (topWeight > .01 && f.attack?.technique.kind === 'groundPunch') {
          const hand = f.attack.technique.hand ? rear : lead, sign = hand ? -1 : 1;
          const { extension, preparation } = strikeMotion(f.attack);
          this.spine.rotation.y += sign * (.22 * preparation - .32 * extension) * topWeight;
          this.spine.rotation.x += (.12 * preparation + .17 * extension) * topWeight;
          this.arms[hand].rotation.x = THREE.MathUtils.lerp(this.arms[hand].rotation.x, -.48 * preparation - 1.75 * extension - 1.1 * (1 - preparation - extension), topWeight);
          this.forearms[hand].rotation.x = THREE.MathUtils.lerp(this.forearms[hand].rotation.x, -1.65 + .9 * extension, topWeight);
          this.arms[hand].rotation.z += sign * .14 * extension * topWeight;
        }
        if (grapple.mode === 'submission') {
          this.hips.rotation.x = -Math.PI / 2; this.hips.position.y = top ? .2 : .17;
          if (top) {
            this.hips.rotation.y = -Math.PI / 2; this.spine.rotation.set(.05, 0, 0);
            this.legs.forEach((b, i) => b.rotation.set(-.1, 0, i ? -.3 : .3));
            this.shins.forEach(b => b.rotation.x = .55); this.arms.forEach(b => b.rotation.x = -1.2); this.forearms.forEach(b => b.rotation.x = -1.1);
          }
          else { this.arms[1].rotation.x = -2; this.forearms[1].rotation.x = -.3; }
        }
        if (grapple.mode === 'standup') {
          const rise = smooth(clamp((grapple.timer - (top ? .06 : .17)) / (top ? .56 : .45), 0, 1));
          this.hips.position.y = THREE.MathUtils.lerp(this.hips.position.y, .94, rise);
          this.hips.position.z *= 1 - rise;
          this.hips.rotation.x *= 1 - rise;
          this.hips.rotation.y *= 1 - rise;
          this.spine.rotation.x = THREE.MathUtils.lerp(this.spine.rotation.x, .08, rise);
          this.spine.rotation.z *= 1 - rise;
          this.head.rotation.x *= 1 - rise;
          for (let i = 0; i < 2; i++) {
            const sign = i ? -1 : 1;
            this.legs[i].rotation.x = THREE.MathUtils.lerp(this.legs[i].rotation.x, i === lead ? -.27 : .17, rise);
            this.legs[i].rotation.z = THREE.MathUtils.lerp(this.legs[i].rotation.z, sign * .08, rise);
            this.shins[i].rotation.x = THREE.MathUtils.lerp(this.shins[i].rotation.x, .3, rise);
            if (!top) {
              const support = smooth(clamp(grapple.timer / .32, 0, 1)) * (1 - rise);
              this.legs[i].rotation.x = THREE.MathUtils.lerp(this.legs[i].rotation.x, -this.hips.rotation.x - .15, support);
              this.shins[i].rotation.x = THREE.MathUtils.lerp(this.shins[i].rotation.x, 2.1, support);
            }
            this.arms[i].rotation.x = THREE.MathUtils.lerp(this.arms[i].rotation.x, i === lead ? -.92 : -.73, rise);
            this.arms[i].rotation.z = THREE.MathUtils.lerp(this.arms[i].rotation.z, sign * .15, rise);
            this.forearms[i].rotation.x = THREE.MathUtils.lerp(this.forearms[i].rotation.x, i === lead ? -1.78 : -1.98, rise);
          }
        }
        if (transition) {
          const direction = transition.direction === 'left' ? -1 : transition.direction === 'right' ? 1 : transition.by === f.id ? 1 : -1;
          this.hips.rotation.z += effort * direction * (transition.flips ? (top ? -1.45 : 1.45) : .22);
          this.spine.rotation.y += effort * direction * (transition.flips ? .42 : .26);
          this.head.rotation.z -= effort * direction * .12;
          this.hips.position.y += effort * (transition.flips ? .085 : .025);
          this.legs.forEach((leg, i) => { leg.rotation.z += effort * direction * (i ? -.17 : .17); });
        }
      }
    }
    if (f.state === 'knockedDown' || (result && result.winner !== f.id && ['KO','TKO'].includes(result.method))) {
      this.hips.position.y = .23; this.hips.rotation.x = -Math.PI / 2; this.spine.rotation.x = -.1; this.legs.forEach(b => b.rotation.x = -.25); this.shins.forEach(b => b.rotation.x = .45); this.arms.forEach((b, i) => { b.rotation.x = -.4; b.rotation.z = i ? -.65 : .65; });
    }
    if (result?.winner === f.id) { this.arms.forEach((b, i) => { b.rotation.x = -2.9; b.rotation.z = i ? -.35 : .35; }); this.forearms.forEach(b => b.rotation.x = -.35); }
    this.spine.quaternion.multiply(impact);
    if (f.reactionZone === 'head') { this.head.rotation.x += f.reaction * (f.reactionKind === 'uppercut' || f.reactionKind === 'knee' ? -.26 : .28); this.head.rotation.z += f.reaction * f.reactionSide * (f.reactionKind === 'hook' || f.reactionKind === 'elbow' ? .42 : .22); }
    else if (f.reactionZone === 'body') { this.spine.rotation.x += f.reaction * .34; this.spine.rotation.z += f.reaction * f.reactionSide * .12; this.hips.position.y -= f.reaction * .035; }
    else { const struck = f.reactionSide > 0 ? 0 : 1; this.legs[struck].rotation.z += f.reactionSide * f.reaction * .24; this.hips.rotation.z -= f.reactionSide * f.reaction * .12; }
    const cagePressure = Math.max(0, Math.hypot(f.position.x, f.position.z) - 4.05);
    if (!grapple && cagePressure > 0) { this.spine.rotation.x -= cagePressure * .11; this.hips.position.z -= cagePressure * .04; if (!f.attack) this.arms.forEach((arm, i) => arm.rotation.z += (i ? -1 : 1) * cagePressure * .16); }
    // Blend complete poses, including getting up and ground transitions, without Euler flips.
    const grounded = !!grapple && grapple.mode !== 'clinch' || f.state === 'knockedDown' || !!result;
    this.skeleton.bones.forEach((b, i) => {
      const rate = grounded ? 10 : f.attack && (this.arms.includes(b) || this.forearms.includes(b)) ? 65 : 24;
      if (this.initialized) b.quaternion.copy(this.poses[i].slerp(b.quaternion, 1 - Math.exp(-dt * rate)));
      else this.poses[i].copy(b.quaternion);
    });
    if (this.initialized) this.hips.position.copy(this.hipPosition.lerp(this.hips.position, 1 - Math.exp(-dt * (grounded ? 9 : 26))));
    else this.hipPosition.copy(this.hips.position);
    this.root.updateMatrixWorld(true);
    if (!grounded) this.plantFeet(f, dt);
    else this.feetPlanted = false;
    this.skeleton.bones.forEach((b, i) => this.poses[i].copy(b.quaternion));
    this.initialized = true;
    this.skin.color.copy(this.skinBase).lerp(new THREE.Color('#ab665e'), Math.min(.24, f.damage.body / 350));
    this.skin.clearcoat = .1 + Math.min(.16, exhaustion * .12 + time * .0004);
    (this.bruise.material as THREE.MeshStandardMaterial).opacity = f.swelling * .65;
    (this.cut.material as THREE.MeshStandardMaterial).opacity = Math.max(0, f.cut - .25);
    if (this.model) for (const b of this.skeleton.bones) { const mapped = this.mapped.get(b.name)!; mapped.quaternion.copy(b.quaternion); if (b === this.hips) mapped.position.copy(b.position); }
  }
  /** Couple the hands to the same captured wrist instead of animating two unrelated poses. */
  holdSubmission(defender: FighterRig, amount: number) {
    this.root.updateMatrixWorld(true); defender.root.updateMatrixWorld(true);
    const grip = this.spine.localToWorld(new THREE.Vector3(0, .22, .2));
    const reach = (rig: FighterRig, side: number, point: THREE.Vector3, pole: THREE.Vector3) => {
      const upper = rig.arms[side], lower = rig.forearms[side];
      const beforeUpper = upper.quaternion.clone(), beforeLower = lower.quaternion.clone();
      solveLimb(upper, lower, point, pole, .3, .289);
      upper.quaternion.copy(beforeUpper.slerp(upper.quaternion, amount)); lower.quaternion.copy(beforeLower.slerp(lower.quaternion, amount));
      rig.root.updateMatrixWorld(true);
    };
    reach(defender, 1, grip, new THREE.Vector3(0, 1, 0));
    const wrist = defender.forearms[1].localToWorld(new THREE.Vector3(0, -.289, 0));
    reach(this, 0, wrist.clone().add(new THREE.Vector3(.025, .025, 0)), new THREE.Vector3(1, .25, 0));
    reach(this, 1, wrist.clone().add(new THREE.Vector3(-.025, .025, 0)), new THREE.Vector3(-1, .25, 0));
  }
  private plantFeet(f: Fighter, dt: number) {
    const lead = f.stance === 'orthodox' ? 0 : 1;
    const desired = [0, 1].map(i => this.root.localToWorld(new THREE.Vector3(i ? -.16 : .16, .062, i === lead ? .22 : -.2)));
    const teleport = this.previousRoot.distanceTo(this.root.position) > .7;
    this.previousRoot.copy(this.root.position);
    if (!this.feetPlanted || teleport) {
      this.footTargets.forEach((p, i) => p.copy(desired[i])); this.feetPlanted = true; this.stepTime = 1;
    }
    const kicking = f.attack && ['kick', 'frontKick', 'sideKick', 'knee'].includes(f.attack.technique.kind) ? (f.attack.technique.hand ? (lead ? 0 : 1) : lead) : -1;
    if (kicking < 0) {
      if (this.stepTime >= 1) {
        const errors = this.footTargets.map((p, i) => p.distanceTo(desired[i]));
        const side = errors[0] > errors[1] ? 0 : 1;
        if (errors[side] > .12) {
          this.stepSide = side; this.stepTime = 0; this.stepFrom.copy(this.footTargets[side]);
          this.stepTo.copy(desired[side]).add(new THREE.Vector3(f.velocity.x, 0, f.velocity.z).multiplyScalar(.1));
        }
      }
      if (this.stepTime < 1) {
        this.stepTime = Math.min(1, this.stepTime + dt / .19);
        this.footTargets[this.stepSide].lerpVectors(this.stepFrom, this.stepTo, smooth(this.stepTime));
        this.footTargets[this.stepSide].y += Math.sin(this.stepTime * Math.PI) * .065;
      }
    } else { this.footTargets[kicking].copy(desired[kicking]); this.stepTime = 1; }
    const pole = new THREE.Vector3(0, .05, 1).applyQuaternion(this.root.quaternion);
    for (let i = 0; i < 2; i++) {
      if (i === kicking) continue;
      // Keep the support leg within anatomical reach during turns and lunges.
      if (this.footTargets[i].distanceTo(desired[i]) > .37) this.footTargets[i].lerp(desired[i], 1 - Math.exp(-dt * 22));
      solveLimb(this.legs[i], this.shins[i], this.footTargets[i], pole, .405, .405);
      const parentRotation = this.shins[i].getWorldQuaternion(new THREE.Quaternion()).invert();
      const yaw = f.heading + (i ? -.16 : .1) + (kicking >= 0 ? (kicking ? .5 : -.5) * strikeMotion(f.attack!).extension : 0);
      this.feet[i].quaternion.copy(parentRotation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)));
    }
  }
}
