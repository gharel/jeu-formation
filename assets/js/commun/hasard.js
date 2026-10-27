/**
 * Hasard reproductible : avec ?graine=42 dans l'URL, les tirages sont toujours les mêmes
 * (utile pour les tests). Sinon, Math.random.
 */

/** Générateur pseudo-aléatoire mulberry32 : renvoie une fonction () => nombre dans [0, 1[. */
export function creerHasard(graine) {
  let etat = graine >>> 0;
  return function hasard() {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hasard de la page : graine lue dans ?graine= si elle existe. */
export function hasardDePage(recherche = globalThis.location?.search ?? '') {
  const graine = new URLSearchParams(recherche).get('graine');
  if (graine !== null && /^\d+$/.test(graine)) {
    const hasard = creerHasard(Number(graine));
    hasard.graine = Number(graine);
    return hasard;
  }
  return Math.random;
}

/**
 * Un second flux de hasard, indépendant de celui de la page : tirer les éléments d'une partie ne
 * change pas la suite des autres tirages (avec ?graine=N, chaque `cle` rend toujours la même suite).
 * Sans graine, c'est le hasard de la page.
 */
export function hasardAnnexe(hasard, cle = 0) {
  return typeof hasard.graine === 'number'
    ? creerHasard(hasard.graine * 7919 + Math.floor(cle) * 104729 + 1)
    : hasard;
}

/** Entier dans [min, max] (bornes incluses). */
export function entierEntre(min, max, hasard = Math.random) {
  return min + Math.floor(hasard() * (max - min + 1));
}

/** Copie mélangée du tableau (Fisher-Yates). */
export function melanger(tableau, hasard = Math.random) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
