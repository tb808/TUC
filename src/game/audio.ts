import type { Zone } from './types';
export class FightAudio {
  private context: AudioContext | null = null; private master: GainNode | null = null; private walkoutTimers: number[] = []; muted = false;
  private impactNoise: AudioBuffer | null = null; private footfalls = [0, 0];
  async start() {
    if (!this.context) {
      this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = .55; this.master.connect(this.context.destination);
      this.impactNoise = this.context.createBuffer(1, this.context.sampleRate * .4, this.context.sampleRate);
      const data = this.impactNoise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      // A quiet filtered room bed gives impacts a sense of space without masking them.
      const room = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
      const roomNoise = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate), crowd = roomNoise.getChannelData(0);
      let sample = 0; for (let i = 0; i < crowd.length; i++) { sample = sample * .98 + (Math.random() * 2 - 1) * .02; crowd[i] = sample; }
      room.buffer = roomNoise; room.loop = true; filter.type = 'bandpass'; filter.frequency.value = 440; filter.Q.value = .45; gain.gain.value = .06;
      room.connect(filter); filter.connect(gain); gain.connect(this.master); room.start();
    }
    await this.context.resume();
  }
  setMuted(value: boolean) { this.muted = value; if (this.master) this.master.gain.value = value ? 0 : .55; }
  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', end = frequency) {
    if (!this.context || !this.master) return;
    const c = this.context, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(frequency, c.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), c.currentTime + duration);
    g.gain.setValueAtTime(volume, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + duration);
    o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + duration);
  }
  hit(strength: number, blocked: boolean, zone: Zone = 'head', technique = 'punch', grounded = false) {
    if (!this.context || !this.master) return;
    const c = this.context, kick = technique.toLowerCase().includes('kick'), duration = blocked ? .075 : zone === 'body' ? .19 : kick ? .17 : .11;
    const noise = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain(); noise.buffer = this.impactNoise;
    noise.playbackRate.value = .94 + Math.random() * .12;
    filter.type = 'lowpass'; filter.frequency.value = (blocked ? 2100 : zone === 'body' ? 650 : zone === 'leg' ? 900 : 1500) * (.9 + Math.random() * .2);
    gain.gain.setValueAtTime(blocked ? .17 : .2 + Math.min(.3, strength / 45), c.currentTime); gain.gain.exponentialRampToValueAtTime(.001, c.currentTime + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(this.master); noise.start(); noise.stop(c.currentTime + duration);
    this.tone(blocked ? 145 : zone === 'body' ? 65 : kick ? 78 : 110, duration, blocked ? .09 : Math.min(.4, .12 + strength / 50), 'sine', 35);
    if (grounded) this.tone(48, .13, .035, 'sine', 28);
    if (strength > 10 && !blocked) this.tone(155, .18, .06, 'triangle', 65);
  }
  footsteps(counts: number[]) { counts.forEach((count, id) => { if (count > this.footfalls[id]) this.tone(72 + id * 9, .045, .016, 'triangle', 38); this.footfalls[id] = count; }); }
  bell() { this.tone(640, .9, .2); this.tone(960, .6, .13); this.tone(1280, .4, .07); }
  walkoutCue(stage: string, corner?: 0 | 1) {
    if (!this.context || !this.master) return;
    this.stopWalkout();
    if (stage === 'broadcast') { this.tone(72, .8, .24, 'sawtooth', 42); this.tone(144, 1.1, .09, 'triangle', 90); return; }
    if (stage.endsWith('walk')) {
      const root = corner ? 82 : 98;
      for (let i = 0; i < 8; i++) this.walkoutTimers.push(window.setTimeout(() => { this.tone(root, .18, .1, 'square', root * .72); if (i % 2 === 0) this.tone(root * 2, .12, .045, 'sawtooth', root * 1.4); }, i * 620));
      return;
    }
    if (stage.endsWith('inspection')) { this.tone(310, .16, .055, 'triangle', 420); this.tone(420, .18, .04, 'triangle', 520); return; }
    if (stage.endsWith('entry')) { this.tone(105, .55, .16, 'sawtooth', 52); return; }
    if (stage === 'introductions') { this.tone(196, .8, .1, 'triangle', 294); this.tone(294, 1.1, .07, 'triangle', 392); return; }
    if (stage === 'instructions') { this.tone(155, .32, .05, 'sine', 130); return; }
    if (stage === 'corners') { this.tone(85, .5, .13, 'square', 48); }
  }
  stopWalkout() { this.walkoutTimers.forEach(timer => window.clearTimeout(timer)); this.walkoutTimers = []; }
  breath(exhaustion: number) { if (exhaustion > .5) this.tone(110, .18, .018 * exhaustion, 'triangle', 75); }
}
