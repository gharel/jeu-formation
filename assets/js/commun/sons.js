/**
 * Habillage sonore des jeux, généré par le navigateur (Web Audio) : aucun fichier audio,
 * aucun droit d'auteur, fonctionne hors ligne. Les sons évoquent l'ambiance des jeux télévisés
 * sans en reproduire les jingles (protégés). Le choix « son activé / coupé » est mémorisé.
 */
import { lire, ecrire } from './stockage.js';

let contexte = null;
let sortie = null;
let bruitBlanc = null;
let actif = lire('son', true) !== false;

export function sonActif() {
  return actif;
}

export function basculerSon() {
  actif = !actif;
  ecrire('son', actif);
  return actif;
}

/** Contexte audio créé à la première utilisation, avec un compresseur pour éviter la saturation. */
function audio() {
  if (!actif) return null;
  try {
    if (!contexte) {
      const Contexte = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Contexte) return null;
      contexte = new Contexte();
      sortie = contexte.createDynamicsCompressor();
      sortie.connect(contexte.destination);
    }
    if (contexte.state === 'suspended') contexte.resume();
    return contexte;
  } catch {
    return null;
  }
}

/**
 * Une note. `vers` : fréquence d'arrivée pour un glissando ; `harmonique` : seconde
 * fréquence superposée (pour les sons de cloche).
 */
function note(
  frequence,
  { debut = 0, duree = 0.15, forme = 'sine', volume = 0.18, vers = null, attaque = 0.01 } = {},
) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime + debut;
    const oscillateur = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillateur.type = forme;
    oscillateur.frequency.setValueAtTime(frequence, t);
    if (vers) oscillateur.frequency.exponentialRampToValueAtTime(vers, t + duree);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + attaque);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    oscillateur.connect(gain).connect(sortie);
    oscillateur.start(t);
    oscillateur.stop(t + duree + 0.05);
  } catch {
    // le son est un bonus : on ignore les erreurs
  }
}

/** Bruit filtré : clics, souffle, applaudissements. */
function bruit({ debut = 0, duree = 0.05, volume = 0.1, filtre = 2000, type = 'bandpass' } = {}) {
  const ctx = audio();
  if (!ctx) return;
  try {
    if (!bruitBlanc) {
      bruitBlanc = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const donnees = bruitBlanc.getChannelData(0);
      for (let i = 0; i < donnees.length; i++) donnees[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + debut;
    const source = ctx.createBufferSource();
    source.buffer = bruitBlanc;
    const passe = ctx.createBiquadFilter();
    passe.type = type;
    passe.frequency.setValueAtTime(filtre, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    source.connect(passe).connect(gain).connect(sortie);
    source.start(t);
    source.stop(t + duree + 0.02);
  } catch {
    // le son est un bonus
  }
}

/** Fréquences des notes utilisées (Hz). */
const N = {
  do4: 261.63,
  mi4: 329.63,
  sol4: 392,
  la4: 440,
  do5: 523.25,
  re5: 587.33,
  mi5: 659.25,
  fad5: 739.99,
  sol5: 783.99,
  sold5: 830.61,
  la5: 880,
  do6: 1046.5,
  mi6: 1318.5,
};

/** Fanfare de victoire : 1 (courte), 2 ou 3 (longue, avec accord final). */
function fanfare(taille = 3, { debut = 0 } = {}) {
  const montees = {
    1: [N.do5, N.sol5],
    2: [N.do5, N.mi5, N.sol5],
    3: [N.sol4, N.do5, N.mi5, N.sol5],
  };
  const notes = montees[Math.min(3, Math.max(1, taille))];
  notes.forEach((f, i) =>
    note(f, { debut: debut + i * 0.09, duree: 0.14, forme: 'triangle', volume: 0.2 }),
  );
  const fin = debut + notes.length * 0.09;
  const accord = taille >= 3 ? [N.do5, N.mi5, N.sol5, N.do6] : [N.do5, N.sol5];
  for (const f of accord)
    note(f, { debut: fin, duree: taille >= 3 ? 0.9 : 0.5, forme: 'triangle', volume: 0.12 });
}

/** Cloche : fondamentale + partiel inharmonique, longue résonance. */
function cloche(frequence, { debut = 0, volume = 0.16, duree = 0.9 } = {}) {
  note(frequence, { debut, duree, volume, attaque: 0.005 });
  note(frequence * 2.76, { debut, duree: duree * 0.5, volume: volume * 0.35, attaque: 0.005 });
}

/** « Eh-eh » : deux notes descendantes de mauvaise réponse. */
function rate({ debut = 0 } = {}) {
  note(311, { debut, duree: 0.18, forme: 'square', volume: 0.15 });
  note(233, { debut: debut + 0.2, duree: 0.32, forme: 'square', volume: 0.15 });
}

export const sons = {
  // ---------- Sons communs ----------
  tic: () => note(880, { duree: 0.06, volume: 0.08 }),
  succes: () => fanfare(2),
  erreur: () => note(196, { duree: 0.3, forme: 'triangle', volume: 0.2 }),
  fin: () => {
    note(660, { duree: 0.15, forme: 'square', volume: 0.08 });
    note(520, { debut: 0.18, duree: 0.15, forme: 'square', volume: 0.08 });
    note(390, { debut: 0.36, duree: 0.4, forme: 'square', volume: 0.08 });
  },
  buzz: () => note(150, { duree: 0.45, forme: 'sawtooth', volume: 0.12 }),
  ding: () => cloche(N.la5, { volume: 0.14 }),
  fanfare,
  /** Clic de la roue quand un segment passe sous le pointeur. */
  roueClic: () => bruit({ duree: 0.015, volume: 0.08, filtre: 3500, type: 'highpass' }),
  /** Applaudissements : une foule de petits claquements de bruit filtré. */
  applaudissements(duree = 2.5) {
    const claquements = Math.round(duree * 28);
    for (let i = 0; i < claquements; i++) {
      const t = Math.random() * duree;
      const intensite = Math.sin((t / duree) * Math.PI);
      bruit({
        debut: t,
        duree: 0.02 + Math.random() * 0.02,
        volume: 0.03 + 0.07 * intensite,
        filtre: 1200 + Math.random() * 1800,
      });
    }
  },

  // ---------- Motus : une note par lettre révélée ----------
  motus: {
    /** `evaluation` : ['bien', 'mal', 'absent', …] ; `ecart` : délai entre deux lettres (s). */
    lettres(evaluation, { ecart = 0.12 } = {}) {
      evaluation.forEach((etat, i) => {
        const debut = i * ecart;
        if (etat === 'bien') {
          note(N.la5, { debut, duree: 0.16, forme: 'triangle', volume: 0.18 });
          note(N.mi6, { debut, duree: 0.08, volume: 0.05 });
        } else if (etat === 'mal') {
          note(N.re5, { debut, duree: 0.14, volume: 0.15 });
        } else {
          note(196, { debut, duree: 0.07, volume: 0.07 });
        }
      });
    },
    trouve({ debut = 0 } = {}) {
      [N.do5, N.mi5, N.sol5, N.do6].forEach((f, i) =>
        note(f, { debut: debut + i * 0.07, duree: 0.12, forme: 'square', volume: 0.07 }),
      );
      for (const f of [N.do5, N.mi5, N.sol5, N.do6]) {
        note(f, { debut: debut + 0.3, duree: 0.9, forme: 'triangle', volume: 0.11 });
      }
    },
    /** Après 6 échecs : un « boum » grave. */
    perdu({ debut = 0 } = {}) {
      note(110, { debut, duree: 0.7, vers: 45, volume: 0.35 });
      bruit({ debut, duree: 0.25, volume: 0.15, filtre: 180, type: 'lowpass' });
    },
  },

  // ---------- Pyramide : une cloche qui monte à chaque étage ----------
  pyramide: {
    etage(numero) {
      cloche([N.mi5, N.fad5, N.sold5][Math.min(2, Math.max(0, numero - 1))] ?? N.mi5);
    },
    trouve: (points) => fanfare(points),
    perdu() {
      note(N.sol4, { duree: 0.25, forme: 'triangle', volume: 0.16 });
      note(N.do4, { debut: 0.25, duree: 0.5, forme: 'triangle', volume: 0.16 });
    },
  },

  // ---------- Chiffres 5 4 3 2 1 (Qui suis-je ?, Zoom mystère) ----------
  paliers: {
    /** Un chiffre s'éteint : plus il est petit, plus le son est grave. */
    chiffre(valeur) {
      const f = 300 + valeur * 110;
      note(f, { duree: 0.16, vers: f * 0.8, forme: 'square', volume: 0.13 });
    },
    /** Tic-tac discret pendant que le temps file. */
    tictac(pair) {
      bruit({ duree: 0.015, volume: 0.05, filtre: pair ? 3200 : 2200, type: 'highpass' });
    },
    /** « Stop ! » : un gong. */
    stop() {
      note(98, { duree: 2, volume: 0.25, attaque: 0.005 });
      note(147, { duree: 1.6, volume: 0.12, attaque: 0.005 });
      note(233, { duree: 1, volume: 0.06, attaque: 0.005 });
      bruit({ duree: 0.08, volume: 0.08, filtre: 400, type: 'lowpass' });
    },
    bonne: (points) => fanfare(points >= 4 ? 3 : points >= 2 ? 2 : 1),
    mauvaise: () => rate(),
  },

  // ---------- Duel buzzer : un buzzer différent de chaque côté ----------
  duel: {
    buzz(cote) {
      if (cote === 'gauche') {
        note(196, { duree: 0.45, forme: 'square', volume: 0.1 });
        note(98, { duree: 0.45, forme: 'square', volume: 0.08 });
      } else {
        note(392, { duree: 0.45, forme: 'sawtooth', volume: 0.09 });
        note(587, { duree: 0.45, forme: 'sawtooth', volume: 0.05 });
      }
    },
    bonne: () => fanfare(1),
    mauvaise: () => rate(),
    victoire() {
      fanfare(3);
      sons.applaudissements(1.8);
    },
  },

  // ---------- Le Juste Chiffre : ça monte ou ça descend ----------
  juste: {
    plus: () => note(330, { duree: 0.28, vers: 660, forme: 'triangle', volume: 0.16 }),
    moins: () => note(660, { duree: 0.28, vers: 330, forme: 'triangle', volume: 0.16 }),
    juste: () => fanfare(3),
  },

  // ---------- Batterie faible ----------
  batterie: {
    /** Bonne lettre : un « pling » par lettre découverte. */
    lettre(occurrences = 1) {
      for (let i = 0; i < Math.min(occurrences, 4); i++) {
        note(N.sol5 * (1 + i * 0.125), {
          debut: i * 0.08,
          duree: 0.12,
          forme: 'triangle',
          volume: 0.14,
        });
      }
    },
    /** Un cran perdu : petite décharge. */
    cran: () => note(520, { duree: 0.25, vers: 180, forme: 'square', volume: 0.08 }),
    /** Batterie à plat : extinction. */
    aPlat() {
      note(300, { duree: 1, vers: 40, forme: 'sawtooth', volume: 0.12 });
      bruit({ debut: 1, duree: 0.03, volume: 0.15, filtre: 2500 });
    },
  },

  // ---------- Debout ou assis ? ----------
  verite: {
    vrai() {
      note(N.do5, { duree: 0.14, forme: 'triangle', volume: 0.18 });
      note(N.sol5, { debut: 0.13, duree: 0.4, forme: 'triangle', volume: 0.18 });
    },
    faux() {
      note(N.mi4, { duree: 0.16, forme: 'square', volume: 0.08 });
      note(N.do4, { debut: 0.16, duree: 0.4, forme: 'square', volume: 0.08 });
    },
  },

  // ---------- Le Bon Ordre ----------
  ordre: {
    carte: () => note(600, { duree: 0.06, vers: 900, volume: 0.1 }),
    /** Une note montante par étape bien placée, puis fanfare (tout juste) ou « eh-eh ». */
    verification(justes, total) {
      const gamme = [N.do5, N.re5, N.mi5, N.sol5, N.la5, N.do6, N.mi6];
      for (let i = 0; i < justes; i++) {
        note(gamme[i % gamme.length], {
          debut: i * 0.11,
          duree: 0.14,
          forme: 'triangle',
          volume: 0.14,
        });
      }
      if (justes >= total) fanfare(3, { debut: justes * 0.11 + 0.05 });
      else rate({ debut: justes * 0.11 + 0.05 });
    },
  },
};
