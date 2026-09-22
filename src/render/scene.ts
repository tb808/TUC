import * as THREE from 'three';
import { Combat, clamp, strikeTip } from '../game/combat';
import type { CombatEvent } from '../game/types';
import { FighterRig } from './fighter';
import { ImpactPhysics } from './physics';
import { batchRigidParts } from './batch';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { surfaceTexture } from './materials';
import { arenaDetails, ARENAS, type ArenaEnvironment } from './arenaDetails';
import { smooth } from '../game/motion';
import type { WalkoutPresentation } from '../game/walkout';

function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const c = canvas.getContext('2d')!; draw(c); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture; }
export class ArenaView {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
  rigs = [new FighterRig(0), new FighterRig(1)]; physics = new ImpactPhysics(); debug = false;
  private light: THREE.DirectionalLight; private shake = 0; private clock = 0; private hitMarkers: THREE.Mesh[] = [];
  private particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
  private cagePanels: THREE.Mesh[] = []; private target = new THREE.Vector3(0, .85, 0); private look = this.target.clone();
  private contactShadows: THREE.Mesh[] = [];
  private walkoutStaff = new THREE.Group(); private announcer: THREE.Group; private referee: THREE.Group;
  private walkoutCameraStage = '';
  private environment!: ArenaEnvironment;
  fps = 60; quality = 'high';
  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1; container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D-Oktagon mit zwei MMA-Kämpfern');
    this.renderer.domElement.tabIndex = 0;
    this.scene.background = new THREE.Color('#0c111b'); this.scene.fog = new THREE.FogExp2('#0c111b', .025);
    const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(environment, .04).texture; this.scene.environmentIntensity = .32;
    environment.dispose(); pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight('#d3e1f3', '#4d4540', .85));
    this.light = new THREE.DirectionalLight('#fff0e2', 3.2); this.light.position.set(-3.5, 8, 2); this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048); this.light.shadow.camera.left = -6; this.light.shadow.camera.right = 6; this.light.shadow.camera.top = 6; this.light.shadow.camera.bottom = -6; this.light.shadow.camera.near = .5; this.light.shadow.camera.far = 20; this.light.shadow.normalBias = .018; this.light.shadow.bias = -.00012; this.light.shadow.radius = 3; this.scene.add(this.light);
    const rim = new THREE.DirectionalLight('#c3d9ff', 2.4); rim.position.set(3, 5, -5); this.scene.add(rim);
    const fill = new THREE.DirectionalLight('#e1e9f3', .65); fill.position.set(3, 3, 6); this.scene.add(fill);
    this.buildArena(); this.environment = arenaDetails(this.scene); batchRigidParts(this.scene); this.rigs.forEach(r => this.scene.add(r.root));
    this.announcer = this.staffFigure('#17191d', '#d1ef71'); this.referee = this.staffFigure('#202326', '#202326');
    this.walkoutStaff.add(this.announcer, this.referee);
    for (const color of ['#242a2c', '#182738', '#2b2020', '#5b1f24']) this.walkoutStaff.add(this.staffFigure(color, color));
    this.scene.add(this.walkoutStaff); this.walkoutStaff.visible = false;
    const shadowTexture = canvasTexture(128, 128, c => {
      const gradient = c.createRadialGradient(64, 64, 2, 64, 64, 64); gradient.addColorStop(0, '#0000008c'); gradient.addColorStop(.38, '#0000004d'); gradient.addColorStop(1, '#00000000'); c.fillStyle = gradient; c.fillRect(0, 0, 128, 128);
    });
    for (let i = 0; i < 2; i++) {
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .8), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: .6 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.009; this.scene.add(shadow); this.contactShadows.push(shadow);
    }
    for (let i = 0; i < 2; i++) { const marker = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), new THREE.MeshBasicMaterial({ color: i ? '#ff736d' : '#72caff', wireframe: true, depthTest: false })); marker.visible = false; this.scene.add(marker); this.hitMarkers.push(marker); }
    this.camera.position.set(0, 5.6, 9.9);
    const resize = () => { this.camera.aspect = container.clientWidth / container.clientHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(container.clientWidth, container.clientHeight); };
    new ResizeObserver(resize).observe(container); resize();
  }
  async init() { await this.physics.init(); }
  setQuality(quality: string) { this.quality = quality; this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.75 : .8)); this.renderer.shadowMap.enabled = quality === 'high'; }
  setArena(index: number) {
    const theme = ARENAS[Math.max(0, Math.min(ARENAS.length - 1, index))];
    this.environment.setArena(index);
    this.light.color.set(theme.id === 'neon-district' ? '#ffd9f8' : theme.id === 'alpine-crown' ? '#e4f8ff' : theme.id === 'imperial-dome' ? '#ffe1ae' : '#fff0e2');
    this.renderer.toneMappingExposure = theme.id === 'imperial-dome' ? 1.08 : theme.id === 'neon-district' ? .92 : 1;
  }
  private staffFigure(shirtColor: string, sleeveColor: string) {
    const group = new THREE.Group(), skin = new THREE.MeshStandardMaterial({ color: '#936b54', roughness: .82 });
    const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: .72 });
    const sleeve = new THREE.MeshStandardMaterial({ color: sleeveColor, roughness: .75 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(.11, 12, 8), skin); head.position.y = 1.65; group.add(head);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.19, .6, 5, 10), shirt); body.position.y = 1.13; group.add(body);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .48, 4, 8), sleeve); arm.position.set(side * .24, 1.23, 0); arm.rotation.z = side * .12; group.add(arm);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.06, .62, 4, 8), new THREE.MeshStandardMaterial({ color: '#111518', roughness: .9 })); leg.position.set(side * .09, .48, 0); group.add(leg);
    }
    group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    return group;
  }
  private buildArena() {
    const dark = new THREE.MeshStandardMaterial({ color: '#1c2421', roughness: .82, metalness: .2 });
    const steel = new THREE.MeshStandardMaterial({ color: '#39443d', roughness: .46, metalness: .65 });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.05, 5.15, .34, 8), dark); platform.rotation.y = Math.PI / 8; platform.position.y = -.2; platform.receiveShadow = true; this.scene.add(platform);
    const matTexture = canvasTexture(2048, 2048, c => {
      c.fillStyle = '#b0b6b8'; c.fillRect(0, 0, 2048, 2048);
      let seed = 9; for (let i = 0; i < 45000; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % 2048; seed = (seed * 1664525 + 1013904223) >>> 0; c.fillStyle = i % 2 ? '#ffffff06' : '#00000009'; c.fillRect(x, seed % 2048, 2, 2); }
      c.strokeStyle = '#677665'; c.lineWidth = 7; c.beginPath(); for (let i = 0; i <= 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; const x = 1024 + Math.cos(a) * 825, y = 1024 + Math.sin(a) * 825; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      c.save(); c.translate(1024, 1050); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillStyle = '#344a3d'; c.font = 'italic 900 350px Arial'; c.fillText('TUC', 0, 50); c.font = 'bold 29px Arial'; c.fillText('TYLER’S ULTIMATE CHAMPIONSHIP', 0, 115); c.fillStyle = '#738573'; c.font = 'bold 28px Arial'; c.fillText('THE PROVING GROUND', 0, 180); c.restore();
      c.textAlign = 'center'; c.fillStyle = '#41594c'; c.font = 'bold 46px Arial'; c.fillText('EARN YOUR PLACE.', 1024, 380); c.fillText('T U C  /  0 0 1', 1024, 1710);
      c.fillStyle = '#3c6a94'; c.fillRect(220, 900, 22, 240); c.fillStyle = '#a04848'; c.fillRect(1810, 900, 22, 240);
      c.strokeStyle = '#30374010'; c.lineWidth = 1;
      for (let y = 120; y < 2048; y += 256) { c.beginPath(); c.moveTo(0, y); c.lineTo(2048, y); c.stroke(); }
      for (let i = 0; i < 240; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % 1850 + 99;
        seed = (seed * 1664525 + 1013904223) >>> 0; const y = seed % 1850 + 99;
        c.save(); c.translate(x, y); c.rotate(i * 2.39); c.strokeStyle = '#333a4210'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(0, 0, 7 + i % 12, 3, 0, 0, Math.PI); c.stroke(); c.restore();
      }
    });
    matTexture.anisotropy = 8;
    const weave = surfaceTexture('canvas'); weave.anisotropy = 8;
    const mat = new THREE.Mesh(new THREE.CircleGeometry(5.03, 8), new THREE.MeshStandardMaterial({ map: matTexture, roughness: .86, bumpMap: weave, bumpScale: .002 })); mat.rotation.x = -Math.PI / 2; mat.rotation.z = Math.PI / 8; mat.position.y = -.015; mat.receiveShadow = true; this.scene.add(mat);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: '#111a15', roughness: .92 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.39; floor.receiveShadow = true; this.scene.add(floor);
    const fenceTex = canvasTexture(64, 64, c => { c.clearRect(0, 0, 64, 64); c.strokeStyle = '#5f6b60'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 32); c.lineTo(32, 0); c.lineTo(64, 32); c.lineTo(32, 64); c.closePath(); c.stroke(); }); fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(19, 11);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4, b = a + Math.PI / 4;
      const p = new THREE.Vector3(Math.cos(a) * 5.03, 0, Math.sin(a) * 5.03), q = new THREE.Vector3(Math.cos(b) * 5.03, 0, Math.sin(b) * 5.03);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.078, .078, 1.94, 12), dark); post.position.copy(p); post.position.y = .95; post.castShadow = true; this.scene.add(post);
      const midpoint = p.clone().add(q).multiplyScalar(.5), length = p.distanceTo(q), yaw = Math.atan2(q.x - p.x, q.z - p.z);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(length, 1.8), new THREE.MeshStandardMaterial({ map: fenceTex, transparent: true, opacity: .52, side: THREE.DoubleSide, depthWrite: false, roughness: .8 })); panel.position.copy(midpoint); panel.position.y = .9; panel.rotation.y = yaw + Math.PI / 2; this.scene.add(panel); this.cagePanels.push(panel);
      for (const height of [.1, 1.86]) { const rail = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, length, 8), steel); rail.position.copy(midpoint); rail.position.y = height; rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()); this.scene.add(rail); }
      const pad = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.5, .18), new THREE.MeshStandardMaterial({ color: i === 0 || i === 7 ? '#913f46' : i === 3 || i === 4 ? '#315d8a' : '#283d30', roughness: .7 })); pad.position.copy(p); pad.position.y = .85; pad.rotation.y = -a; this.scene.add(pad);
    }
    // Restrained overhead rig, visible practical lights and an empty training arena.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(14, .12, .16), steel); bar.position.set(0, 7, -3); this.scene.add(bar);
    for (const x of [-5, -2.5, 0, 2.5, 5]) { const box = new THREE.Mesh(new THREE.BoxGeometry(.65, .08, .32), new THREE.MeshStandardMaterial({ color: '#ebf0cf', emissive: '#e1e4c6', emissiveIntensity: 3 })); box.position.set(x, 6.9, -3); this.scene.add(box); }
    for (let i = 0; i < 10; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, 4, .05), steel); bar.position.set((i - 4.5) * 2.5, 1.6, -10); this.scene.add(bar); }
  }
  impact(event: Extract<CombatEvent, { type: 'hit' }>) {
    this.physics.hit(event); this.shake = Math.max(this.shake, Math.min(.15, event.strength * .009));
    if (event.blocked || this.quality !== 'high') return;
    const count = Math.min(10, Math.floor(event.strength));
    for (let i = 0; i < count; i++) {
      const blood = event.zone === 'head' && event.strength > 10 && i === 0;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(blood ? .015 : .009, 4, 3), new THREE.MeshBasicMaterial({ color: blood ? '#8a3030' : '#e5f0e6', transparent: true, opacity: .75 }));
      mesh.position.set(event.position.x, event.zone === 'head' ? 1.68 : event.zone === 'body' ? 1.2 : .55, event.position.z); this.scene.add(mesh);
      this.particles.push({ mesh, velocity: new THREE.Vector3((Math.random() - .5) * 2, .8 + Math.random(), (Math.random() - .5) * 2), life: .35 });
    }
  }
  draw(match: Combat, dt: number, menu: boolean, frozen = false, frameDt = dt, walkout: WalkoutPresentation | null = null) {
    this.fps += (1 / Math.max(.001, frameDt) - this.fps) * .025;
    if (!frozen || walkout) this.clock += dt;
    this.environment.update(this.clock);
    this.rigs.forEach((rig, i) => {
      const presentationPose = walkout?.fighters[i];
      const fighter = presentationPose ? { ...match.fighters[i], position: presentationPose.position, heading: presentationPose.heading, velocity: presentationPose.moving ? { x: 0, z: 1.25 } : { x: 0, z: 0 } } : match.fighters[i];
      rig.root.visible = presentationPose?.visible ?? true;
      rig.update(fighter, walkout ? null : match.grapple, this.clock, frozen && !walkout ? 0 : dt, this.physics.rotation(i), walkout ? null : match.result);
      this.contactShadows[i].visible = rig.root.visible;
      this.contactShadows[i].position.x = fighter.position.x; this.contactShadows[i].position.z = fighter.position.z;
      this.contactShadows[i].scale.setScalar(match.grapple?.mode === 'ground' ? 1.5 : 1);
    });
    if (!frozen && !walkout && match.grapple?.mode === 'submission') {
      const top = match.grapple.top;
      this.rigs[top].holdSubmission(this.rigs[top ? 0 : 1], smooth(match.grapple.timer / .4));
    }
    const [a, b] = walkout ? walkout.fighters.map((fighter, id) => ({ ...match.fighters[id], position: fighter.position })) as typeof match.fighters : match.fighters;
    const grounded = !walkout && !!match.grapple && match.grapple.mode !== 'clinch';
    const middle = new THREE.Vector3((a.position.x + b.position.x) / 2, grounded ? .42 : 1.02, (a.position.z + b.position.z) / 2);
    const distance = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
    const zoom = menu ? 17 : grounded ? clamp(4.15 + distance * .55, 4.65, 7.4) : clamp(4.45 + distance * .72, 5.2, 11.2);
    const focus = middle.clone(); if (menu) focus.y = 3.2;
    const targetFov = menu ? 39 : walkout ? 41 : grounded ? 36 : 37;
    const fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-dt * 5));
    if (Math.abs(fov - this.camera.fov) > .001) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    const desired = new THREE.Vector3(
      middle.x * .78 + (menu ? 5.1 : .18),
      menu ? 9.3 : grounded ? 2.22 + distance * .08 : 2.45 + distance * .1,
      middle.z * .78 + zoom,
    );
    let cameraCut = false;
    if (walkout) {
      const stage = walkout.beat.stage, featured = walkout.beat.corner === undefined ? null : walkout.fighters[walkout.beat.corner];
      cameraCut = stage !== this.walkoutCameraStage; this.walkoutCameraStage = stage;
      if (stage === 'broadcast') { desired.set(8.8, 6.4, 10.5); focus.set(0, 1.2, 0); }
      else if (stage.endsWith('check')) { desired.set(featured?.position.x ?? 0, 1.75, (featured?.position.z ?? 0) + 2.15); focus.set(featured?.position.x ?? 0, 1.18, featured?.position.z ?? 0); }
      else if (stage.endsWith('walk')) { desired.set(featured?.position.x ?? 0, 1.72, (featured?.position.z ?? 0) + 2.5); focus.set(featured?.position.x ?? 0, 1.05, featured?.position.z ?? 0); }
      else if (stage.endsWith('inspection')) { const side = (featured?.position.x ?? 1) > 0 ? 1 : -1; desired.set((featured?.position.x ?? 0) + side * 1.1, 1.72, (featured?.position.z ?? 0) + 1.9); focus.set(featured?.position.x ?? 0, 1.18, featured?.position.z ?? 0); }
      else if (stage.endsWith('entry')) { const side = (featured?.position.x ?? 1) > 0 ? 1 : -1; desired.set(side * 7.2, 3.0, 5.1); focus.set(featured?.position.x ?? 0, 1, featured?.position.z ?? 0); }
      else { desired.set(0, 2.75, 8.1); focus.set(0, 1.05, 0); }
    } else this.walkoutCameraStage = '';
    // UFC-style medium framing: close enough to read strikes, responsive enough for footwork.
    if (cameraCut) { this.camera.position.copy(desired); this.look.copy(focus); }
    else { this.camera.position.lerp(desired, 1 - Math.exp(-dt * (menu ? 2 : walkout ? 2.6 : 4.2))); this.look.lerp(focus, 1 - Math.exp(-dt * (menu ? 4 : 7))); }
    this.shake *= Math.exp(-dt * 18);
    this.target.copy(this.look).add(new THREE.Vector3(Math.sin(this.clock * 110) * this.shake, Math.cos(this.clock * 93) * this.shake * .7, 0)); this.camera.lookAt(this.target);
    for (const panel of this.cagePanels) {
      const corner = walkout?.beat.corner;
      const gateOpen = !!walkout && corner !== undefined && (walkout.beat.stage.endsWith('entry') || walkout.beat.stage.endsWith('inspection')) && (corner === 1 ? panel.position.x > 3.6 : panel.position.x < -3.6);
      (panel.material as THREE.MeshStandardMaterial).opacity = gateOpen ? .025 : panel.position.z > middle.z + .8 ? .065 : .43;
    }
    this.updateWalkoutStaff(walkout);
    for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.life -= dt; p.velocity.y -= dt * 5; p.mesh.position.addScaledVector(p.velocity, dt); (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life * 2; if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose(); this.particles.splice(i, 1); } }
    this.hitMarkers.forEach((m, i) => { const f = match.fighters[i]; m.visible = this.debug && !!f.attack; if (f.attack) { const tip = strikeTip(f, f.attack); m.position.set(tip.x, f.attack.technique.zone === 'head' ? 1.68 : f.attack.technique.zone === 'body' ? 1.2 : .5, tip.z); } });
    this.renderer.render(this.scene, this.camera);
  }
  private updateWalkoutStaff(walkout: WalkoutPresentation | null) {
    this.walkoutStaff.visible = !!walkout;
    if (!walkout) return;
    const stage = walkout.beat.stage, featured = walkout.beat.corner === undefined ? null : walkout.fighters[walkout.beat.corner];
    this.announcer.visible = stage === 'introductions'; this.announcer.position.set(0, 0, .25); this.announcer.rotation.y = Math.PI;
    this.referee.visible = stage === 'instructions' || stage === 'corners'; this.referee.position.set(0, 0, -.2); this.referee.rotation.y = Math.PI;
    const entourage = this.walkoutStaff.children.slice(2) as THREE.Group[];
    const showTeam = !!featured && (stage.endsWith('walk') || stage.endsWith('check') || stage.endsWith('inspection'));
    entourage.forEach((person, index) => {
      person.visible = showTeam;
      if (!featured) return;
      const walking = stage.endsWith('walk');
      const offsets = [[-.34, -1], [.34, -1.05], [-.52, -1.75], [.52, -1.7]][index];
      person.position.set(featured.position.x + offsets[0], 0, featured.position.z + (walking ? offsets[1] : index === 3 ? .15 : offsets[1] * .45));
      person.rotation.y = walking ? 0 : index === 3 ? Math.PI : 0;
    });
  }
}
