/**
 * Règles de Patate chaude (d'après Tic Tac Boum) : une consigne (« Citez une fonction d'Excel »)
 * et une patate qui chauffe pendant une durée cachée, tirée au hasard selon la mèche choisie.
 * On donne une réponse valable et pas encore dite, puis on passe la patate à son voisin. Quand
 * elle brûle, la personne qui la tient ne marque pas : tous les autres joueurs gagnent 1 point.
 */
import { entierEntre } from '../../assets/js/commun/hasard.js';

/** Durées possibles de la mèche, en secondes. */
export const MECHES = {
  courte: { libelle: 'Courte (10 à 25 secondes)', min: 10, max: 25 },
  moyenne: { libelle: 'Moyenne (20 à 45 secondes)', min: 20, max: 45 },
  longue: { libelle: 'Longue (30 à 60 secondes)', min: 30, max: 60 },
};

export const OPTIONS_MECHE = Object.entries(MECHES).map(([valeur, { libelle }]) => ({
  valeur,
  libelle,
}));

export function meche(valeur) {
  return MECHES[valeur] ?? MECHES.moyenne;
}

/** Durée cachée d'une manche, en millisecondes, au dixième de seconde près. */
export function tirerDuree(valeur, hasard = Math.random) {
  const { min, max } = meche(valeur);
  return entierEntre(min * 10, max * 10, hasard) * 100;
}

/**
 * Chaleur de la patate, de 0 (froide) à 1 (brûlante). Elle se mesure sur la mèche la plus longue
 * possible : la patate peut brûler avant d'être rouge, sinon on devinerait le moment.
 */
export function chaleur(ecouleMs, valeur) {
  const { max } = meche(valeur);
  return Math.min(1, Math.max(0, ecouleMs / (max * 1000)));
}

/** Niveau affiché, de 1 (tiède) à 4 (brûlante). */
export function niveauDeChaleur(valeurChaleur) {
  return Math.min(4, 1 + Math.floor(valeurChaleur * 4));
}

/** Écart entre deux tic-tac, en millisecondes : il raccourcit à mesure que la patate chauffe. */
export function intervalleTic(valeurChaleur) {
  return Math.round(700 - 500 * Math.min(1, Math.max(0, valeurChaleur)));
}

/** Qui lance la patate : la personne qui s'est brûlée, sinon quelqu'un au hasard. */
export function premierPorteur(participants, dernierBrule = null, hasard = Math.random) {
  if (!participants.length) return null;
  if (dernierBrule && participants.includes(dernierBrule)) return dernierBrule;
  return participants[Math.floor(hasard() * participants.length)];
}

/** Ceux qui marquent quand la patate brûle : tous les joueurs, sauf la personne brûlée. */
export function gagnantsDeLaManche(participants, brule) {
  if (!brule) return [];
  return participants.filter((p) => p !== brule);
}

/**
 * Une manche : prête (la consigne s'affiche), en cours (la patate chauffe), en pause, puis
 * brûlée. `passer()` compte une réponse valable : la patate change de main.
 */
export function creerManche() {
  let phase = 'prete';
  let passes = 0;
  const changer = (de, vers) => {
    if (phase !== de) return false;
    phase = vers;
    return true;
  };
  return {
    get phase() {
      return phase;
    },
    get passes() {
      return passes;
    },
    lancer: () => changer('prete', 'en-cours'),
    pause: () => changer('en-cours', 'pause'),
    reprendre: () => changer('pause', 'en-cours'),
    bruler: () => changer('en-cours', 'brulee'),
    passer() {
      if (phase !== 'en-cours') return false;
      passes += 1;
      return true;
    },
  };
}
