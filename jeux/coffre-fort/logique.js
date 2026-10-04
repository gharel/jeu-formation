/**
 * Règles du Coffre-fort (d'après les escape games en boîte et Fort Boyard) : un coffre à
 * plusieurs serrures et un compte à rebours. Chaque serrure est une énigme que le groupe résout
 * ensemble ; l'animateur tape la réponse. Bonne réponse : la serrure s'ouvre. Mauvaise réponse :
 * le chrono perd des secondes. Un indice coûte du temps, lui aussi. Toutes les serrures ouvertes
 * avant la fin : le coffre s'ouvre, et le temps restant devient le record à battre.
 */
import { estBonneReponse } from '../../assets/js/commun/reponses.js';

export const SERRURES_MIN = 3;
export const SERRURES_MAX = 8;

/** La réponse tapée ouvre-t-elle la serrure ? Variantes séparées par « / », fautes pardonnées. */
export function ouvre(saisie, reponse) {
  return estBonneReponse(saisie, reponse);
}

/**
 * Le coffre : serrures ouvertes, erreurs, indices payés et temps perdu (ms). Le compte à rebours
 * lui-même est dans la page : on lui retire `penaliteMs` à chaque erreur, `coutIndiceMs` par indice.
 */
export function creerCoffre({ nombre, penaliteMs = 30000, coutIndiceMs = 60000 }) {
  let ouvertes = 0;
  let erreurs = 0;
  let tempsPerdu = 0;
  const indices = new Set();
  // Serrure de la dernière erreur, tant que l'animateur peut encore la juger bonne
  let derniereErreur = null;

  function ouvrir() {
    ouvertes += 1;
    derniereErreur = null;
    return ouvertes === nombre ? 'coffre-ouvert' : 'ouverte';
  }

  return {
    get nombre() {
      return nombre;
    },
    /** Serrures ouvertes, c'est aussi l'index de la serrure en cours. */
    get ouvertes() {
      return ouvertes;
    },
    get erreurs() {
      return erreurs;
    },
    get tempsPerdu() {
      return tempsPerdu;
    },
    get ouvert() {
      return ouvertes >= nombre;
    },
    /** Une réponse jugée : 'ouverte', 'coffre-ouvert', 'erreur' (ou null, coffre déjà ouvert). */
    essayer(juste) {
      if (ouvertes >= nombre) return null;
      if (juste) return ouvrir();
      erreurs += 1;
      tempsPerdu += penaliteMs;
      derniereErreur = ouvertes;
      return 'erreur';
    },
    /**
     * L'animateur juge bonne la réponse refusée (dite autrement) : le temps perdu est rendu et la
     * serrure s'ouvre. Renvoie { rendu, issue }, ou null s'il n'y a rien à annuler.
     */
    accepterQuandMeme() {
      if (derniereErreur === null || derniereErreur !== ouvertes) return null;
      erreurs -= 1;
      tempsPerdu -= penaliteMs;
      return { rendu: penaliteMs, issue: ouvrir() };
    },
    /** Indice de la serrure en cours, payé une seule fois : son prix, 0 s'il est déjà payé. */
    acheterIndice() {
      if (ouvertes >= nombre) return null;
      if (indices.has(ouvertes)) return 0;
      indices.add(ouvertes);
      tempsPerdu += coutIndiceMs;
      derniereErreur = null;
      return coutIndiceMs;
    },
    indicePaye(serrure = ouvertes) {
      return indices.has(serrure);
    },
  };
}

/** Clé du record : un coffre du même nombre de serrures, avec le même temps au départ. */
export function cleRecord(nombre, dureeMinutes) {
  return `coffre-fort:record:${nombre}-${dureeMinutes}`;
}

/** Nouveau record si le coffre s'ouvre avec plus de temps restant que le précédent record. */
export function estNouveauRecord(ancienMs, restantMs) {
  return typeof ancienMs !== 'number' || restantMs > ancienMs;
}
