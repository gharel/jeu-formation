/**
 * Petits sons générés par le navigateur (Web Audio), sans fichier audio.
 * Le choix « son activé / coupé » est mémorisé.
 */
import { lire, ecrire } from './stockage.js';

let contexte = null;
let actif = lire('son', true) !== false;

export function sonActif() {
  return actif;
}

export function basculerSon() {
  actif = !actif;
  ecrire('son', actif);
  return actif;
}

function audio() {
  try {
    if (!contexte) {
      const Contexte = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Contexte) return null;
      contexte = new Contexte();
    }
    if (contexte.state === 'suspended') contexte.resume();
    return contexte;
  } catch {
    return null;
  }
}

function note(frequence, { debut = 0, duree = 0.15, forme = 'sine', volume = 0.18 } = {}) {
  if (!actif) return;
  const ctx = audio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime + debut;
    const oscillateur = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillateur.type = forme;
    oscillateur.frequency.setValueAtTime(frequence, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    oscillateur.connect(gain).connect(ctx.destination);
    oscillateur.start(t);
    oscillateur.stop(t + duree + 0.02);
  } catch {
    // le son est un bonus : on ignore les erreurs
  }
}

export const sons = {
  tic: () => note(880, { duree: 0.06, volume: 0.08 }),
  succes: () => {
    note(523, { duree: 0.12 });
    note(659, { debut: 0.1, duree: 0.12 });
    note(784, { debut: 0.2, duree: 0.25 });
  },
  erreur: () => note(196, { duree: 0.3, forme: 'triangle', volume: 0.2 }),
  fin: () => {
    note(660, { duree: 0.15, forme: 'square', volume: 0.08 });
    note(520, { debut: 0.18, duree: 0.15, forme: 'square', volume: 0.08 });
    note(390, { debut: 0.36, duree: 0.4, forme: 'square', volume: 0.08 });
  },
  buzz: () => note(150, { duree: 0.45, forme: 'sawtooth', volume: 0.12 }),
  ding: () => {
    note(988, { duree: 0.4, volume: 0.15 });
    note(1319, { debut: 0.08, duree: 0.5, volume: 0.1 });
  },
};
