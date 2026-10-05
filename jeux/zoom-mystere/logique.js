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

/** Point fixe du zoom en CSS (« 15.6% 12.3% »). */
export function origine(focus) {
  const x = Math.min(1, Math.max(0, focus?.x ?? 0.5));
  const y = Math.min(1, Math.max(0, focus?.y ?? 0.5));
  return `${Math.round(x * 1000) / 10}% ${Math.round(y * 1000) / 10}%`;
}

/** Identifiants d'images IndexedDB utilisés par un contenu (pour supprimer les autres). */
export function idsImages(contenu) {
  return contenu.elements.map((e) => e.image?.id).filter(Boolean);
}
