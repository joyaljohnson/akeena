import { useSyncExternalStore } from 'react';

/**
 * The music behind the letter. It is one audio element for the whole page, started from a real tap
 * (the seal), because phones refuse to play sound that starts by itself. It fades in, loops, pauses
 * when she leaves the page and returns when she comes back, and can be turned off and on.
 */

const TARGET_VOLUME = 0.55;
const FADE_MS = 1600;

type Snapshot = { available: boolean; playing: boolean };

let audio: HTMLAudioElement | null = null;
let url = '';
let wantOn = false; // she has not turned it off
let snapshot: Snapshot = { available: false, playing: false };
let fade: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

function fadeTo(volume: number, ms: number, done?: () => void) {
  if (fade) clearInterval(fade);
  const el = audio;
  if (!el) return;
  const from = el.volume;
  const started = performance.now();
  fade = setInterval(() => {
    const t = Math.min(1, (performance.now() - started) / ms);
    el.volume = Math.max(0, Math.min(1, from + (volume - from) * t));
    if (t >= 1) {
      if (fade) clearInterval(fade);
      done?.();
    }
  }, 50);
}

async function play(): Promise<void> {
  if (!audio) return;
  try {
    audio.volume = 0;
    await audio.play();
    publish({ playing: true });
    fadeTo(TARGET_VOLUME, FADE_MS);
  } catch {
    // The browser refused (no tap yet). The sound button stays "off" and a tap will start it.
    publish({ playing: false });
  }
}

/** Call from a tap handler. Safe to call again with the same address. */
export function startMusic(source: string): void {
  if (typeof Audio === 'undefined') return;
  if (!audio || url !== source) {
    audio?.pause();
    audio = new Audio(source);
    audio.loop = true;
    audio.preload = 'auto';
    url = source;
  }
  wantOn = true;
  publish({ available: true });
  void play();
}

/** Call from a tap handler (the sound button). */
export function toggleMusic(): void {
  if (!audio) return;
  if (snapshot.playing) {
    wantOn = false;
    fadeTo(0, 400, () => {
      audio?.pause();
      publish({ playing: false });
    });
  } else {
    wantOn = true;
    void play();
  }
}

export function stopMusic(): void {
  if (fade) clearInterval(fade);
  audio?.pause();
  audio = null;
  url = '';
  wantOn = false;
  publish({ available: false, playing: false });
}

/** Tells the sound button whether there is music at all, before it has started. */
export function offerMusic(source: string): void {
  if (typeof Audio === 'undefined') return;
  if (!audio || url !== source) {
    audio?.pause();
    audio = new Audio(source);
    audio.loop = true;
    audio.preload = 'auto';
    url = source;
  }
  publish({ available: true });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) {
      audio.pause();
      publish({ playing: false });
    } else if (wantOn) {
      void play();
    }
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useMusic(): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}
