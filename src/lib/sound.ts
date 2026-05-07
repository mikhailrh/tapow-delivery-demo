/**
 * Web Audio chimes for vendor screen events.
 *
 * Sounds are generated inline (no audio assets shipped). The first interaction
 * unlocks the AudioContext on browsers that require a user gesture; until then
 * playChime is a no-op.
 */

let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function playNote(freq: number, startOffset: number, duration: number, gainPeak = 0.18) {
  const audio = ensureContext();
  if (!audio) return;
  const t0 = audio.currentTime + startOffset;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  osc.connect(gain);
  gain.connect(audio.destination);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** New incoming order — bright two-note ping. */
export function playIncomingChime() {
  playNote(880, 0, 0.18);
  playNote(1320, 0.18, 0.34);
}

/** Soft warning at 80% prep — single mellow note. */
export function playWarningChime() {
  playNote(660, 0, 0.4, 0.12);
}

/** Subtle confirm tap on accept / mark ready / collected. */
export function playConfirmTick() {
  playNote(1200, 0, 0.08, 0.08);
}

/** Allow vendor to unlock audio with a one-time interaction. */
export function unlockAudio() {
  ensureContext();
}
