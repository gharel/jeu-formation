/**
 * Score du groupe : les points gagnés dans tous les jeux s'additionnent d'un jeu à l'autre (et
 * d'un jour à l'autre), jusqu'à ce que l'animateur les remette à zéro. Pour chaque personne, le
 * détail par jeu : { ana: { motus: 3, pyramide: 2, correction: -1 } }. Les clés sont les prénoms
 * en minuscules ; `correction` : ce que l'animateur a corrigé à la main.
 * Fonctions pures ; charger/enregistrer passent par stockage.js.
 */
import { lire, ecrire } from './stockage.js';
import { classer } from './scores.js';

export const CLE_SCORES = 'scores-groupe';
export const CORRECTION = 'correction';
export const POINTS_MAX = 9999;

const SOURCE = /^[a-z0-9-]{1,40}$/;
const cle = (prenom) => String(prenom).toLocaleLowerCase('fr');

/** Nombre entier borné (de −9999 à 9999), 0 pour tout le reste. */
export function pointsEntiers(n) {
  const valeur = Math.trunc(Number(n));
  if (!Number.isFinite(valeur)) return 0;
  return Math.max(-POINTS_MAX, Math.min(POINTS_MAX, valeur));
}

/** Garde les personnes de la liste et des points entiers ; un détail à zéro disparaît. */
export function normaliserScores(scores, participants) {
  const connus = new Set(participants.map(cle));
  const propres = {};
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return propres;
  for (const [personne, detail] of Object.entries(scores)) {
    if (!connus.has(cle(personne)) || !detail || typeof detail !== 'object') continue;
    const garde = {};
    for (const [source, n] of Object.entries(detail)) {
      const valeur = pointsEntiers(n);
      if (SOURCE.test(source) && valeur !== 0) garde[source] = valeur;
    }
    if (Object.keys(garde).length) propres[cle(personne)] = garde;
  }
  return propres;
}

/** Total d'une personne, tous jeux confondus. */
export function totalDe(scores, prenom) {
  return Object.values(scores[cle(prenom)] ?? {}).reduce((somme, n) => somme + n, 0);
}

/** Détail d'une personne : [{ source: 'motus', points: 3 }], dans l'ordre où les points sont venus. */
export function detailDe(scores, prenom) {
  return Object.entries(scores[cle(prenom)] ?? {}).map(([source, points]) => ({ source, points }));
}

/** Ajoute `n` points (ou en retire) à une personne, pour un jeu (`source` : son slug). */
export function ajouterPoints(scores, prenom, source, n) {
  const personne = cle(prenom);
  const detail = { ...(scores[personne] ?? {}) };
  detail[source] = pointsEntiers((detail[source] ?? 0) + pointsEntiers(n));
  if (detail[source] === 0) delete detail[source];
  const resultat = { ...scores, [personne]: detail };
  if (!Object.keys(detail).length) delete resultat[personne];
  return resultat;
}

/** Fixe le total d'une personne : l'écart va dans la correction de l'animateur. */
export function fixerTotal(scores, prenom, total) {
  return ajouterPoints(scores, prenom, CORRECTION, pointsEntiers(total) - totalDe(scores, prenom));
}

/** Classement du groupe : [{ prenom, points, rang }], ex æquo au même rang. */
export function classementGroupe(scores, participants) {
  return classer(participants.map((prenom) => ({ prenom, points: totalDe(scores, prenom) })));
}

/** Vrai si personne n'a de point. */
export function scoresVides(scores) {
  return Object.keys(scores).length === 0;
}

export function charger(participants) {
  return normaliserScores(lire(CLE_SCORES, {}), participants);
}

export function enregistrer(scores) {
  return ecrire(CLE_SCORES, scores);
}
