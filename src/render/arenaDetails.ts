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

type Spectator = { x: number; y: number; z: number; angle: number; phase: number; energy: number };

export class ArenaEnvironment {
  readonly root = new THREE.Group();
  private venue = new THREE.Group();
  private spectators: Spectator[] = [];
  private bodies: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private arms: THREE.InstancedMesh;
  private distantSpectators: Spectator[] = [];
  private distantBodies: THREE.InstancedMesh;
  private distantHeads: THREE.InstancedMesh;
  private ribbonMaterials: THREE.MeshStandardMaterial[] = [];
  private transform = new THREE.Object3D();
  private themeIndex = 0;
  private nextCrowdUpdate = 0;

  constructor(private scene: THREE.Scene) {
    this.root.name = 'arena-environment'; this.venue.name = 'venue-details'; this.root.add(this.venue); this.scene.add(this.root);
    const bodyMaterial = new THREE.MeshStandardMaterial({ roughness: .94 });
    const skinMaterial = new THREE.MeshStandardMaterial({ roughness: .9 });
    this.bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.16, .31, 3, 6), bodyMaterial, 240);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.11, 8, 6), skinMaterial, 240);
    this.arms = new THREE.InstancedMesh(new THREE.CylinderGeometry(.045, .055, .4, 6), bodyMaterial, 480);
    this.distantBodies = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .31, .12), new THREE.MeshStandardMaterial({ roughness: .96 }), 1400);
    this.distantHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(.075, 6, 4), new THREE.MeshStandardMaterial({ roughness: .95 }), 1400);
    this.bodies.frustumCulled = this.heads.frustumCulled = this.arms.frustumCulled = this.distantBodies.frustumCulled = this.distantHeads.frustumCulled = false;
    this.root.add(this.bodies, this.heads, this.arms, this.distantBodies, this.distantHeads);
    this.buildGrandstand(); this.setArena(0); this.update(0, true);
  }

  setArena(index: number) {
    this.themeIndex = Math.max(0, Math.min(ARENAS.length - 1, index));
    const theme = ARENAS[this.themeIndex];
    this.scene.background = new THREE.Color(theme.background);
    this.scene.fog = new THREE.FogExp2(theme.fog, this.themeIndex === 2 ? .018 : .027);
    this.clearVenue(); this.buildVenue(theme, this.themeIndex);
    for (let i = 0; i < this.spectators.length; i++) {
      const shirt = theme.crowd[(i * 7 + Math.floor(i / 48)) % theme.crowd.length];
      this.bodies.setColorAt(i, new THREE.Color(shirt));
      this.heads.setColorAt(i, new THREE.Color(['#d2a681', '#8b6048', '#e5c4a3', '#694938', '#b47c5d'][i % 5]));
      this.arms.setColorAt(i * 2, new THREE.Color(shirt)); this.arms.setColorAt(i * 2 + 1, new THREE.Color(shirt));
    }
    for (let i = 0; i < this.distantSpectators.length; i++) {
      this.distantBodies.setColorAt(i, new THREE.Color(theme.crowd[(i * 11 + Math.floor(i / 68)) % theme.crowd.length]));
      this.distantHeads.setColorAt(i, new THREE.Color(['#d2a681', '#8b6048', '#e5c4a3', '#694938', '#b47c5d'][i % 5]));
    }
    this.bodies.instanceColor!.needsUpdate = this.heads.instanceColor!.needsUpdate = this.arms.instanceColor!.needsUpdate = this.distantBodies.instanceColor!.needsUpdate = this.distantHeads.instanceColor!.needsUpdate = true;
    for (const material of this.ribbonMaterials) { material.color.set(theme.accent).multiplyScalar(.34); material.emissive.set(theme.accent); }
    this.nextCrowdUpdate = 0;
  }

  private clearVenue() {
    this.venue.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        const mapped = material as THREE.MeshStandardMaterial;
        mapped.map?.dispose(); mapped.emissiveMap?.dispose(); material.dispose();
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
      this.transform.position.set(p.x, p.y + bounce, p.z); this.transform.rotation.set(0, p.angle, Math.sin(time * 1.8 + p.phase) * .025); this.transform.scale.set(1, 1, 1); this.transform.updateMatrix(); this.bodies.setMatrixAt(i, this.transform.matrix);
      this.transform.position.y = p.y + .43 + bounce; this.transform.rotation.z = 0; this.transform.updateMatrix(); this.heads.setMatrixAt(i, this.transform.matrix);
      for (let side = -1; side <= 1; side += 2) {
        const raised = p.energy > .62 && cheer > .42;
        this.transform.position.set(p.x + Math.cos(p.angle) * side * .2, p.y + .19 + bounce + (raised ? .22 : 0), p.z - Math.sin(p.angle) * side * .2);
        this.transform.rotation.set(raised ? 0 : .15, p.angle, side * (raised ? .65 : .22)); this.transform.updateMatrix(); this.arms.setMatrixAt(i * 2 + (side === 1 ? 1 : 0), this.transform.matrix);
      }
    }
    this.bodies.instanceMatrix.needsUpdate = this.heads.instanceMatrix.needsUpdate = this.arms.instanceMatrix.needsUpdate = true;
  }

  private buildGrandstand() {
    const steel = new THREE.MeshStandardMaterial({ color: '#222a2d', metalness: .55, roughness: .62 });
    const seat = new THREE.MeshStandardMaterial({ color: '#141b20', roughness: .95 });
    for (let row = 0; row < 5; row++) {
      const riser = new THREE.Mesh(new THREE.RingGeometry(7.15 + row * 1.05, 8.18 + row * 1.05, 72, 1, Math.PI * .93, Math.PI * 1.14), steel);
      riser.rotation.x = -Math.PI / 2; riser.position.y = -.22 + row * .43; this.root.add(riser);
      for (let spot = 0; spot < 48; spot++) {
        const angle = Math.PI * .93 + (spot / 47) * Math.PI * 1.14;
        const radius = 7.65 + row * 1.05;
        this.spectators.push({ x: Math.cos(angle) * radius, y: .2 + row * .43, z: Math.sin(angle) * radius, angle: -angle - Math.PI / 2, phase: row * 2.1 + spot * .73, energy: .35 + ((spot * 17 + row * 11) % 61) / 100 });
      }
    }
    const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(.38, .18, .34), seat, this.spectators.length);
    this.spectators.forEach((p, i) => { this.transform.position.set(p.x, p.y - .25, p.z); this.transform.rotation.set(0, p.angle, 0); this.transform.updateMatrix(); seats.setMatrixAt(i, this.transform.matrix); });
    this.root.add(seats);
    for (const x of [-6.8, 6.8]) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.05, 5.8), new THREE.MeshStandardMaterial({ color: '#171f22', roughness: .82 }));
      stair.position.set(x, .55, -8.9); stair.rotation.x = -.12; this.root.add(stair);
      for (let y = 0; y < 5; y++) { const edge = new THREE.Mesh(new THREE.BoxGeometry(1.08, .035, 5.1 - y * .62), new THREE.MeshBasicMaterial({ color: '#667075' })); edge.position.set(x, -.25 + y * .42, -8.62 - y * .28); this.root.add(edge); }
    }
    const barrier = new THREE.Mesh(new THREE.CylinderGeometry(7.02, 7.02, .72, 64, 1, true, Math.PI * .93, Math.PI * 1.14), new THREE.MeshStandardMaterial({ color: '#101619', metalness: .4, roughness: .62, side: THREE.DoubleSide }));
    barrier.rotation.y = Math.PI / 2; barrier.position.y = .05; this.root.add(barrier);

    // Two additional seating bowls turn the intimate lower rows into a major event arena.
    const decks = [
      { rows: 8, seats: 68, radius: 12.9, step: .86, y: 2.75, rise: .5 },
      { rows: 10, seats: 84, radius: 20.1, step: .92, y: 7.15, rise: .62 },
    ];
    for (const [deckIndex, deck] of decks.entries()) {
      for (let row = 0; row < deck.rows; row++) {
        const radius = deck.radius + row * deck.step;
        const y = deck.y + row * deck.rise;
        const terrace = new THREE.Mesh(new THREE.RingGeometry(radius - .43, radius + .43, 96, 1, Math.PI * .93, Math.PI * 1.14), row % 2 ? seat : steel);
        terrace.rotation.x = -Math.PI / 2; terrace.position.y = y - .27; this.root.add(terrace);
        for (let spot = 0; spot < deck.seats; spot++) {
          const angle = Math.PI * .93 + (spot / (deck.seats - 1)) * Math.PI * 1.14;
          this.distantSpectators.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, angle: -angle - Math.PI / 2, phase: deckIndex * 3.7 + row * 1.3 + spot * .41, energy: .2 + ((spot * 13 + row * 19) % 65) / 100 });
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
    this.distantBodies.count = this.distantHeads.count = this.distantSpectators.length;
    this.distantSpectators.forEach((p, i) => {
      this.transform.position.set(p.x, p.y, p.z); this.transform.rotation.set(0, p.angle, 0); this.transform.scale.set(1, 1, 1); this.transform.updateMatrix(); this.distantBodies.setMatrixAt(i, this.transform.matrix);
      this.transform.position.y = p.y + .27; this.transform.updateMatrix(); this.distantHeads.setMatrixAt(i, this.transform.matrix);
    });
    this.distantBodies.instanceMatrix.needsUpdate = this.distantHeads.instanceMatrix.needsUpdate = true;

    const arenaWall = new THREE.Mesh(new THREE.CylinderGeometry(30.4, 30.4, 18, 96, 1, true, Math.PI * .91, Math.PI * 1.18), new THREE.MeshStandardMaterial({ color: '#0b1013', metalness: .2, roughness: .9, side: THREE.DoubleSide }));
    arenaWall.rotation.y = Math.PI / 2; arenaWall.position.y = 7.2; this.root.add(arenaWall);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(31, 31, .5, 64), new THREE.MeshStandardMaterial({ color: '#11171a', metalness: .62, roughness: .5 }));
    roof.position.y = 19.4; this.root.add(roof);
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
    this.addLightingRig(steel, accent, variant); this.addScoreboard(theme, steel);
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
    const front = sign(`TYLER  VS  VOLK   /   ${theme.code}`, 5.9, 1.45, theme.accent, '#070a0c'); front.position.set(0, 8.72, 2.12); this.venue.add(front);
    const back = sign(`TYLER  VS  VOLK   /   ${theme.code}`, 5.9, 1.45, theme.accent, '#070a0c'); back.position.set(0, 8.72, -2.12); back.rotation.y = Math.PI; this.venue.add(back);
    for (const side of [-1, 1]) { const screen = sign(theme.name.toUpperCase(), 3.65, 1.45, theme.accent, '#070a0c'); screen.position.set(side * 3.27, 8.72, 0); screen.rotation.y = side * Math.PI / 2; this.venue.add(screen); }
    const crown = new THREE.Mesh(new THREE.BoxGeometry(7.2, .12, 4.8), new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 2.6, metalness: .35, roughness: .38 })); crown.position.set(0, 9.98, 0); this.venue.add(crown);
    for (const x of [-2.7, 2.7]) for (const z of [-1.7, 1.7]) { const cable = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 8.8, 6), steel); cable.position.set(x, 14.4, z); this.venue.add(cable); }
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
