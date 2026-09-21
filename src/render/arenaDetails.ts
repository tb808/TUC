import * as THREE from 'three';

function sign(text: string, width: number, height: number, color = '#d5dbdf') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#11171e'; c.fillRect(0, 0, 1024, 128);
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 52px Arial'; c.fillText(text, 512, 67);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .6, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: .3, side: THREE.DoubleSide }));
}

export function arenaDetails(scene: THREE.Scene) {
  const steel = new THREE.MeshStandardMaterial({ color: '#252b32', metalness: .72, roughness: .4 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#171d25', roughness: .92 });
  const seatMaterial = new THREE.MeshBasicMaterial({ color: '#141b25' });
  const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(.42, .45, .36), seatMaterial, 126);
  const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17, .32, 4, 8), new THREE.MeshBasicMaterial(), 126);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.105, 10, 8), new THREE.MeshBasicMaterial(), 126);
  const transform = new THREE.Object3D(); const colors = ['#191f29', '#141923', '#20212b', '#1b2529', '#242323'];
  let n = 0;
  for (let row = 0; row < 3; row++) for (let seat = 0; seat < 42; seat++) {
    const angle = Math.PI + (seat / 41) * Math.PI;
    const radius = 7.8 + row * 1.2;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    transform.position.set(x, .18 + row * .43, z); transform.rotation.set(0, -angle - Math.PI / 2, 0); transform.scale.set(1, 1, 1); transform.updateMatrix();
    seats.setMatrixAt(n, transform.matrix);
    transform.position.y += .34; transform.position.z += .03 * Math.sin(seat * 7); transform.rotation.z = Math.sin(seat * 13) * .06; transform.updateMatrix();
    people.setMatrixAt(n, transform.matrix); people.setColorAt(n, new THREE.Color(colors[(seat * 7 + row) % colors.length]));
    transform.position.y += .4; transform.updateMatrix(); heads.setMatrixAt(n, transform.matrix);
    heads.setColorAt(n, new THREE.Color(['#2f2b29', '#36312f', '#242323'][(seat + row) % 3])); n++;
  }
  scene.add(seats, people, heads);
  for (let row = 0; row < 3; row++) {
    const riser = new THREE.Mesh(new THREE.RingGeometry(7.1 + row * 1.2, 8.4 + row * 1.2, 48, 1, 0, Math.PI), rubber);
    riser.rotation.x = -Math.PI / 2; riser.position.y = -.08 + row * .43; scene.add(riser);
  }
  for (const x of [-4.5, 0, 4.5]) {
    const board = sign(x === 0 ? 'T U C   /   THE PROVING GROUND' : 'E A R N   Y O U R   P L A C E', 4.2, .5);
    board.position.set(x, .25, -6.7); scene.add(board);
  }
  for (const side of [-1, 1]) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.9, .08, .68), rubber); table.position.set(side * 6.1, .53, 1); scene.add(table);
    for (const dx of [-.8, .8]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .85, 8), steel); leg.position.set(side * 6.1 + dx, .08, 1); scene.add(leg);
    }
    const screen = new THREE.Mesh(new THREE.BoxGeometry(.42, .27, .035), rubber); screen.position.set(side * 6.1, .72, 1); screen.rotation.x = -.16; scene.add(screen);
    for (const x of [side * 6.1 - .48, side * 6.1 + .48]) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.038, .042, .2, 10), new THREE.MeshPhysicalMaterial({ color: '#7e9ca7', roughness: .2, metalness: .12 })); bottle.position.set(x, .67, 1.1); scene.add(bottle);
    }
    for (let step = 0; step < 3; step++) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(.72, .1 + step * .12, .35), steel); stair.position.set(side * 5.65, -.34 + step * .06, 2.6 - step * .3); stair.receiveShadow = true; scene.add(stair);
    }
  }
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const label = sign('T U C   /   CHAMPIONSHIP', 2.5, .2);
    label.position.set(Math.sin(angle) * 4.78, -.19, Math.cos(angle) * 4.78); label.rotation.y = angle; scene.add(label);
    const corner = sign('T U C', .78, .13, i < 4 ? '#91b4d5' : '#d59a9a');
    const a = Math.PI / 8 + angle;
    corner.position.set(Math.cos(a) * 4.9, 1.02, Math.sin(a) * 4.9); corner.rotation.set(0, Math.PI / 2 - a, Math.PI / 2); scene.add(corner);
  }
  for (const z of [-3.8, 3.8]) for (const y of [6.2, 6.48]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, 11, 8), steel); beam.rotation.z = Math.PI / 2; beam.position.set(0, y, z); scene.add(beam);
    for (let x = -5; x <= 5; x++) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(.025, .39, .025), steel); brace.position.set(x, 6.34, z); brace.rotation.z = Math.PI / 4; scene.add(brace);
    }
  }
}
