import * as THREE from 'three';

/** Deterministic micro-surfaces; no network assets or per-frame texture work. */
export function surfaceTexture(kind: 'skin' | 'cloth' | 'canvas', size = 256) {
  const pixels = new Uint8Array(size * size * 4);
  let seed = 1729;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 4294967296 - .5);
    const weave = Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 2);
    const value = kind === 'skin' ? 166 + noise * 48 : 178 + weave * 24 + noise * 24;
    const offset = (y * size + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  texture.repeat.set(kind === 'skin' ? 2 : kind === 'cloth' ? 4 : 28, kind === 'skin' ? 2 : kind === 'cloth' ? 4 : 28);
  return texture;
}

export function skinMaterial(color: string) {
  const pores = surfaceTexture('skin');
  return new THREE.MeshPhysicalMaterial({ color, roughness: .7, bumpMap: pores, bumpScale: .0015,
    clearcoat: .1, clearcoatRoughness: .5, sheen: .08, sheenColor: new THREE.Color('#dbaa89') });
}

export function fabricMaterial(color: string) {
  const weave = surfaceTexture('cloth');
  return new THREE.MeshPhysicalMaterial({ color, roughness: .86, bumpMap: weave, bumpScale: .0012,
    sheen: .35, sheenRoughness: .75, sheenColor: new THREE.Color('#9ba6b2') });
}
