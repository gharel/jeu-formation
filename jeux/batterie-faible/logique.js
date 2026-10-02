/**
 * Règles de Batterie faible : on propose des lettres pour découvrir un mot caché.
 * Chaque mauvaise lettre vide un cran de la batterie ; batterie à plat = mot révélé.
 */

export const LETTRES_MIN = 3;

/** « é » → « E », « ç » → « C ». */
export function sansAccent(lettre) {
  return String(lettre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Découpe le mot en cases : les lettres sont à deviner, le reste (espaces, tirets,
 * apostrophes, chiffres) reste visible. « Œ » devient « OE » pour se jouer en deux lettres.
 */
export function decouper(texte) {
  const propre = String(texte ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE');
  return [...propre].map((c) =>
    /\p{L}/u.test(c)
      ? { lettre: sansAccent(c), affichage: c.toUpperCase() }
      : { lettre: null, affichage: c },
  );
}

/** Vérifie un mot préparé par l'animateur (message ou null). */
export function validerMot(texte) {
  if (!String(texte ?? '').trim()) return null;
  if (/[^\p{L}\s'’\-0-9]/u.test(texte)) {
    return 'utilisez seulement des lettres, des espaces, des tirets ou des apostrophes.';
  }
  const lettres = decouper(texte).filter((c) => c.lettre).length;
  if (lettres < LETTRES_MIN) return `il faut au moins ${LETTRES_MIN} lettres.`;
  return null;
}

export function etatInitial() {
  return { proposees: [], erreurs: 0 };
}

/**
 * Joue une lettre. Renvoie { etat, resultat, occurrences } avec resultat :
 * 'bonne', 'mauvaise', 'deja' (déjà proposée) ou 'invalide'.
 */
export function jouerLettre(cases, etat, saisie) {
  const lettre = sansAccent(saisie)
    .replace(/[^A-Z]/g, '')
    .slice(0, 1);
  if (!lettre) return { etat, resultat: 'invalide', occurrences: 0 };
  if (etat.proposees.includes(lettre)) return { etat, resultat: 'deja', occurrences: 0, lettre };
  const occurrences = cases.filter((c) => c.lettre === lettre).length;
  return {
    etat: {
      proposees: [...etat.proposees, lettre],
      erreurs: etat.erreurs + (occurrences ? 0 : 1),
    },
    resultat: occurrences ? 'bonne' : 'mauvaise',
    occurrences,
    lettre,
  };
}

/** Un participant propose le mot entier : juste, ou une erreur de plus. */
export function proposerMot(cases, etat, proposition) {
  const attendu = cases
    .filter((c) => c.lettre)
    .map((c) => c.lettre)
    .join('');
  const propose = sansAccent(proposition).replace(/[^A-Z]/g, '');
  if (propose && propose === attendu) {
    const toutes = [
      ...new Set([...etat.proposees, ...cases.filter((c) => c.lettre).map((c) => c.lettre)]),
    ];
    return { etat: { ...etat, proposees: toutes }, juste: true };
  }
  return { etat: { ...etat, erreurs: etat.erreurs + 1 }, juste: false };
}

export function estDecouvert(cases, etat) {
  return cases.every((c) => !c.lettre || etat.proposees.includes(c.lettre));
}

export function batterieVide(etat, crans) {
  return etat.erreurs >= crans;
}
