/**
 * Règles du Bingo : chacun recopie sur papier une grille de 3 × 3 (ou 4 × 4) mots choisis dans
 * la liste du thème. Le jeu tire les mots un par un, sans remise. Si le mot a une définition, on
 * lit d'abord la définition et l'on cherche le mot ; sinon le mot est annoncé tout de suite.
 * Une ligne complète (horizontale, verticale ou en diagonale) : « Ligne ! », 1 point. On joue
 * ensuite la grille pleine : « Bingo ! », 3 points, et la partie s'arrête.
 */
import { melanger } from '../../assets/js/commun/hasard.js';

/** Côtés de grille possibles : 3 × 3 ou 4 × 4. */
export const COTES = [3, 4];
export const POINTS = { ligne: 1, bingo: 3 };

/** Mots nécessaires pour une grille : 3 de plus que de cases, pour que les grilles diffèrent. */
export function motsNecessaires(cote) {
  return cote * cote + 3;
}

export const MOTS_MIN = motsNecessaires(COTES[0]);

/** Grilles possibles avec `nombreDeMots` mots préparés. */
export function cotesPossibles(nombreDeMots) {
  return COTES.filter((cote) => nombreDeMots >= motsNecessaires(cote));
}

/** Mots dans l'ordre alphabétique : la liste à recopier, ou les mots tirés pour vérifier. */
export function trierMots(mots) {
  return [...mots].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

/** Une annonce n'est possible qu'avec assez de mots tirés pour remplir une ligne, ou la grille. */
export function annoncePossible(annonce, nombreTires, cote) {
  return nombreTires >= (annonce === 'bingo' ? cote * cote : cote);
}

/**
 * Une partie : l'ordre de tirage est fixé au départ. On joue d'abord la ligne, puis la grille
 * pleine. `tirer()` sort l'index du mot suivant, `valider()` enregistre une annonce juste.
 */
export function creerPartie(nombreDeMots, hasard = Math.random) {
  const ordre = melanger(
    Array.from({ length: nombreDeMots }, (_, i) => i),
    hasard,
  );
  let tires = 0;
  let objectif = 'ligne';
  return {
    /** Ce qu'on joue : 'ligne', puis 'bingo', puis 'fini'. */
    get objectif() {
      return objectif;
    },
    /** Index des mots tirés, dans l'ordre du tirage. */
    get tires() {
      return ordre.slice(0, tires);
    },
    get dernier() {
      return tires ? ordre[tires - 1] : null;
    },
    get restants() {
      return nombreDeMots - tires;
    },
    tirer() {
      if (objectif === 'fini' || tires >= ordre.length) return null;
      tires += 1;
      return ordre[tires - 1];
    },
    /** Annonce jugée juste (« ligne » ou « bingo ») : on passe à l'objectif suivant. */
    valider(annonce) {
      if (annonce !== objectif) return false;
      objectif = annonce === 'ligne' ? 'bingo' : 'fini';
      return true;
    },
  };
}
