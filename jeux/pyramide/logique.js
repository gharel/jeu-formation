/**
 * Règles de Pyramide : deviner un mot avec 1, 2 ou 3 mots d'indice.
 * Trouvé au 1er indice = 3 points, au 2e = 2 points, au 3e = 1 point.
 */

export const NOMBRE_INDICES = 3;

export function pointsPourIndice(indicesAffiches) {
  return Math.max(0, NOMBRE_INDICES - indicesAffiches + 1);
}

/** Minuscules sans accents, pour comparer des mots. */
function simplifier(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Nombre de lettres du mot à deviner (les espaces et tirets ne comptent pas). */
export function nombreDeLettres(mot) {
  return (String(mot ?? '').match(/\p{L}/gu) ?? []).length;
}

/**
 * Comme à la télévision, un indice ne doit pas contenir le mot à deviner (ni l'un de ses mots).
 * Renvoie un message ou null.
 */
export function verifierIndice(indice, mot) {
  const i = simplifier(indice);
  if (!i) return null;
  if (/\s/.test(i)) return 'doit être un seul mot';
  const morceaux = simplifier(mot)
    .split(/[\s'’-]+/)
    .filter((m) => m.length >= 3);
  if (morceaux.some((m) => i.includes(m)) || (i.length >= 3 && simplifier(mot).includes(i))) {
    return 'ne doit pas reprendre le mot à deviner';
  }
  return null;
}

/** Vérification d'un mot préparé et de ses indices (message ou null). */
export function validerMotPyramide(element) {
  const indices = (element.indices ?? []).map((t) => String(t).trim());
  for (let n = 0; n < indices.length; n++) {
    const probleme = verifierIndice(indices[n], element.mot);
    if (probleme) return `l’indice ${n + 1} (« ${indices[n]} ») ${probleme}.`;
  }
  return null;
}
