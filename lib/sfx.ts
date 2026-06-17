// StellarBurst sound effects — tiny original retro "space" blips synthesized
// with the Web Audio API. No audio asset files, no external libraries.
// SSR-safe: no module-level AudioContext; created lazily, browser-only.

export type SfxName =
  | "flare" // attack lands — a short descending zap
  | "reflect" // bounce back — a quick up-chirp
  | "chain" // chain hop — two fast blips
  | "heal" // rekindle — a soft rising tone
  | "eclipse" // skip — a low muted thunk
  | "reverse" // retrograde — a wobble/sweep
  | "stella" // STELLA! declared — a bright sparkle arpeggio
  | "callout" // caught — a buzzer
  | "win" // last star — a short triumphant arpeggio
  | "darken"; // a star goes out — a downward fade

const STORAGE_KEY = "sb_sfx";

// Single, lazily-created AudioContext shared across all effects.
let ctx: AudioContext | null = null;

type AudioContextCtor = new () => AudioContext;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const w = window as unknown as {
        AudioContext?: AudioContextCtor;
        webkitAudioContext?: AudioContextCtor;
      };
      const Ctor = w.AudioContext || w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // Browsers require a user gesture to start audio; our calls happen after
    // taps, so a best-effort resume is appropriate here.
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

export function isSfxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    // Default enabled when storage is inaccessible.
    return true;
  }
}

export function setSfxEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

// Master gain kept low so effects stay gentle.
const MASTER = 0.09;

// Schedule a single enveloped tone.
function tone(
  ac: AudioContext,
  freq: number,
  durationMs: number,
  type: OscillatorType,
  startGain: number,
  startAt: number,
  endFreq?: number,
): void {
  const dur = durationMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFreq),
      startAt + dur,
    );
  }

  const peak = startGain * MASTER;
  // Quick attack, short exponential decay.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.02);
}

// Schedule an arpeggio: a sequence of short tones stepMs apart.
function arp(
  ac: AudioContext,
  freqs: number[],
  stepMs: number,
  type: OscillatorType,
  startGain = 1,
): void {
  const now = ac.currentTime;
  const step = stepMs / 1000;
  freqs.forEach((f, i) => {
    tone(ac, f, stepMs * 0.95, type, startGain, now + i * step);
  });
}

export function playSfx(name: SfxName): void {
  try {
    if (typeof window === "undefined") return;
    if (!isSfxEnabled()) return;
    const ac = getContext();
    if (!ac) return;
    const now = ac.currentTime;

    switch (name) {
      case "flare":
        // Short descending zap.
        tone(ac, 880, 180, "sawtooth", 1, now, 180);
        break;
      case "reflect":
        // Quick up-chirp.
        tone(ac, 320, 140, "square", 0.9, now, 1200);
        break;
      case "chain":
        // Two fast blips.
        tone(ac, 700, 70, "square", 0.9, now);
        tone(ac, 1040, 70, "square", 0.9, now + 0.09);
        break;
      case "heal":
        // Soft rising tone.
        tone(ac, 440, 360, "sine", 1.1, now, 880);
        break;
      case "eclipse":
        // Low muted thunk.
        tone(ac, 140, 160, "triangle", 1.2, now, 70);
        break;
      case "reverse":
        // Wobble / sweep down then up.
        tone(ac, 600, 180, "sine", 0.9, now, 240);
        tone(ac, 240, 180, "sine", 0.9, now + 0.18, 600);
        break;
      case "stella":
        // Bright sparkle arpeggio.
        arp(ac, [784, 988, 1175, 1568], 70, "triangle", 0.9);
        break;
      case "callout":
        // Harsh buzzer.
        tone(ac, 150, 320, "sawtooth", 1.1, now);
        tone(ac, 156, 320, "square", 0.7, now);
        break;
      case "win":
        // Short triumphant arpeggio.
        arp(ac, [523, 659, 784, 1046], 90, "square", 0.95);
        break;
      case "darken":
        // Downward fade — a star going out.
        tone(ac, 520, 400, "sine", 1, now, 90);
        break;
      default:
        break;
    }
  } catch {
    // Never let audio throw into the UI.
  }
}
