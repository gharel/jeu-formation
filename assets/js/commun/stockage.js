/**
 * Seul point d'accès à localStorage. Toutes les clés sont préfixées par « skazy-jeux: ».
 * Les erreurs (navigation privée, quota dépassé, stockage bloqué) ne font jamais planter le jeu.
 */

const PREFIXE = 'skazy-jeux:';

function zone() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function lire(cle, defaut = null) {
  try {
    const brut = zone()?.getItem(PREFIXE + cle);
    return brut === null || brut === undefined ? defaut : JSON.parse(brut);
  } catch {
    return defaut;
  }
}

/** Renvoie true si l'écriture a réussi. */
export function ecrire(cle, valeur) {
  try {
    const z = zone();
    if (!z) return false;
    z.setItem(PREFIXE + cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

export function effacer(cle) {
  try {
    zone()?.removeItem(PREFIXE + cle);
  } catch {
    // rien à faire : le stockage est indisponible
  }
}
