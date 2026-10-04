/**
 * Règles de Pyramide, comme à la télévision : on joue par deux. L'un voit le mot et le fait
 * deviner à son partenaire avec des mots d'indice (les « briques »), un seul mot à la fois,
 * 4 au plus. Moins il en faut, plus le binôme marque :
 * trouvé avec 1 mot d'indice = 4 points, 2 mots = 3 points, 3 mots = 2 points, 4 mots = 1 point.
 * Un indice interdit (même famille que le mot, plusieurs mots, un geste) est une faute :
 * le mot est perdu.
 */
import { melanger } from '../../assets/js/commun/hasard.js';

export const INDICES_MAX = 4;

/** Points d'un mot trouvé avec `indices` mots d'indice : 4, 3, 2 ou 1 (0 au-delà). */
export function pointsPourIndices(indices) {
  return indices >= 1 && indices <= INDICES_MAX ? INDICES_MAX + 1 - indices : 0;
}

/**
 * Un mot à faire deviner : caché (le temps que le partenaire tourne le dos à l'écran),
 * puis en jeu (1er mot d'indice, 2e…), puis fini : trouvé, raté (4 indices sans succès) ou faute.
 */
export function creerMot() {
  let phase = 'cache';
  let indice = 0;
  let issue = null;

  return {
    get phase() {
      return phase;
    },
    /** Numéro du mot d'indice en cours (0 tant que le mot est caché). */
    get indice() {
      return indice;
    },
    /** 'trouve', 'rate' ou 'faute' une fois le mot fini. */
    get issue() {
      return issue;
    },
    /** Points en jeu pour le mot d'indice en cours, ou gagnés une fois le mot trouvé. */
    get points() {
      if (phase === 'fini') return issue === 'trouve' ? pointsPourIndices(indice) : 0;
      return pointsPourIndices(indice);
    },

    /** Le mot s'affiche : place au 1er mot d'indice. */
    afficher() {
      if (phase !== 'cache') return false;
      phase = 'jeu';
      indice = 1;
      return true;
    },

    /** Le partenaire a trouvé : renvoie les points gagnés (null si le mot n'est pas en jeu). */
    trouver() {
      if (phase !== 'jeu') return null;
      phase = 'fini';
      issue = 'trouve';
      return pointsPourIndices(indice);
    },

    /**
     * Mauvaise réponse : 'indice-suivant' s'il reste un mot d'indice, sinon 'perdu'
     * (null si le mot n'est pas en jeu).
     */
    rater() {
      if (phase !== 'jeu') return null;
      if (indice < INDICES_MAX) {
        indice += 1;
        return 'indice-suivant';
      }
      phase = 'fini';
      issue = 'rate';
      return 'perdu';
    },

    /** Indice interdit : le mot est perdu. */
    faute() {
      if (phase !== 'jeu') return false;
      phase = 'fini';
      issue = 'faute';
      return true;
    },
  };
}

/** Rôles pour le n-ième mot (0, 1, 2…) d'un binôme : ils s'inversent à chaque mot. */
export function roles(binome, n) {
  const [a, b] = binome;
  return n % 2 === 0 ? { maitre: a, devineur: b } : { maitre: b, devineur: a };
}

/**
 * Tire un binôme au sort, en commençant par ceux qui n'ont pas encore joué (`dejaJoue` :
 * Set de prénoms), pour que chacun passe à son tour. Null s'il y a moins de 2 participants.
 */
export function tirerBinome(participants, dejaJoue = new Set(), hasard = Math.random) {
  if (participants.length < 2) return null;
  const ordre = [
    ...melanger(
      participants.filter((p) => !dejaJoue.has(p)),
      hasard,
    ),
    ...melanger(
      participants.filter((p) => dejaJoue.has(p)),
      hasard,
    ),
  ];
  return [ordre[0], ordre[1]];
}
