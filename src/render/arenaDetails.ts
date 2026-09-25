import * as THREE from 'three';

export type ArenaTheme = {
  id: string;
  name: string;
  subtitle: string;
  code: string;
  location: string;
  accent: string;
  background: string;
  fog: string;
  crowd: readonly string[];
};

export const ARENAS: readonly ArenaTheme[] = [
  { id: 'proving-ground', name: 'The Proving Ground', subtitle: 'Roh. Eng. Kein Platz für Ausreden.', code: 'TUC—001', location: 'TRAINING FACILITY', accent: '#d1ef71', background: '#0c111b', fog: '#0c111b', crowd: ['#263126', '#1c2520', '#414733', '#202a2d', '#34312c'] },
  { id: 'neon-district', name: 'Neon District', subtitle: 'Mitternacht. Regen. Alles leuchtet.', code: 'TUC—014', location: 'TOKYO NIGHT CARD', accent: '#ff4fd8', background: '#080817', fog: '#11102a', crowd: ['#281d3c', '#132f46', '#471d42', '#17213c', '#3d2630'] },
  { id: 'alpine-crown', name: 'Alpine Crown', subtitle: 'Kalte Luft. Heißer Kampf.', code: 'TUC—027', location: 'SUMMIT PAVILION', accent: '#8de8ff', background: '#0b1820', fog: '#193544', crowd: ['#183746', '#274554', '#d6e0df', '#304a55', '#293941'] },
  { id: 'imperial-dome', name: 'Imperial Dome', subtitle: 'Große Bühne. Größter Druck.', code: 'TUC—042', location: 'CHAMPIONSHIP DOME', accent: '#ffc85a', background: '#140d0d', fog: '#281714', crowd: ['#3d231c', '#4b3430', '#211c25', '#6b4d2a', '#37252a'] },
  { id: 'harbor-forge', name: 'Harbor Forge', subtitle: 'Stahl, Feuer und schwere Hände.', code: 'TUC—058', location: 'DOCKYARD 09', accent: '#ff7847', background: '#101517', fog: '#20282a', crowd: ['#253039', '#46352c', '#1e292d', '#5a3929', '#283338'] },
] as const;

function sign(text: string, width: number, height: number, accent: string, background = '#11171e') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
  const c = canvas.getContext('2d')!;
  c.fillStyle = background; c.fillRect(0, 0, 1024, 160);
  c.fillStyle = accent; c.fillRect(0, 0, 12, 160); c.fillRect(1012, 0, 12, 160);
  c.fillStyle = '#eef0e9'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 50px Arial'; c.fillText(text, 512, 82);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .52, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: .42, side: THREE.DoubleSide }));
}

function eventScreen(theme: ArenaTheme, width: number, height: number, side = false, names: readonly [string, string] = ['TYLER', 'ALEX VOLK']) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 384;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#060a0e'; c.fillRect(0, 0, 1024, 384);
  const glow = c.createLinearGradient(0, 0, 1024, 0);
  glow.addColorStop(0, '#123552'); glow.addColorStop(.46, '#0d161e'); glow.addColorStop(.54, '#1c1316'); glow.addColorStop(1, '#512025');
  c.fillStyle = glow; c.fillRect(14, 14, 996, 356);
  for (let x = 0; x < 1024; x += 9) { c.fillStyle = x % 18 ? '#ffffff05' : '#ffffff0a'; c.fillRect(x, 0, 2, 384); }
  c.fillStyle = theme.accent; c.fillRect(18, 17, 988, 5); c.fillRect(18, 362, 988, 5);
  c.fillStyle = '#cfd8dc'; c.font = '700 27px Arial'; c.textAlign = 'left'; c.fillText('TUC  /  WORLD FIGHT NIGHT', 42, 61);
  c.textAlign = 'right'; c.fillText(theme.code + '   •   LIVE', 982, 61);
  if (side) {
    c.textAlign = 'center'; c.fillStyle = theme.accent; c.font = '900 87px Arial'; c.fillText('TUC', 512, 183);
    c.fillStyle = '#f1f2ed'; c.font = '700 43px Arial'; c.fillText(theme.name.toUpperCase(), 512, 242);
  } else {
    c.fillStyle = '#dceafa'; c.textAlign = 'left'; c.font = '900 113px Arial';
    if (c.measureText(names[0]).width > 360) c.font = `900 ${Math.floor(113 * 360 / c.measureText(names[0]).width)}px Arial`;
    c.fillText(names[0], 44, 245);
    c.fillStyle = '#f4d8da'; c.textAlign = 'right'; c.font = '900 113px Arial';
    if (c.measureText(names[1]).width > 360) c.font = `900 ${Math.floor(113 * 360 / c.measureText(names[1]).width)}px Arial`;
    c.fillText(names[1], 980, 245);
    c.fillStyle = theme.accent; c.textAlign = 'center'; c.font = '900 73px Arial'; c.fillText('VS', 512, 235);
    c.fillStyle = '#69a8db'; c.fillRect(44, 263, 357, 6); c.fillStyle = '#d36c70'; c.fillRect(623, 263, 357, 6);
  }
  c.fillStyle = '#b3bec4'; c.textAlign = 'center'; c.font = '700 25px Arial'; c.fillText(side ? theme.location : 'MAIN EVENT   /   3 RUNDEN   /   MMA', 512, 330);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }));
}

function concreteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#b7bec0'; c.fillRect(0, 0, 256, 256);
  let seed = 1973;
  for (let i = 0; i < 6200; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % 256;
    seed = (seed * 1664525 + 1013904223) >>> 0; const y = seed % 256;
    c.fillStyle = i % 3 ? '#6570751c' : '#f5f7f51a'; c.fillRect(x, y, 1 + i % 3, 1 + i % 2);
  }
  c.strokeStyle = '#67717645'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 253); c.lineTo(256, 253); c.stroke();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(8, 3); texture.anisotropy = 4;
  return texture;
}

type Spectator = { x: number; y: number; z: number; angle: number; phase: number; energy: number };

export class ArenaEnvironment {
  readonly root = new THREE.Group();
  private venue = new THREE.Group();
  private spectators: Spectator[] = [];
  private bodies: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private arms: THREE.InstancedMesh;
  private hair: THREE.InstancedMesh;
  private legs: THREE.InstancedMesh;
  private distantSpectators: Spectator[] = [];
  private distantBodies: THREE.InstancedMesh;
  private distantHeads: THREE.InstancedMesh;
  private distantHair: THREE.InstancedMesh;
  private distantArms: THREE.InstancedMesh;
  private ribbonMaterials: THREE.MeshStandardMaterial[] = [];
  private transform = new THREE.Object3D();
  private themeIndex = 0;
  private matchup: [string, string] = ['TYLER', 'ALEX VOLK'];
  private matchupScreens: THREE.Mesh[] = [];
  private nextCrowdUpdate = 0;

  constructor(private scene: THREE.Scene) {
    this.root.name = 'arena-environment'; this.venue.name = 'venue-details'; this.root.add(this.venue); this.scene.add(this.root);
    const clothing = new THREE.MeshStandardMaterial({ roughness: .88, metalness: .02, side: THREE.DoubleSide });
    const skin = new THREE.MeshStandardMaterial({ roughness: .93 });
    const hair = new THREE.MeshStandardMaterial({ roughness: .91 });
    this.bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .13, .43, 10), clothing, 240);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.105, 12, 8), skin, 240);
    this.arms = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.047, .29, 3, 6), clothing, 480);
    this.hair = new THREE.InstancedMesh(new THREE.SphereGeometry(.11, 10, 6, 0, Math.PI * 2, 0, Math.PI * .55), hair, 240);
    this.legs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.055, .27, 3, 6), clothing, 480);
    this.distantBodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(.13, .095, .33, 5), clothing, 2500);
    this.distantHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(.078, 6, 3), skin, 2500);
    this.distantHair = new THREE.InstancedMesh(new THREE.SphereGeometry(.083, 6, 2, 0, Math.PI * 2, 0, Math.PI * .55), hair, 2500);
    this.distantArms = new THREE.InstancedMesh(new THREE.CylinderGeometry(.034, .03, .27, 4), clothing, 5000);
    for (const mesh of [this.bodies, this.heads, this.arms, this.hair, this.legs, this.distantBodies, this.distantHeads, this.distantHair, this.distantArms]) mesh.frustumCulled = false;
    this.root.add(this.bodies, this.heads, this.arms, this.hair, this.legs, this.distantBodies, this.distantHeads, this.distantHair, this.distantArms);
    this.buildGrandstand(); this.setArena(0); this.update(0, true);
  }

  setArena(index: number) {
    this.themeIndex = Math.max(0, Math.min(ARENAS.length - 1, index));
    const theme = ARENAS[this.themeIndex];
    this.scene.background = new THREE.Color(theme.background);
    this.scene.fog = new THREE.FogExp2(theme.fog, this.themeIndex === 1 ? .018 : .012);
    this.clearVenue(); this.buildVenue(theme, this.themeIndex);
    for (let i = 0; i < this.spectators.length; i++) {
      const shirt = new THREE.Color(i % 13 === 0 ? theme.accent : theme.crowd[(i * 7 + Math.floor(i / 48)) % theme.crowd.length]).multiplyScalar(.95 + (i % 5) * .12);
      this.bodies.setColorAt(i, shirt);
      this.heads.setColorAt(i, new THREE.Color(['#d2a681', '#8b6048', '#e5c4a3', '#694938', '#b47c5d'][i % 5]));
      this.arms.setColorAt(i * 2, new THREE.Color(shirt)); this.arms.setColorAt(i * 2 + 1, new THREE.Color(shirt));
      this.hair.setColorAt(i, new THREE.Color(['#1b1717', '#302720', '#52392a', '#171b23', '#614837'][i % 5]));
      this.legs.setColorAt(i * 2, new THREE.Color(i % 4 === 0 ? '#29323b' : '#11161b'));
      this.legs.setColorAt(i * 2 + 1, new THREE.Color(i % 4 === 0 ? '#29323b' : '#11161b'));
    }
    for (let i = 0; i < this.distantSpectators.length; i++) {
      const shirt = new THREE.Color(i % 19 === 0 ? theme.accent : theme.crowd[(i * 11 + Math.floor(i / 68)) % theme.crowd.length]).multiplyScalar(.9 + (i % 7) * .085);
      this.distantBodies.setColorAt(i, shirt);
      this.distantHeads.setColorAt(i, new THREE.Color(['#d2a681', '#8b6048', '#e5c4a3', '#694938', '#b47c5d'][i % 5]));
      this.distantHair.setColorAt(i, new THREE.Color(['#1b1717', '#302720', '#52392a', '#171b23'][i % 4]));
      this.distantArms.setColorAt(i * 2, shirt); this.distantArms.setColorAt(i * 2 + 1, shirt);
    }
    for (const mesh of [this.bodies, this.heads, this.arms, this.hair, this.legs, this.distantBodies, this.distantHeads, this.distantHair, this.distantArms]) mesh.instanceColor!.needsUpdate = true;
    for (const material of this.ribbonMaterials) { material.color.set(theme.accent).multiplyScalar(.34); material.emissive.set(theme.accent); }
    this.nextCrowdUpdate = 0;
  }
  setMatchup(player: string, opponent: string) {
    this.matchup = [player, opponent];
    for (const screen of this.matchupScreens) {
      const replacement = eventScreen(ARENAS[this.themeIndex], 6.14, 1.98, false, this.matchup);
      const old = screen.material as THREE.MeshBasicMaterial;
      old.map?.dispose(); old.dispose(); screen.material = replacement.material;
      replacement.geometry.dispose();
    }
  }

  private clearVenue() {
    this.matchupScreens = [];
    const disposedMaterials = new Set<THREE.Material>();
    const disposedTextures = new Set<THREE.Texture>();
    this.venue.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (disposedMaterials.has(material)) continue;
        const mapped = material as THREE.MeshStandardMaterial;
        for (const texture of [mapped.map, mapped.emissiveMap]) if (texture && !disposedTextures.has(texture)) { texture.dispose(); disposedTextures.add(texture); }
        material.dispose(); disposedMaterials.add(material);
      }
    });
    this.venue.clear();
  }

  update(time: number, force = false) {
    if (!force && time < this.nextCrowdUpdate) return;
    this.nextCrowdUpdate = time + .09;
    for (let i = 0; i < this.spectators.length; i++) {
      const p = this.spectators[i];
      const cheer = Math.max(0, Math.sin(time * (1.35 + p.energy * .45) + p.phase));
      const bounce = cheer * .045 * p.energy;
      this.transform.position.set(p.x, p.y + .075 + bounce, p.z); this.transform.rotation.set(0, p.angle, Math.sin(time * 1.8 + p.phase) * .035); this.transform.scale.set(1, 1, 1); this.transform.updateMatrix(); this.bodies.setMatrixAt(i, this.transform.matrix);
      this.transform.position.y = p.y + .405 + bounce; this.transform.rotation.z = 0; this.transform.updateMatrix(); this.heads.setMatrixAt(i, this.transform.matrix);
      this.transform.position.y += .045; this.transform.updateMatrix(); this.hair.setMatrixAt(i, this.transform.matrix);
      for (let side = -1; side <= 1; side += 2) {
        const raised = p.energy > .62 && cheer > .42;
        this.transform.position.set(p.x + Math.cos(p.angle) * side * .22, p.y + .11 + bounce + (raised ? .16 : 0), p.z - Math.sin(p.angle) * side * .22);
        this.transform.rotation.set(raised ? -.32 : .2, p.angle, side * (raised ? .92 : .31)); this.transform.updateMatrix(); this.arms.setMatrixAt(i * 2 + (side === 1 ? 1 : 0), this.transform.matrix);
        this.transform.position.set(p.x + Math.cos(p.angle) * side * .105, p.y - .31 + bounce, p.z - Math.sin(p.angle) * side * .105);
        this.transform.rotation.set(0, p.angle, side * .08); this.transform.updateMatrix(); this.legs.setMatrixAt(i * 2 + (side === 1 ? 1 : 0), this.transform.matrix);
      }
    }
    for (const mesh of [this.bodies, this.heads, this.arms, this.hair, this.legs]) mesh.instanceMatrix.needsUpdate = true;
  }

  private buildGrandstand() {
    const steel = new THREE.MeshStandardMaterial({ color: '#354148', metalness: .62, roughness: .48 });
    const concrete = new THREE.MeshStandardMaterial({ color: '#596267', map: concreteTexture(), roughness: .94 });
    const seat = new THREE.MeshStandardMaterial({ color: '#202a30', roughness: .78 });
    const aisleLight = new THREE.MeshBasicMaterial({ color: '#d6b37a' });
    for (let row = 0; row < 5; row++) {
      const riser = new THREE.Mesh(new THREE.RingGeometry(7.15 + row * 1.05, 8.18 + row * 1.05, 96, 1, Math.PI * .93, Math.PI * 1.14), concrete);
      riser.rotation.x = -Math.PI / 2; riser.position.y = -.22 + row * .43; this.root.add(riser);
      const riserFace = new THREE.Mesh(new THREE.CylinderGeometry(7.15 + row * 1.05, 7.15 + row * 1.05, .43, 96, 1, true, Math.PI * .93, Math.PI * 1.14), concrete);
      riserFace.rotation.y = Math.PI / 2; riserFace.position.y = -.43 + row * .43; this.root.add(riserFace);
      for (let spot = 0; spot < 48; spot++) {
        const angle = Math.PI * .93 + (spot / 47) * Math.PI * 1.14;
        const radius = 7.65 + row * 1.05;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        // Leave two broadcast aisles clear for the red- and blue-corner walkouts.
        if (Math.abs(Math.abs(x) - 6.8) < 1.05 && z < .8) continue;
        this.spectators.push({ x, y: .2 + row * .43, z, angle: -angle - Math.PI / 2, phase: row * 2.1 + spot * .73, energy: .35 + ((spot * 17 + row * 11) % 61) / 100 });
      }
    }
    const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(.39, .12, .36), seat, this.spectators.length);
    const seatBacks = new THREE.InstancedMesh(new THREE.BoxGeometry(.39, .38, .075), seat, this.spectators.length);
    this.spectators.forEach((p, i) => {
      this.transform.position.set(p.x, p.y - .28, p.z); this.transform.rotation.set(0, p.angle, 0); this.transform.updateMatrix(); seats.setMatrixAt(i, this.transform.matrix);
      const radius = Math.hypot(p.x, p.z);
      this.transform.position.set(p.x + p.x / radius * .16, p.y - .09, p.z + p.z / radius * .16); this.transform.updateMatrix(); seatBacks.setMatrixAt(i, this.transform.matrix);
    });
    this.root.add(seats, seatBacks);
    for (const x of [-6.8, 6.8]) {
      const aisle = new THREE.Mesh(new THREE.BoxGeometry(1.35, .08, 10.8), new THREE.MeshStandardMaterial({ color: '#11171a', roughness: .78 }));
      aisle.position.set(x, -.31, -5.25); this.root.add(aisle);
      for (const side of [-1, 1]) { const edge = new THREE.Mesh(new THREE.BoxGeometry(.035, .025, 10.6), new THREE.MeshBasicMaterial({ color: '#9db55e' })); edge.position.set(x + side * .62, -.25, -5.25); this.root.add(edge); }
    }
    const barrier = new THREE.Mesh(new THREE.CylinderGeometry(7.02, 7.02, .72, 64, 1, true, Math.PI * .93, Math.PI * 1.14), new THREE.MeshStandardMaterial({ color: '#101619', metalness: .4, roughness: .62, side: THREE.DoubleSide }));
    barrier.rotation.y = Math.PI / 2; barrier.position.y = .05; this.root.add(barrier);

    // Two additional seating bowls turn the intimate lower rows into a major event arena.
    const decks = [
      { rows: 8, seats: 112, radius: 12.9, step: .86, y: 2.75, rise: .5 },
      { rows: 10, seats: 144, radius: 20.1, step: .92, y: 7.15, rise: .62 },
    ];
    const aisles = [1.08, 1.38, 1.68, 1.98].map(value => Math.PI * value);
    for (const [deckIndex, deck] of decks.entries()) {
      for (let row = 0; row < deck.rows; row++) {
        const radius = deck.radius + row * deck.step;
        const y = deck.y + row * deck.rise;
        const terrace = new THREE.Mesh(new THREE.RingGeometry(radius - .43, radius + .43, 128, 1, Math.PI * .93, Math.PI * 1.14), concrete);
        terrace.rotation.x = -Math.PI / 2; terrace.position.y = y - .27; this.root.add(terrace);
        const riserFace = new THREE.Mesh(new THREE.CylinderGeometry(radius - .43, radius - .43, deck.rise, 128, 1, true, Math.PI * .93, Math.PI * 1.14), row % 2 ? steel : concrete);
        riserFace.rotation.y = Math.PI / 2; riserFace.position.y = y - .27 - deck.rise * .5; this.root.add(riserFace);
        for (let spot = 0; spot < deck.seats; spot++) {
          const angle = Math.PI * .93 + (spot / (deck.seats - 1)) * Math.PI * 1.14;
          if (aisles.some(aisle => Math.abs(angle - aisle) < .035)) continue;
          this.distantSpectators.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, angle: -angle - Math.PI / 2, phase: deckIndex * 3.7 + row * 1.3 + spot * .41, energy: .2 + ((spot * 13 + row * 19) % 65) / 100 });
        }
      }
      for (const angle of aisles) {
        const length = deck.rows * deck.step;
        const centerRadius = deck.radius + length * .5;
        const steps = new THREE.InstancedMesh(new THREE.BoxGeometry(.65, .035, .58), concrete, deck.rows);
        const treads = new THREE.InstancedMesh(new THREE.BoxGeometry(.64, .012, .045), aisleLight, deck.rows);
        for (let row = 0; row < deck.rows; row++) {
          const radius = deck.radius + row * deck.step;
          const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
          this.transform.rotation.set(0, -angle - Math.PI / 2, 0);
          this.transform.position.set(x, deck.y + row * deck.rise - .235, z); this.transform.updateMatrix(); steps.setMatrixAt(row, this.transform.matrix);
          this.transform.position.y += .027; this.transform.position.x += Math.cos(angle) * .24; this.transform.position.z += Math.sin(angle) * .24; this.transform.updateMatrix(); treads.setMatrixAt(row, this.transform.matrix);
        }
        this.root.add(steps, treads);
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, length * 1.25, 7), steel);
          rail.position.set(Math.cos(angle) * centerRadius + Math.cos(angle + Math.PI / 2) * side * .42, deck.y + deck.rows * deck.rise * .5 + .36, Math.sin(angle) * centerRadius + Math.sin(angle + Math.PI / 2) * side * .42);
          rail.rotation.set(Math.PI / 2 - Math.atan2(deck.rows * deck.rise, length), 0, -angle - Math.PI / 2); this.root.add(rail);
        }
      }
      const fasciaRadius = deck.radius - .65;
      const fascia = new THREE.Mesh(new THREE.CylinderGeometry(fasciaRadius, fasciaRadius, .9, 96, 1, true, Math.PI * .93, Math.PI * 1.14), new THREE.MeshStandardMaterial({ color: '#101619', metalness: .45, roughness: .55, side: THREE.DoubleSide }));
      fascia.rotation.y = Math.PI / 2; fascia.position.y = deck.y - 1.05; this.root.add(fascia);
      const ribbonMaterial = new THREE.MeshStandardMaterial({ color: '#52602e', emissive: '#d1ef71', emissiveIntensity: 2.4, roughness: .42, side: THREE.DoubleSide });
      this.ribbonMaterials.push(ribbonMaterial);
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(fasciaRadius - .04, fasciaRadius - .04, .12, 96, 1, true, Math.PI * .93, Math.PI * 1.14), ribbonMaterial);
      ribbon.rotation.y = Math.PI / 2; ribbon.position.y = deck.y - .82; this.root.add(ribbon);
    }
    this.distantBodies.count = this.distantHeads.count = this.distantHair.count = this.distantSpectators.length;
    this.distantArms.count = this.distantSpectators.length * 2;
    const upperSeats = new THREE.InstancedMesh(new THREE.BoxGeometry(.29, .26, .055), seat, this.distantSpectators.length);
    const phones = new THREE.InstancedMesh(new THREE.PlaneGeometry(.055, .09), new THREE.MeshBasicMaterial({ color: '#b9dcff', side: THREE.DoubleSide, toneMapped: false }), Math.ceil(this.distantSpectators.length / 29));
    let phoneCount = 0;
    this.distantSpectators.forEach((p, i) => {
      const radius = Math.hypot(p.x, p.z);
      const standing = i % 17 === 0, height = .88 + (i % 7) * .037;
      const lift = standing ? .17 : 0;
      this.transform.rotation.set(0, p.angle + Math.sin(p.phase) * .14, Math.sin(p.phase * 1.7) * .07); this.transform.scale.set(1 + (i % 4) * .035, height, 1);
      this.transform.position.set(p.x, p.y + .04 + lift, p.z); this.transform.updateMatrix(); this.distantBodies.setMatrixAt(i, this.transform.matrix);
      this.transform.rotation.set(0, p.angle, i % 9 === 0 ? .12 : 0); this.transform.scale.set(1, 1, 1);
      this.transform.position.y = p.y + .27 + lift + (height - 1) * .13; this.transform.updateMatrix(); this.distantHeads.setMatrixAt(i, this.transform.matrix);
      this.transform.position.y += .03; this.transform.updateMatrix(); this.distantHair.setMatrixAt(i, this.transform.matrix);
      this.transform.position.set(p.x + p.x / radius * .115, p.y - .155, p.z + p.z / radius * .115); this.transform.updateMatrix(); upperSeats.setMatrixAt(i, this.transform.matrix);
      for (const side of [-1, 1]) {
        const cheering = i % 13 === 0 || (i % 11 === 0 && side === 1);
        this.transform.position.set(p.x + Math.cos(p.angle) * side * .16, p.y + .05 + lift + (cheering ? .15 : 0), p.z - Math.sin(p.angle) * side * .16);
        this.transform.rotation.set(0, p.angle, side * (cheering ? .85 : .28)); this.transform.updateMatrix(); this.distantArms.setMatrixAt(i * 2 + (side === 1 ? 1 : 0), this.transform.matrix);
      }
      if (i % 29 === 0) {
        this.transform.position.set(p.x + Math.cos(p.angle) * .1, p.y + .27 + lift, p.z - Math.sin(p.angle) * .1);
        this.transform.rotation.set(0, p.angle, -.16); this.transform.updateMatrix(); phones.setMatrixAt(phoneCount++, this.transform.matrix);
      }
    });
    for (const mesh of [this.distantBodies, this.distantHeads, this.distantHair, this.distantArms]) mesh.instanceMatrix.needsUpdate = true;
    phones.count = phoneCount; phones.instanceMatrix.needsUpdate = true;
    this.root.add(upperSeats, phones);

    const concourse = new THREE.Mesh(new THREE.RingGeometry(18.5, 20.25, 128, 1, Math.PI * .93, Math.PI * 1.14), concrete);
    concourse.rotation.x = -Math.PI / 2; concourse.position.y = 6.65; this.root.add(concourse);
    const suiteGlass = new THREE.MeshPhysicalMaterial({ color: '#54717b', metalness: .2, roughness: .16, transparent: true, opacity: .53, side: THREE.DoubleSide, depthWrite: false });
    const suiteLight = new THREE.MeshBasicMaterial({ color: '#dfc5a2' });
    for (let suite = 0; suite < 16; suite++) {
      const angle = Math.PI * (.955 + suite / 15 * 1.09);
      const radius = 19.25, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const box = new THREE.Group(); box.position.set(x, 6.65, z); box.rotation.y = -angle - Math.PI / 2; this.root.add(box);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.15, .68), seat); wall.position.set(0, .62, .24); box.add(wall);
      const window = new THREE.Mesh(new THREE.PlaneGeometry(2.12, .68), suiteGlass); window.position.set(0, .68, -.115); box.add(window);
      for (const edge of [-1.12, 0, 1.12]) { const frame = new THREE.Mesh(new THREE.BoxGeometry(.045, .94, .08), steel); frame.position.set(edge, .67, -.13); box.add(frame); }
      const header = new THREE.Mesh(new THREE.BoxGeometry(2.18, .055, .1), suiteLight); header.position.set(0, 1.11, -.14); box.add(header);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.9, .05, .23), steel); counter.position.set(0, .35, -.23); box.add(counter);
    }
    for (const deck of decks) {
      const radius = deck.radius - .48;
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .7, 128, 1, true, Math.PI * .93, Math.PI * 1.14), suiteGlass);
      guard.rotation.y = Math.PI / 2; guard.position.y = deck.y - .15; this.root.add(guard);
      const handrail = new THREE.Mesh(new THREE.TorusGeometry(radius, .045, 6, 128, Math.PI * 1.14), steel);
      handrail.rotation.x = Math.PI / 2; handrail.rotation.z = Math.PI * .93; handrail.position.y = deck.y + .2; this.root.add(handrail);
    }

    const arenaWall = new THREE.Mesh(new THREE.CylinderGeometry(30.4, 30.4, 18, 96, 1, true, Math.PI * .91, Math.PI * 1.18), new THREE.MeshStandardMaterial({ color: '#0b1013', metalness: .2, roughness: .9, side: THREE.DoubleSide }));
    arenaWall.rotation.y = Math.PI / 2; arenaWall.position.y = 7.2; this.root.add(arenaWall);
    const wallPanel = new THREE.MeshStandardMaterial({ color: '#1e282d', metalness: .52, roughness: .57 });
    for (let panel = 0; panel < 32; panel++) {
      const angle = Math.PI * (.93 + panel / 31 * 1.14);
      const radius = 30.1;
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(.13, 8.8, .25), wallPanel);
      pilaster.position.set(Math.cos(angle) * radius, 11, Math.sin(angle) * radius); pilaster.rotation.y = -angle - Math.PI / 2; this.root.add(pilaster);
      if (panel % 2 === 0) {
        const sconce = new THREE.Mesh(new THREE.BoxGeometry(.48, .08, .12), suiteLight);
        sconce.position.set(Math.cos(angle) * (radius - .24), 15.1, Math.sin(angle) * (radius - .24)); sconce.rotation.y = -angle - Math.PI / 2; this.root.add(sconce);
      }
    }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(31, 31, .5, 64), new THREE.MeshStandardMaterial({ color: '#11171a', metalness: .62, roughness: .5 }));
    roof.position.y = 19.4; this.root.add(roof);
    for (const radius of [13.5, 22, 29]) {
      const roofRing = new THREE.Mesh(new THREE.TorusGeometry(radius, .16, 6, 96), steel);
      roofRing.rotation.x = Math.PI / 2; roofRing.position.y = 18.75; this.root.add(roofRing);
    }
    for (let i = 0; i < 18; i++) {
      const angle = Math.PI + (i / 17) * Math.PI;
      const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 30), steel);
      roofBeam.position.set(Math.cos(angle) * 15, 18.8, Math.sin(angle) * 15); roofBeam.rotation.y = -angle; roofBeam.rotation.z = (i % 2 ? 1 : -1) * .035; this.root.add(roofBeam);
    }
  }

  private buildVenue(theme: ArenaTheme, variant: number) {
    const accent = new THREE.Color(theme.accent);
    const steel = new THREE.MeshStandardMaterial({ color: variant === 3 ? '#403329' : '#273036', metalness: .72, roughness: .36 });
    const dark = new THREE.MeshStandardMaterial({ color: variant === 1 ? '#100d25' : '#151b1d', roughness: .88 });
    for (const x of [-4.6, 0, 4.6]) {
      const board = sign(x === 0 ? `T U C   /   ${theme.name.toUpperCase()}` : variant === 3 ? 'C H A M P I O N S   O N L Y' : 'E A R N   Y O U R   P L A C E', 4.3, .52, theme.accent);
      board.position.set(x, .33, -6.75); this.venue.add(board);
    }
    for (const side of [-1, 1]) {
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.05, .09, .72), dark); table.position.set(side * 6.15, .5, .7); this.venue.add(table);
      for (const dx of [-.83, .83]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.027, .027, .85, 8), steel); leg.position.set(side * 6.15 + dx, .05, .7); this.venue.add(leg); }
      const monitor = new THREE.Mesh(new THREE.BoxGeometry(.48, .3, .04), new THREE.MeshStandardMaterial({ color: '#080b0d', emissive: accent, emissiveIntensity: .22 })); monitor.position.set(side * 6.15, .7, .7); monitor.rotation.x = -.16; this.venue.add(monitor);
      for (const x of [side * 6.15 - .52, side * 6.15 + .52]) { const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.037, .043, .21, 10), new THREE.MeshPhysicalMaterial({ color: '#85aabd', transparent: true, opacity: .82, roughness: .18 })); bottle.position.set(x, .65, .84); this.venue.add(bottle); }
    }
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const label = sign(`${theme.code}   /   ${theme.name.toUpperCase()}`, 2.55, .2, theme.accent);
      label.position.set(Math.sin(angle) * 4.78, -.19, Math.cos(angle) * 4.78); label.rotation.y = angle; this.venue.add(label);
    }
    this.addLightingRig(steel, accent, variant); this.addScoreboard(theme, steel); this.addBowlBranding(theme, steel);
    if (variant === 0) this.addProvingGround(steel, dark, accent);
    if (variant === 1) this.addNeonDistrict(steel, accent);
    if (variant === 2) this.addAlpineCrown(steel, accent);
    if (variant === 3) this.addImperialDome(steel, accent);
    if (variant === 4) this.addHarborForge(steel, accent);
  }

  private addLightingRig(steel: THREE.Material, accent: THREE.Color, variant: number) {
    for (const z of [-8.2, 7.4]) for (const y of [14.7, 15.05]) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 25, 8), steel); beam.rotation.z = Math.PI / 2; beam.position.set(0, y, z); this.venue.add(beam);
      for (let x = -11; x <= 11; x += 1.5) { const brace = new THREE.Mesh(new THREE.BoxGeometry(.035, .52, .035), steel); brace.position.set(x, 14.88, z); brace.rotation.z = Math.PI / 4; this.venue.add(brace); }
    }
    for (const x of [-8.5, -5.6, -2.8, 0, 2.8, 5.6, 8.5]) {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.19, .28, .3, 12), new THREE.MeshStandardMaterial({ color: '#15191a', emissive: accent, emissiveIntensity: variant === 1 ? 4 : 2.2 }));
      lamp.position.set(x, 14.48, -7.9); lamp.rotation.x = Math.PI / 2; this.venue.add(lamp);
    }
  }

  private addScoreboard(theme: ArenaTheme, steel: THREE.Material) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.4, 4.2), steel); housing.position.set(0, 8.7, 0); this.venue.add(housing);
    const front = eventScreen(theme, 6.14, 1.98, false, this.matchup); front.position.set(0, 8.7, 2.115); this.venue.add(front);
    const back = eventScreen(theme, 6.14, 1.98, false, this.matchup); back.position.set(0, 8.7, -2.115); back.rotation.y = Math.PI; this.venue.add(back);
    this.matchupScreens = [front, back];
    for (const side of [-1, 1]) { const screen = eventScreen(theme, 3.85, 1.98, true); screen.position.set(side * 3.265, 8.7, 0); screen.rotation.y = side * Math.PI / 2; this.venue.add(screen); }
    const trim = new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 1.4, metalness: .55, roughness: .4 });
    for (const y of [7.51, 9.9]) for (const z of [-2.14, 2.14]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(6.57, .055, .07), trim); bar.position.set(0, y, z); this.venue.add(bar); }
    for (const side of [-1, 1]) for (const z of [-2.08, 2.08]) { const edge = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.34, .08), trim); edge.position.set(side * 3.26, 8.7, z); this.venue.add(edge); }
    const crown = new THREE.Mesh(new THREE.BoxGeometry(7.2, .12, 4.8), trim); crown.position.set(0, 9.98, 0); this.venue.add(crown);
    const underside = new THREE.Mesh(new THREE.BoxGeometry(6.9, .08, 4.55), new THREE.MeshBasicMaterial({ color: '#151b20' })); underside.position.set(0, 7.43, 0); this.venue.add(underside);
    for (const x of [-2.7, 2.7]) for (const z of [-1.7, 1.7]) { const cable = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 8.8, 6), steel); cable.position.set(x, 14.4, z); this.venue.add(cable); }
  }

  private addBowlBranding(theme: ArenaTheme, steel: THREE.Material) {
    for (const tier of [{ radius: 12.26, y: 1.69, width: 3.05 }, { radius: 19.4, y: 5.55, width: 4.05 }]) {
      for (let i = 0; i < 9; i++) {
        const angle = Math.PI * (.98 + i / 8 * 1.04);
        const x = Math.cos(angle) * tier.radius, z = Math.sin(angle) * tier.radius;
        const panel = sign(i % 3 === 0 ? `${theme.code}  /  LIVE` : i % 3 === 1 ? theme.name.toUpperCase() : 'TYLER’S ULTIMATE CHAMPIONSHIP', tier.width, .36, theme.accent, '#0b1115');
        panel.position.set(x, tier.y, z); panel.rotation.y = Math.atan2(-x, -z); this.venue.add(panel);
        const upperRail = new THREE.Mesh(new THREE.BoxGeometry(tier.width + .1, .035, .035), steel);
        upperRail.position.set(x, tier.y + .23, z); upperRail.rotation.y = panel.rotation.y; this.venue.add(upperRail);
      }
    }
    for (const x of [-11.7, 11.7]) {
      const banner = sign(theme.location, 2.55, .7, theme.accent, '#10171b');
      banner.position.set(x, 8.4, -10.6); this.venue.add(banner);
    }
  }

  private addProvingGround(steel: THREE.Material, dark: THREE.Material, accent: THREE.Color) {
    for (const x of [-10, -7.5, 7.5, 10]) { const column = new THREE.Mesh(new THREE.BoxGeometry(.32, 6.5, .32), steel); column.position.set(x, 2.75, -8); this.venue.add(column); }
    for (const x of [-8.75, 8.75]) { const door = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.4, .18), dark); door.position.set(x, 1.3, -10.6); this.venue.add(door); const marker = sign('AUTHORIZED PERSONNEL', 1.65, .22, `#${accent.getHexString()}`); marker.position.set(x, 2.45, -10.49); this.venue.add(marker); }
  }

  private addNeonDistrict(_steel: THREE.Material, accent: THREE.Color) {
    const cyan = new THREE.MeshStandardMaterial({ color: '#07191f', emissive: '#18d9ff', emissiveIntensity: 3.4 });
    const magenta = new THREE.MeshStandardMaterial({ color: '#210b22', emissive: accent, emissiveIntensity: 3.8 });
    for (let i = 0; i < 10; i++) { const pillar = new THREE.Mesh(new THREE.BoxGeometry(.1, 3.8 + (i % 3), .1), i % 2 ? cyan : magenta); pillar.position.set(-11.2 + i * 2.5, 2, -11 - (i % 2)); this.venue.add(pillar); }
    for (const x of [-8.3, 8.3]) { const halo = new THREE.Mesh(new THREE.TorusGeometry(1.35, .055, 8, 48), x < 0 ? cyan : magenta); halo.position.set(x, 3.3, -10.5); this.venue.add(halo); const core = sign(x < 0 ? 'NIGHT // 014' : 'FIGHT // LIVE', 1.9, .38, x < 0 ? '#18d9ff' : '#ff4fd8', '#080817'); core.position.set(x, 3.3, -10.43); this.venue.add(core); }
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(36, 22), new THREE.MeshPhysicalMaterial({ color: '#080a16', metalness: .58, roughness: .22, clearcoat: 1 })); wet.rotation.x = -Math.PI / 2; wet.position.set(0, -.375, -5); this.venue.add(wet);
  }

  private addAlpineCrown(steel: THREE.Material, accent: THREE.Color) {
    const snow = new THREE.MeshStandardMaterial({ color: '#a9c6cf', roughness: .94 });
    const mountain = new THREE.MeshStandardMaterial({ color: '#304955', roughness: 1, flatShading: true });
    for (let i = 0; i < 7; i++) { const peak = new THREE.Mesh(new THREE.ConeGeometry(3.4 + (i % 3), 7 + (i % 2) * 2, 4), mountain); peak.position.set(-13 + i * 4.2, 2.5, -18 - (i % 2) * 2); peak.rotation.y = Math.PI / 4; this.venue.add(peak); const cap = new THREE.Mesh(new THREE.ConeGeometry(1.2 + (i % 3) * .3, 2.2, 4), snow); cap.position.set(peak.position.x, 5.5 + (i % 2), peak.position.z); cap.rotation.y = Math.PI / 4; this.venue.add(cap); }
    for (const x of [-10, -5, 0, 5, 10]) { const mullion = new THREE.Mesh(new THREE.BoxGeometry(.08, 6.5, .08), steel); mullion.position.set(x, 3, -12.2); this.venue.add(mullion); }
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(.72), new THREE.MeshStandardMaterial({ color: '#d8f6ff', emissive: accent, emissiveIntensity: 1.4, metalness: .1, roughness: .25 })); crest.position.set(0, 4.25, -11.9); crest.scale.y = 1.5; this.venue.add(crest);
  }

  private addImperialDome(steel: THREE.Material, accent: THREE.Color) {
    const gold = new THREE.MeshStandardMaterial({ color: '#7b5722', emissive: accent, emissiveIntensity: .34, metalness: .84, roughness: .28 });
    for (const x of [-10, -7, -4, 4, 7, 10]) { const column = new THREE.Mesh(new THREE.CylinderGeometry(.23, .32, 6.2, 16), x % 2 ? steel : gold); column.position.set(x, 2.65, -11); this.venue.add(column); const capital = new THREE.Mesh(new THREE.BoxGeometry(.75, .25, .75), gold); capital.position.set(x, 5.72, -11); this.venue.add(capital); }
    for (const x of [-8.5, -5.5, 0, 5.5, 8.5]) { const arch = new THREE.Mesh(new THREE.TorusGeometry(1.45, .11, 10, 28, Math.PI), gold); arch.position.set(x, 4.35, -10.9); this.venue.add(arch); }
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.36, .62, .75, 5), gold); crown.position.set(0, 5.5, -10.6); crown.rotation.z = Math.PI; this.venue.add(crown);
  }

  private addHarborForge(steel: THREE.Material, accent: THREE.Color) {
    const colors = ['#314753', '#713b28', '#4d5e38'];
    for (let i = 0; i < 8; i++) { const container = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.65, 1.6), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], metalness: .36, roughness: .66 })); container.position.set(-11 + (i % 4) * 7.2, .45 + Math.floor(i / 4) * 1.72, -14 - (i % 2)); this.venue.add(container); for (let rib = -1.7; rib <= 1.7; rib += .55) { const line = new THREE.Mesh(new THREE.BoxGeometry(.035, 1.45, .03), steel); line.position.set(container.position.x + rib, container.position.y, container.position.z + .82); this.venue.add(line); } }
    for (const x of [-10.5, 10.5]) { const crane = new THREE.Mesh(new THREE.BoxGeometry(.32, 7.8, .32), steel); crane.position.set(x, 3.5, -9); crane.rotation.z = x < 0 ? -.1 : .1; this.venue.add(crane); const arm = new THREE.Mesh(new THREE.BoxGeometry(5.2, .22, .22), steel); arm.position.set(x + (x < 0 ? 2 : -2), 6.8, -9); this.venue.add(arm); }
    const furnace = new THREE.PointLight(accent, 28, 13, 2); furnace.position.set(0, 2.2, -10); this.venue.add(furnace);
  }
}

export function arenaDetails(scene: THREE.Scene) { return new ArenaEnvironment(scene); }
