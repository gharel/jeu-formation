/**
 * Règles de « Qui suis-je ? » : un indice de plus à chaque chiffre perdu (5 4 3 2 1).
 */

const NOMBRE_PALIERS = 5;
export const INDICES_MIN = 3;
export const INDICES_MAX = 5;

/**
 * Nombre d'indices affichés pour une valeur de palier : 1 indice à 5 points, 2 à 4 points…
 * Tous les indices à la fin (valeur 0).
 */
export function indicesVisibles(valeur, nombreIndices) {
  if (valeur <= 0) return nombreIndices;
  return Math.min(nombreIndices, NOMBRE_PALIERS - valeur + 1);
}
