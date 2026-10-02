import * as THREE from 'three';
import type { Combat } from '../game/combat';
import { strikeMotion, smooth } from '../game/motion';
import type { FighterRig } from './fighter';
import { solveLimb } from './ik';

/** Contact constraints run after both poses, using the opponent's current bone transforms. */
export class GroundContactSystem {
  private point = new THREE.Vector3(); private rest = new THREE.Vector3(); private pole = new THREE.Vector3();
  private upper = new THREE.Quaternion(); private lower = new THREE.Quaternion();
  private reach(rig: FighterRig, hand: number, point: THREE.Vector3, amount: number, outside: number) {
    const upper = rig.arms[hand], lower = rig.forearms[hand];
    this.upper.copy(upper.quaternion); this.lower.copy(lower.quaternion);
    this.pole.set(outside, .3, .15).applyQuaternion(rig.root.quaternion);
    solveLimb(upper, lower, point, this.pole, .3, .289);
    upper.quaternion.slerp(this.upper, 1 - amount); lower.quaternion.slerp(this.lower, 1 - amount);
    rig.root.updateMatrixWorld(true);
  }
  update(match: Combat, rigs: [FighterRig, FighterRig]) {
    const g = match.grapple;
    if (!g || (g.mode !== 'ground' && !(g.mode === 'submission' && g.submissionKind === 'choke'))) return;
    const top = rigs[g.top], bottom = rigs[g.top === 0 ? 1 : 0];
    const attacking = match.fighters[g.top], defending = match.fighters[g.top === 0 ? 1 : 0];
    const amount = g.transition ? .22 : smooth(g.timer / .3);
    top.root.updateMatrixWorld(true); bottom.root.updateMatrixWorld(true);
    if (g.mode === 'submission') {
      for (let hand = 0; hand < 2; hand++) {
        const sign = hand ? -1 : 1;
        this.point.set(sign * .055, -.1, .075); bottom.head.localToWorld(this.point);
        this.reach(top, hand, this.point, smooth(g.timer / .35), sign);
        this.point.set(0, -.27, 0); top.forearms[hand].localToWorld(this.point);
        this.reach(bottom, hand, this.point, smooth(g.timer / .35) * .8, sign);
      }
      return;
    }
    for (let hand = 0; hand < 2; hand++) {
      const sign = hand ? -1 : 1;
      const activeHand = attacking.attack ? (attacking.attack.technique.hand ^ (attacking.stance === 'southpaw' ? 1 : 0)) : -1;
      if (hand === activeHand && attacking.attack) {
        const a = attacking.attack, { extension, preparation } = strikeMotion(a);
        const body = a.technique.zone === 'body';
        this.point.set(sign * .025, body ? .24 : 0, body ? .14 : .1);
        (body ? bottom.spine : bottom.head).localToWorld(this.point);
        // Retract up and out, then accelerate onto the actual head/rib location.
        const hook = a.technique.id.includes('hook'), hammer = a.technique.id.includes('hammer');
        this.rest.set(sign * (hook ? .34 : .12), hammer ? .43 : hook ? .14 : .24, .05).applyQuaternion(top.root.quaternion).add(this.point);
        this.rest.y += preparation * .08;
        this.point.lerp(this.rest, 1 - smooth(extension));
        this.reach(top, hand, this.point, amount, sign * .9);
      } else {
        this.point.set(sign * .21, .3, .1); bottom.spine.localToWorld(this.point);
        this.reach(top, hand, this.point, amount * .72, sign);
      }
      // The defender's hands frame at the shoulders or protect the face/ribs.
      if (defending.guard) {
        this.point.set(sign * .07, defending.guard === 'high' ? -.015 : .2, .13);
        (defending.guard === 'high' ? bottom.head : bottom.spine).localToWorld(this.point);
      } else {
        this.point.set(sign * .21, .36, .11); top.spine.localToWorld(this.point);
      }
      this.reach(bottom, hand, this.point, amount * .8, sign);
    }
  }
}
