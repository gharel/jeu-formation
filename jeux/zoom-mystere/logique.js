/**
 * Règles de Zoom mystère : l'image se dézoome d'un cran à chaque chiffre perdu (5 4 3 2 1).
 */

export const ZOOMS = { fort: 16, moyen: 10, leger: 6 };
const NOMBRE_PALIERS = 5;
const ZOOM_DERNIER_PALIER = 1.6;

/**
 * Agrandissement pour une valeur de palier : `max` à 5 points, 1,6 au dernier palier,
 * 1 (image entière) quand la manche est finie. Progression géométrique (dézoom régulier à l'œil).
 */
export function echelle(valeur, { max = ZOOMS.moyen } = {}) {
  if (valeur <= 0) return 1;
  const avancement = (NOMBRE_PALIERS - Math.min(valeur, NOMBRE_PALIERS)) / (NOMBRE_PALIERS - 1);
  return max * (ZOOM_DERNIER_PALIER / max) ** avancement;
}

const entre0et1 = (v) => Math.min(1, Math.max(0, v ?? 0.5));

/**
 * Décalage de l'image agrandie (en part de sa taille) qui amène le détail `f` (0 à 1) au centre du
 * cadre. Près d'un bord, l'image s'arrête au bord du cadre : le détail s'en rapproche plutôt que de
 * laisser voir du vide.
 */
export function decalage(f, agrandissement) {
  const auCentre = 0.5 - agrandissement * entre0et1(f);
  return Math.min(0, Math.max(1 - agrandissement, auCentre));
}

/**
 * Transformation CSS de l'image (point fixe en haut à gauche) : agrandie de `agrandissement`, le
 * détail choisi au centre du cadre (« translate(-40.5%, -6.15%) scale(10) »).
 */
export function cadrage(focus, agrandissement) {
  const pourcent = (f) => `${Math.round(decalage(f, agrandissement) * 10000) / 100 || 0}%`;
  return `translate(${pourcent(focus?.x)}, ${pourcent(focus?.y)}) scale(${agrandissement})`;
}

/** Identifiants d'images IndexedDB utilisés par un contenu (pour supprimer les autres). */
export function idsImages(contenu) {
  return contenu.elements.map((e) => e.image?.id).filter(Boolean);
}
