// Synthesized sound effects via Web Audio API — zero asset files.
// Gracefully no-ops if audio is unavailable or muted.

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

export const sfx = {
  click() {
    if (muted) return;
    tone(420, 0, 0.06, "triangle", 0.08);
  },
  pop() {
    if (muted) return;
    tone(680, 0, 0.08, "sine", 0.12);
    tone(880, 0.04, 0.08, "sine", 0.1);
  },
  correct() {
    if (muted) return;
    // ascending arpeggio C E G C
    tone(523.25, 0, 0.12, "triangle", 0.16);
    tone(659.25, 0.1, 0.12, "triangle", 0.16);
    tone(783.99, 0.2, 0.12, "triangle", 0.16);
    tone(1046.5, 0.3, 0.2, "triangle", 0.18);
  },
  wrong() {
    if (muted) return;
    tone(180, 0, 0.18, "sawtooth", 0.12);
    tone(120, 0.08, 0.2, "sawtooth", 0.1);
  },
  close() {
    if (muted) return;
    tone(440, 0, 0.08, "sine", 0.08);
    tone(523, 0.06, 0.1, "sine", 0.08);
  },
  join() {
    if (muted) return;
    tone(660, 0, 0.08, "sine", 0.1);
  },
  leave() {
    if (muted) return;
    tone(330, 0, 0.12, "sine", 0.08);
  },
  tick() {
    if (muted) return;
    tone(900, 0, 0.04, "square", 0.05);
  },
  choose() {
    if (muted) return;
    tone(523, 0, 0.08, "triangle", 0.12);
    tone(659, 0.08, 0.1, "triangle", 0.12);
  },
  roundEnd() {
    if (muted) return;
    tone(659, 0, 0.12, "triangle", 0.14);
    tone(784, 0.12, 0.12, "triangle", 0.14);
    tone(988, 0.24, 0.2, "triangle", 0.16);
  },
  gameEnd() {
    if (muted) return;
    // little fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, i * 0.14, 0.2, "triangle", 0.16));
  },
  reaction() {
    if (muted) return;
    tone(740, 0, 0.06, "sine", 0.06);
  },
  chatPop() {
    if (muted) return;
    tone(880, 0, 0.04, "sine", 0.04);
  },
  start() {
    if (muted) return;
    tone(392, 0, 0.1, "triangle", 0.14);
    tone(523, 0.1, 0.1, "triangle", 0.14);
    tone(659, 0.2, 0.18, "triangle", 0.16);
  },
};

// Subtle ASMR-style brush scratch (filtered noise burst) — called per stroke-point while drawing.
// Throttled by the caller. Different brushes → slightly different timbre.
let lastScratch = 0;
export function brushScratch(brush?: string) {
  if (muted) return;
  const now = Date.now();
  if (now - lastScratch < 45) return; // hard throttle
  lastScratch = now;
  const c = getCtx();
  if (!c) return;
  const dur = brush === "marker" ? 0.06 : brush === "pencil" ? 0.04 : 0.035;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    // decaying noise
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.5;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = brush === "marker" ? 900 : brush === "pencil" ? 2200 : brush === "neon" ? 1500 : 1600;
  filter.Q.value = 0.8;
  const g = c.createGain();
  g.gain.value = brush === "neon" ? 0.05 : 0.035;
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
  src.stop(c.currentTime + dur);
}

// Unlock audio on first user gesture (browsers require this).
export function primeAudio() {
  const unlock = () => {
    getCtx();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }
}
