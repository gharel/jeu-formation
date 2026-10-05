/**
 * Habillage sonore des jeux, généré par le navigateur (Web Audio) : aucun fichier audio,
 * aucun droit d'auteur, fonctionne hors ligne. Les sons évoquent l'ambiance des jeux télévisés
 * sans en reproduire les jingles (protégés). Le choix « son activé / coupé » est mémorisé.
 */
import { lire, ecrire } from './stockage.js';

let contexte = null;
let sortie = null;
let bruitBlanc = null;
let indisponible = false;
let actif = lire('son', true) !== false;

export function sonActif() {
  return actif;
}

export function basculerSon() {
  actif = !actif;
  ecrire('son', actif);
  return actif;
}

/**
 * Contexte audio créé à la première utilisation, avec un compresseur pour éviter la saturation.
 * Le créer bloque la page le temps d'ouvrir la sortie audio : quelques dizaines de millisecondes
 * d'habitude, parfois plusieurs secondes (sortie HDMI du vidéoprojecteur, enceinte Bluetooth).
 * D'où preparerSon(), et pas de nouvel essai après un échec.
 */
function audio() {
  if (!actif || indisponible) return null;
  try {
    if (!contexte) {
      const Contexte = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Contexte) {
        indisponible = true;
        return null;
      }
      const nouveau = new Contexte();
      sortie = nouveau.createDynamicsCompressor();
      sortie.connect(nouveau.destination);
      contexte = nouveau;
    }
    if (contexte.state === 'suspended') contexte.resume();
    return contexte;
  } catch {
    if (!contexte) indisponible = true;
    return null;
  }
}

/**
 * Ouvre la sortie audio tout de suite (au lancement d'une partie, de la roue), pour que ce soit
 * fait avant le premier son : sinon, c'est la fanfare de l'écran de réussite qui fige la page.
 * Calcule aussi ce qui ne se calcule qu'une fois (bruit blanc, applaudissements de fin).
 */
export function preparerSon() {
  const ctx = audio();
  if (!ctx) return;
  try {
    bruitBlancDe(ctx);
    tamponApplaudissements(ctx, 2.5);
  } catch {
    // le son est un bonus
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

/** Une seconde de bruit blanc, calculée une fois : la matière des clics et des souffles. */
function bruitBlancDe(ctx) {
  if (!bruitBlanc) {
    bruitBlanc = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const donnees = bruitBlanc.getChannelData(0);
    for (let i = 0; i < donnees.length; i++) donnees[i] = Math.random() * 2 - 1;
  }
  return bruitBlanc;
}

/** Bruit filtré : clics, souffle, grésillement. */
function bruit({ debut = 0, duree = 0.05, volume = 0.1, filtre = 2000, type = 'bandpass' } = {}) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime + debut;
    const source = ctx.createBufferSource();
    source.buffer = bruitBlancDe(ctx);
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

/**
 * Applaudissements : une foule de petits claquements de bruit filtré. Ils sont calculés une fois
 * (par durée) dans un seul tampon, joué d'un coup : créer des dizaines de nœuds audio au même
 * instant (trois par claquement) figeait l'écran un moment sur un PC modeste.
 */
const applaudissementsCalcules = new Map();

function tamponApplaudissements(ctx, duree) {
  if (applaudissementsCalcules.has(duree)) return applaudissementsCalcules.get(duree);
  const taux = ctx.sampleRate;
  const tampon = ctx.createBuffer(1, Math.ceil((duree + 0.05) * taux), taux);
  const donnees = tampon.getChannelData(0);
  const claquements = Math.round(duree * 28);
  for (let i = 0; i < claquements; i++) {
    const debut = Math.random() * duree;
    const volume = 0.03 + 0.07 * Math.sin((debut / duree) * Math.PI);
    const longueur = Math.floor((0.02 + Math.random() * 0.02) * taux);
    // Passe-bande d'un BiquadFilterNode « bandpass » (Q = 1) centré entre 1 200 et 3 000 Hz
    const w0 = (2 * Math.PI * (1200 + Math.random() * 1800)) / taux;
    const alpha = Math.sin(w0) / 2;
    const b0 = alpha / (1 + alpha);
    const a1 = (-2 * Math.cos(w0)) / (1 + alpha);
    const a2 = (1 - alpha) / (1 + alpha);
    // Volume qui s'éteint jusqu'à 0,0001, comme une rampe exponentielle
    const extinction = (0.0001 / volume) ** (1 / longueur);
    let gain = volume;
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    const premier = Math.floor(debut * taux);
    for (let k = 0; k < longueur && premier + k < donnees.length; k++) {
      const x = Math.random() * 2 - 1;
      const y = b0 * (x - x2) - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      donnees[premier + k] += y * gain;
      gain *= extinction;
    }
  }
  applaudissementsCalcules.set(duree, tampon);
  return tampon;
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
  /** Applaudissements : une foule de petits claquements de bruit filtré (voir plus haut). */
  applaudissements(duree = 2.5) {
    const ctx = audio();
    if (!ctx) return;
    try {
      const source = ctx.createBufferSource();
      source.buffer = tamponApplaudissements(ctx, duree);
      source.connect(sortie);
      source.start(ctx.currentTime);
    } catch {
      // le son est un bonus
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

  // ---------- Pyramide : une cloche qui monte à chaque mot d'indice ----------
  pyramide: {
    etage(numero) {
      const notes = [N.mi5, N.fad5, N.sold5, N.la5];
      cloche(notes[Math.min(notes.length - 1, Math.max(0, numero - 1))]);
    },
    /** Trouvé : fanfare d'autant plus longue qu'il y a de points, et la salle applaudit à 4. */
    trouve(points) {
      fanfare(points);
      if (points >= 4) sons.applaudissements(1.8);
    },
    perdu() {
      note(N.sol4, { duree: 0.25, forme: 'triangle', volume: 0.16 });
      note(N.do4, { debut: 0.25, duree: 0.5, forme: 'triangle', volume: 0.16 });
    },
    /** Indice interdit : « eh-eh ». */
    faute: () => rate(),
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

  // ---------- Patate chaude : un tic-tac qui s'emballe ----------
  patate: {
    /** Un tic-tac, d'autant plus aigu et fort que la patate est chaude (`chaleur` de 0 à 1). */
    tic(chaleur = 0) {
      const c = Math.min(1, Math.max(0, chaleur));
      const f = 900 + 900 * c;
      bruit({ duree: 0.02, volume: 0.05 + 0.05 * c, filtre: f * 2, type: 'highpass' });
      note(f, { duree: 0.04, forme: 'square', volume: 0.03 + 0.05 * c });
    },
    /** La patate change de main : un petit « hop » qui monte. */
    passe: () => note(N.do5, { duree: 0.12, vers: N.sol5, forme: 'triangle', volume: 0.16 }),
    /** Brûlé ! Un grésillement et un souffle qui retombe. */
    brule() {
      bruit({ duree: 0.9, volume: 0.2, filtre: 3000, type: 'highpass' });
      bruit({ debut: 0.05, duree: 0.6, volume: 0.25, filtre: 300, type: 'lowpass' });
      note(220, { duree: 0.8, vers: 55, forme: 'sawtooth', volume: 0.14 });
    },
  },

  // ---------- Mémoire vive : les cartes qu'on retourne ----------
  memoire: {
    /** Une carte se retourne : un léger froissement. */
    retourner() {
      bruit({ duree: 0.05, volume: 0.08, filtre: 2600 });
      note(N.mi5, { debut: 0.02, duree: 0.06, volume: 0.05 });
    },
    /** Une paire : deux cloches qui s'accordent. */
    paire() {
      cloche(N.do5, { volume: 0.12, duree: 0.6 });
      cloche(N.sol5, { debut: 0.12, volume: 0.12, duree: 0.7 });
    },
    /** Pas de paire : deux notes douces qui descendent. */
    ratee() {
      note(N.mi4, { duree: 0.14, forme: 'triangle', volume: 0.12 });
      note(N.do4, { debut: 0.14, duree: 0.3, forme: 'triangle', volume: 0.12 });
    },
  },

  // ---------- Bingo : les boules qui roulent ----------
  bingo: {
    /** Les boules roulent, puis une sort. */
    tirage() {
      for (let i = 0; i < 8; i++) {
        bruit({ debut: i * 0.06, duree: 0.03, volume: 0.07, filtre: 1500 + i * 150 });
      }
      note(N.sol5, { debut: 0.5, duree: 0.12, forme: 'triangle', volume: 0.16 });
    },
    revele: () => cloche(N.la5, { volume: 0.14 }),
    ligne: () => fanfare(2),
    bingo() {
      fanfare(3);
      sons.applaudissements(2.5);
    },
  },

  // ---------- Le Coffre-fort : serrures, alarme ----------
  coffre: {
    /** Une serrure s'ouvre : deux cliquetis métalliques et une note claire. */
    serrure() {
      bruit({ duree: 0.03, volume: 0.15, filtre: 4000, type: 'highpass' });
      bruit({ debut: 0.09, duree: 0.03, volume: 0.15, filtre: 3000, type: 'highpass' });
      note(N.mi6, { debut: 0.12, duree: 0.3, forme: 'triangle', volume: 0.08 });
    },
    /** Mauvaise réponse : la serrure résiste, « clonk ». */
    erreur() {
      note(110, { duree: 0.35, forme: 'square', volume: 0.12 });
      bruit({ duree: 0.12, volume: 0.15, filtre: 250, type: 'lowpass' });
    },
    /** Un indice : une petite clochette. */
    indice: () => cloche(N.mi6, { volume: 0.08, duree: 0.5 }),
    /** La porte du coffre s'ouvre : un grondement qui monte, puis la fanfare. */
    ouvert() {
      note(65, { duree: 1.2, vers: 98, forme: 'sawtooth', volume: 0.12 });
      bruit({ duree: 1, volume: 0.1, filtre: 200, type: 'lowpass' });
      fanfare(3, { debut: 0.9 });
    },
    /** Temps écoulé : une alarme à deux tons. */
    alarme() {
      for (let i = 0; i < 4; i++) {
        note(880, { debut: i * 0.3, duree: 0.15, forme: 'square', volume: 0.08 });
        note(660, { debut: i * 0.3 + 0.15, duree: 0.15, forme: 'square', volume: 0.08 });
      }
    },
  },

  // ---------- Top 5 : le tableau des réponses ----------
  top: {
    /** Une réponse trouvée : plus elle rapporte de points (1 à 5), plus la cloche est aiguë. */
    trouvee(points) {
      const notes = [N.do5, N.re5, N.mi5, N.sol5, N.la5];
      const f = notes[Math.min(5, Math.max(1, points)) - 1];
      cloche(f, { volume: 0.16 });
      note(f * 2, { debut: 0.08, duree: 0.2, forme: 'triangle', volume: 0.06 });
    },
    /** Pas dans le top 5 : un buzzer grave. */
    erreur() {
      note(147, { duree: 0.5, forme: 'sawtooth', volume: 0.12 });
      note(139, { duree: 0.5, forme: 'square', volume: 0.07 });
    },
    /** Une réponse restante se dévoile à la fin de la manche. */
    devoile: () => note(N.sol4, { duree: 0.1, forme: 'triangle', volume: 0.1 }),
    /** Les 5 réponses trouvées. */
    complet() {
      fanfare(3);
      sons.applaudissements(2);
    },
  },
};
