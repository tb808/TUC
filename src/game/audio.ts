export class FightAudio {
  private context: AudioContext | null = null; private master: GainNode | null = null; muted = false;
  async start() {
    if (!this.context) { this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = .55; this.master.connect(this.context.destination); }
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
  hit(strength: number, blocked: boolean) {
    if (!this.context || !this.master) return;
    const c = this.context, duration = blocked ? .07 : .1 + strength * .004;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    const noise = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain(); noise.buffer = buffer;
    filter.type = 'lowpass'; filter.frequency.value = blocked ? 1800 : 700 + strength * 60;
    gain.gain.value = blocked ? .25 : .25 + Math.min(.45, strength / 35);
    noise.connect(filter); filter.connect(gain); gain.connect(this.master); noise.start();
    this.tone(blocked ? 145 : 90, .15, blocked ? .13 : Math.min(.7, .18 + strength / 30), 'sine', 35);
    if (strength > 10 && !blocked) this.tone(155, .18, .06, 'triangle', 65);
  }
  bell() { this.tone(640, .9, .2); this.tone(960, .6, .13); this.tone(1280, .4, .07); }
  breath(exhaustion: number) { if (exhaustion > .5) this.tone(110, .18, .018 * exhaustion, 'triangle', 75); }
}
