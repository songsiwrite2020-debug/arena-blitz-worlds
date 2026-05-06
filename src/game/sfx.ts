// Synthesized SFX via WebAudio — no asset files required.
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

const env = (g: GainNode, t: number, peak: number, attack: number, decay: number) => {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
};

export const sfx = {
  shot(weapon: "pistol" | "smg" | "sniper" = "pistol") {
    const c = getCtx();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = weapon === "sniper" ? 1800 : weapon === "smg" ? 2400 : 2200;
    o.type = "square";
    const baseFreq = weapon === "sniper" ? 140 : weapon === "smg" ? 380 : 260;
    o.frequency.setValueAtTime(baseFreq * 4, t);
    o.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.08);
    o.connect(f); f.connect(g); g.connect(c.destination);
    env(g, t, weapon === "sniper" ? 0.5 : 0.28, 0.001, weapon === "sniper" ? 0.25 : 0.12);
    o.start(t); o.stop(t + 0.3);

    // noise burst
    const buf = c.createBuffer(1, c.sampleRate * 0.1, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = c.createBufferSource();
    n.buffer = buf;
    const ng = c.createGain();
    env(ng, t, 0.18, 0.001, 0.06);
    n.connect(ng); ng.connect(c.destination);
    n.start(t);
  },
  hit() {
    const c = getCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    o.connect(g); g.connect(c.destination);
    env(g, t, 0.25, 0.001, 0.1);
    o.start(t); o.stop(t + 0.15);
  },
  hurt() {
    const c = getCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    o.connect(g); g.connect(c.destination);
    env(g, t, 0.3, 0.005, 0.2);
    o.start(t); o.stop(t + 0.3);
  },
  jump() {
    const c = getCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    o.connect(g); g.connect(c.destination);
    env(g, t, 0.12, 0.005, 0.1);
    o.start(t); o.stop(t + 0.18);
  },
  kill() {
    const c = getCtx(); const t = c.currentTime;
    [440, 660, 880].forEach((freq, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "square"; o.frequency.value = freq;
      o.connect(g); g.connect(c.destination);
      env(g, t + i * 0.08, 0.18, 0.005, 0.18);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.25);
    });
  },
  reload() {
    const c = getCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "square"; o.frequency.value = 120;
    o.connect(g); g.connect(c.destination);
    env(g, t, 0.1, 0.005, 0.08);
    o.start(t); o.stop(t + 0.12);
    const o2 = c.createOscillator(); const g2 = c.createGain();
    o2.type = "square"; o2.frequency.value = 180;
    o2.connect(g2); g2.connect(c.destination);
    env(g2, t + 0.18, 0.1, 0.005, 0.08);
    o2.start(t + 0.18); o2.stop(t + 0.32);
  },
  switchWeapon() {
    const c = getCtx(); const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(600, t);
    o.frequency.linearRampToValueAtTime(900, t + 0.06);
    o.connect(g); g.connect(c.destination);
    env(g, t, 0.1, 0.005, 0.06);
    o.start(t); o.stop(t + 0.1);
  },
};
