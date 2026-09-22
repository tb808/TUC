import { describe, expect, it } from 'vitest';
import { WALKOUT_DURATION, walkoutAt } from '../src/game/walkout';

describe('authentic fight-night walkout sequence', () => {
  it('runs both corners through checks, walkouts, introductions and referee instructions', () => {
    expect(walkoutAt(3).beat.stage).toBe('red-check');
    expect(walkoutAt(7).beat.stage).toBe('red-walk');
    expect(walkoutAt(12).beat.stage).toBe('red-inspection');
    expect(walkoutAt(20).beat.stage).toBe('blue-walk');
    expect(walkoutAt(26).beat.stage).toBe('blue-inspection');
    expect(walkoutAt(32).beat.stage).toBe('introductions');
    expect(walkoutAt(36).beat.stage).toBe('instructions');
    expect(walkoutAt(WALKOUT_DURATION).active).toBe(false);
  });

  it('moves each fighter from the tunnel into the correct cage corner', () => {
    const redTunnel = walkoutAt(7).fighters[1];
    const redCorner = walkoutAt(17).fighters[1];
    const blueTunnel = walkoutAt(21).fighters[0];
    const blueCorner = walkoutAt(31).fighters[0];
    expect(redTunnel.position.z).toBeLessThan(-5);
    expect(redCorner.position.x).toBeGreaterThan(2);
    expect(blueTunnel.position.z).toBeLessThan(-5);
    expect(blueCorner.position.x).toBeLessThan(-2);
  });
});
