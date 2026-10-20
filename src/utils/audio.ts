// Web Audio API engine for procedural ambient acoustic melody and interactive SFX
// Completely offline-ready, 0 network dependencies, WCAG accessible

let audioCtx: AudioContext | null = null;
let bgMusicInterval: number | null = null;
let isAudioMuted = false;
let isMusicPlaying = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setMuted(muted: boolean) {
  isAudioMuted = muted;
  if (muted && isMusicPlaying) {
    stopAmbientMusic();
  }
}

export function getIsMuted(): boolean {
  return isAudioMuted;
}

export function getIsMusicPlaying(): boolean {
  return isMusicPlaying;
}

// Play gentle pentatonic chime note (Music Box / Celesta tone)
function playTone(freq: number, duration: number, gainValue = 0.08, type: OscillatorType = 'sine') {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Warm soft bell envelope
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors gracefully
  }
}

// Gentle arpeggio melody loop for ambient music
const melodyNotes = [
  261.63, // C4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  440.00, // A4
  392.00, // G4
  329.63, // E4
  293.66, // D4
  349.23, // F4
  440.00, // A4
  523.25, // C5
];

export function startAmbientMusic(): boolean {
  if (isAudioMuted) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (isMusicPlaying) return true;
  isMusicPlaying = true;

  let noteIndex = 0;
  // Play a gentle note every 1.8 seconds with soft music box character
  bgMusicInterval = window.setInterval(() => {
    if (!isMusicPlaying || isAudioMuted) return;
    const note = melodyNotes[noteIndex % melodyNotes.length];
    playTone(note, 2.2, 0.04, 'sine');
    // Harmony note occasionally
    if (noteIndex % 3 === 0) {
      playTone(note * 1.25, 2.0, 0.02, 'triangle');
    }
    noteIndex++;
  }, 1600);

  return true;
}

export function stopAmbientMusic() {
  isMusicPlaying = false;
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
}

export function toggleAmbientMusic(): boolean {
  if (isMusicPlaying) {
    stopAmbientMusic();
    return false;
  } else {
    return startAmbientMusic();
  }
}

// SFX: Soft wooden tick for spinning wheel
export function playWheelTick(pitchMultiplier = 1) {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((550 + Math.random() * 100) * pitchMultiplier, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Ignore
  }
}

// SFX: Suspense drum roll / tension pulse
export function playSuspensePulse() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore
  }
}

// SFX: Crystalline bell chime for opening modal / gift
export function playChime() {
  if (isAudioMuted) return;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playTone(freq, 1.2, 0.07, 'sine');
    }, idx * 90);
  });
}

// SFX: Celebration fanfare for wheel win or card completion
export function playCelebration() {
  if (isAudioMuted) return;
  const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playTone(freq, 1.8, 0.11, 'triangle');
      playTone(freq * 0.5, 1.8, 0.05, 'sine');
    }, idx * 100);
  });
}

// SFX: Soft tap/pop for button feedback
export function playSoftPop() {
  if (isAudioMuted) return;
  playTone(800, 0.08, 0.03, 'sine');
}

