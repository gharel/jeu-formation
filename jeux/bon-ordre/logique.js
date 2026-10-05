/**
 * Règles du Bon Ordre : les étapes d'une procédure sont mélangées sur des cartes A, B, C…
 * Le groupe dicte l'ordre, le jeu vérifie position par position.
 */
import { melanger } from '../../assets/js/commun/hasard.js';

const LETTRES = 'ABCDEFGH';
export const ETAPES_MIN = 3;
export const ETAPES_MAX = 7;

/**
 * Cartes mélangées : [{ lettre: 'A', etape: 2 }, …] où `etape` est la position correcte.
 * On évite de tomber par hasard sur le bon ordre. `hasard` : ctx.hasard (?graine=).
 */
export function creerCartes(nombre, hasard) {
  const positions = Array.from({ length: nombre }, (_, i) => i);
  let ordre = melanger(positions, hasard);
  for (let essai = 0; essai < 20 && nombre > 1 && ordre.every((p, i) => p === i); essai++) {
    ordre = melanger(positions, hasard);
  }
  if (nombre > 1 && ordre.every((p, i) => p === i)) ordre = [...ordre.slice(1), ordre[0]];
  return ordre.map((etape, i) => ({ lettre: LETTRES[i], etape }));
}

/**
 * Lit l'ordre dicté : « C, A, D, B » ou « CADB ». `autorisees` : lettres encore à placer.
 * Renvoie { lettres } ou { erreur }.
 */
export function lireOrdre(texte, autorisees) {
  const lettres = String(texte ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('');
  if (!lettres.length) return { erreur: 'Tapez les lettres des cartes, par exemple « C A D B ».' };
  const inconnue = lettres.find((l) => !autorisees.includes(l));
  if (inconnue) return { erreur: `La carte ${inconnue} n’est pas à placer.` };
  const doublon = lettres.find((l, i) => lettres.indexOf(l) !== i);
  if (doublon) return { erreur: `La carte ${doublon} est donnée deux fois.` };
  if (lettres.length !== autorisees.length) {
    return { erreur: `Il faut ${autorisees.length} lettres (ici ${lettres.length}).` };
  }
  return { lettres };
}

/** Pour chaque emplacement, la carte posée est-elle la bonne ? (carte.etape === position) */
export function verifier(emplacements) {
  return emplacements.map((carte, position) => carte !== null && carte.etape === position);
}

/** Points selon l'essai : 3 au premier, 2 au deuxième, 1 au troisième (avec 3 essais). */
export function pointsPourEssai(essai, essaisMax = 3) {
  return Math.max(1, essaisMax - essai + 1);
}

export function validerProcedure(element) {
  const n = (element.etapes ?? []).map((e) => String(e).trim()).filter(Boolean).length;
  if (n > ETAPES_MAX) return `${ETAPES_MAX} étapes au maximum.`;
  return null;
}
