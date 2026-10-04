/**
 * Règles du Top 5 (d'après Une famille en or) : une question (« Citez un réseau social ») et
 * 5 réponses cachées, de la plus attendue (5 points) à la moins attendue (1 point). Le groupe
 * propose, l'animateur tape : une réponse trouvée se retourne, une proposition absente est une
 * erreur. Au bout de 3 erreurs (réglable), la manche s'arrête et le reste se dévoile.
 * Pas de sondage : c'est l'animateur qui classe les réponses en préparant le jeu.
 */
import {
  normaliserReponse,
  reponseAffichee,
  trouverReponse,
} from '../../assets/js/commun/reponses.js';

export const NOMBRE_REPONSES = 5;

/** Points de la réponse de rang `rang` (0 = la plus attendue) : 5, 4, 3, 2, 1. */
export function pointsDuRang(rang) {
  return NOMBRE_REPONSES - rang;
}

/** Points de toute une question : 5 + 4 + 3 + 2 + 1. */
export const POINTS_PAR_QUESTION = Array.from({ length: NOMBRE_REPONSES }, (_, i) =>
  pointsDuRang(i),
).reduce((a, b) => a + b, 0);

export { reponseAffichee };

/** Vérifie une question préparée : un message, ou null si elle convient. */
export function validerQuestion({ reponses = [] } = {}) {
  const propres = reponses.map(normaliserReponse).filter(Boolean);
  if (new Set(propres).size < propres.length) return 'deux réponses sont identiques.';
  return null;
}

/**
 * Une manche. `proposer(texte)` renvoie { resultat, rang } avec resultat : 'trouvee', 'deja'
 * (déjà retournée), 'erreur' ou 'vide' ; null si la manche est finie.
 */
export function creerManche(reponses, { erreursMax = 3 } = {}) {
  const trouvees = new Set();
  let erreurs = 0;
  let issue = null;

  function trouver(rang) {
    trouvees.add(rang);
    if (trouvees.size === reponses.length) issue = 'complet';
    return { resultat: 'trouvee', rang };
  }

  function erreur() {
    erreurs += 1;
    if (erreurs >= erreursMax) issue = 'erreurs';
    return { resultat: 'erreur', rang: -1 };
  }

  return {
    get erreurs() {
      return erreurs;
    },
    get erreursMax() {
      return erreursMax;
    },
    get finie() {
      return issue !== null;
    },
    /** 'complet' (tout trouvé), 'erreurs' (trop d'erreurs), 'abandon', ou null en cours. */
    get issue() {
      return issue;
    },
    /** Points des réponses trouvées. */
    get points() {
      return [...trouvees].reduce((total, rang) => total + pointsDuRang(rang), 0);
    },
    estTrouvee(rang) {
      return trouvees.has(rang);
    },
    proposer(texte) {
      if (issue) return null;
      if (!normaliserReponse(texte)) return { resultat: 'vide', rang: -1 };
      const rang = trouverReponse(texte, reponses);
      if (rang === -1) return erreur();
      if (trouvees.has(rang)) return { resultat: 'deja', rang };
      return trouver(rang);
    },
    /** L'animateur retourne une case à la main : la réponse a été dite autrement. */
    reveler(rang) {
      if (issue || trouvees.has(rang) || rang < 0 || rang >= reponses.length) return null;
      return trouver(rang);
    },
    /** Une proposition fausse, dite à l'oral, sans la taper. */
    compterErreur() {
      if (issue) return null;
      return erreur();
    },
    /** On arrête là : les réponses restantes se dévoilent. */
    abandonner() {
      if (issue) return false;
      issue = 'abandon';
      return true;
    },
  };
}
