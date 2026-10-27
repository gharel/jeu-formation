/**
 * Règles de Pyramide, comme à la télévision : on joue par deux. L'un voit le mot et le fait
 * deviner à son partenaire avec des mots d'indice (les « briques »), un seul mot à la fois,
 * 4 au plus. Moins il en faut, plus le binôme marque :
 * trouvé avec 1 mot d'indice = 4 points, 2 mots = 3 points, 3 mots = 2 points, 4 mots = 1 point.
 * Un indice interdit (même famille que le mot, plusieurs mots, un geste) est une faute :
 * le mot est perdu.
 * Le mot peut se recacher en cours de jeu (la personne qui devine se retourne, ou le public ne doit
 * plus le voir) : les indices et les points ne bougent pas, et on ne peut ni valider ni rater un
 * mot caché.
 */
import { planBinomes, planBinomesParEquipe } from '../../assets/js/commun/passages.js';

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
  // Mot recaché en cours de jeu (la phase reste 'jeu' : l'indice et les étages ne changent pas)
  let masque = false;

  return {
    get phase() {
      return phase;
    },
    /** Numéro du mot d'indice en cours (0 tant que le mot est caché). */
    get indice() {
      return indice;
    },
    /** Le mot est-il recaché en cours de jeu ? */
    get masque() {
      return masque;
    },
    /** 'trouve', 'rate', 'faute' ou 'temps' une fois le mot fini. */
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

    /** Recache le mot en cours de jeu, sans rien changer d'autre. */
    cacher() {
      if (phase !== 'jeu' || masque) return false;
      masque = true;
      return true;
    },

    /** Réaffiche un mot recaché : même mot d'indice, mêmes points. */
    reafficher() {
      if (phase !== 'jeu' || !masque) return false;
      masque = false;
      return true;
    },

    /** Le partenaire a trouvé : renvoie les points gagnés (null si le mot n'est pas en jeu). */
    trouver() {
      if (phase !== 'jeu' || masque) return null;
      phase = 'fini';
      issue = 'trouve';
      return pointsPourIndices(indice);
    },

    /**
     * Mauvaise réponse : 'indice-suivant' s'il reste un mot d'indice, sinon 'perdu'
     * (null si le mot n'est pas en jeu).
     */
    rater() {
      if (phase !== 'jeu' || masque) return null;
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
      if (phase !== 'jeu' || masque) return false;
      phase = 'fini';
      issue = 'faute';
      return true;
    },

    /** Temps écoulé, l'animateur passe : le mot est perdu (même recaché). */
    abandonner() {
      if (phase !== 'jeu') return false;
      masque = false;
      phase = 'fini';
      issue = 'temps';
      return true;
    },
  };
}

/** Rôles pour le n-ième mot (0, 1, 2…) d'un binôme : ils s'inversent à chaque mot. */
export function roles(binome, n) {
  const [a, b] = binome;
  return n % 2 === 0 ? { maitre: a, devineur: b } : { maitre: b, devineur: a };
}

/** Nombre de binômes pour `mots` mots, `parBinome` mots chacun (le dernier peut en avoir moins). */
export function nombreDeBinomes(mots, parBinome) {
  return Math.ceil(mots / Math.max(1, parBinome));
}

/**
 * Plan des binômes de la partie : [{ equipe, binome }] (`equipe` null chacun pour soi), pour que
 * chacun passe autant de fois (voir passages.js). Par équipes, les équipes d'au moins deux joueurs
 * jouent chacune leur tour, avec chacune son plan ; sans elles, tous les participants jouent.
 * Vide avec moins de deux participants.
 */
export function planDeLaPartie({ participants, equipes = [], mots, motsParBinome, hasard }) {
  const nombre = nombreDeBinomes(mots, motsParBinome);
  if (participants.length < 2 || nombre < 1) return [];
  if (equipes.some((e) => e.membres.length >= 2)) {
    return planBinomesParEquipe(equipes, nombre, hasard);
  }
  return planBinomes(participants, nombre, hasard).map((binome) => ({ equipe: null, binome }));
}
