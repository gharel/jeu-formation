/**
 * Liste des prénoms partagée par tous les jeux.
 * Les fonctions de manipulation sont pures ; charger/enregistrer passent par stockage.js.
 */
import { lire, ecrire } from './stockage.js';

const CLE = 'participants';
export const LONGUEUR_MAX = 30;
export const NOMBRE_MAX = 60;

/** Nettoie un prénom saisi : espaces superflus retirés, longueur limitée. */
export function normaliserPrenom(texte) {
  return String(texte ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGUEUR_MAX);
}

function cleComparaison(prenom) {
  return prenom.toLocaleLowerCase('fr');
}

/** Ajoute un ou plusieurs prénoms (séparés par des virgules, points-virgules ou retours à la ligne). */
export function ajouter(liste, saisie) {
  const resultat = [...liste];
  const connus = new Set(resultat.map(cleComparaison));
  for (const morceau of String(saisie ?? '').split(/[,;\n]/)) {
    const prenom = normaliserPrenom(morceau);
    if (!prenom || connus.has(cleComparaison(prenom)) || resultat.length >= NOMBRE_MAX) continue;
    connus.add(cleComparaison(prenom));
    resultat.push(prenom);
  }
  return resultat;
}

export function retirer(liste, prenom) {
  return liste.filter((p) => cleComparaison(p) !== cleComparaison(prenom));
}

export function charger() {
  const liste = lire(CLE, []);
  if (!Array.isArray(liste)) return [];
  return ajouter([], liste.filter((p) => typeof p === 'string').join('\n'));
}

export function enregistrer(liste) {
  return ecrire(CLE, liste);
}
