/**
 * Lecture et affichage des nombres au format français.
 */

/**
 * Lit un nombre saisi : « 1 000 000 », « 1000000 », « 2,5 », « 1.500 » (= 1500), « -3 ».
 * Renvoie null si la saisie n'est pas un nombre.
 */
export function lireNombre(texte) {
  if (typeof texte === 'number') return Number.isFinite(texte) ? texte : null;
  let s = String(texte ?? '')
    .trim()
    .replace(/[\s'’_]/g, '');
  if (!s) return null;
  const virgules = (s.match(/,/g) ?? []).length;
  const points = (s.match(/\./g) ?? []).length;
  if (virgules && points) {
    // Le dernier séparateur est la décimale : 1.234,5 ou 1,234.5
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (virgules) {
    if (virgules > 1) return null;
    s = s.replace(',', '.');
  } else if (points > 1) {
    s = s.replace(/\./g, '');
  } else if (/^[-+]?[1-9]\d{0,2}\.\d{3}$/.test(s)) {
    // « 1.500 » : habitude française pour 1 500
    s = s.replace('.', '');
  }
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

// 'min2' : pas d'espace dans les nombres à 4 chiffres (1989, 1500), comme en français courant
const FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6, useGrouping: 'min2' });

/** Affiche un nombre avec les espaces des milliers à partir de 10 000 : 1989 ; 1 000 000 ; 2,5. */
export function formaterNombre(n) {
  return FORMAT.format(n);
}
