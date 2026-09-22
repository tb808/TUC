import { expect, it } from 'vitest';
import { Combat } from '../src/game/combat';
import { ImpactPhysics } from '../src/render/physics';

it('uses larger physical reactions for heavy impacts and returns toward the controlled pose', async () => {
  const physics = new ImpactPhysics(); await physics.init();
  const game = new Combat();
  const base = { type: 'hit' as const, attacker: 0 as const, technique: 'punch-0-head', zone: 'head' as const, blocked: false, position: { x: 0, z: 0 } };
  physics.hit({ ...base, target: 0, strength: 4 });
  physics.hit({ ...base, target: 1, strength: 14 });
  for (let i = 0; i < 8; i++) physics.step(game);
  const angle = (id: number) => 2 * Math.acos(Math.min(1, Math.abs(physics.rotation(id).w)));
  const light = angle(0), heavy = angle(1);
  expect(light).toBeGreaterThan(0); expect(heavy).toBeGreaterThan(light * 2);
  for (let i = 0; i < 180; i++) physics.step(game);
  expect(angle(1)).toBeLessThan(heavy * .1);
  physics.world.free();
});
