/**
 * Équipes du groupe : l'animateur répartit les participants (au hasard ou à la main), puis donne
 * des points à une équipe entière. Une personne est dans une équipe au plus ; une équipe peut
 * rester vide le temps de la composer. Les membres sont gardés en minuscules, comme les absences
 * et les places du plan : [{ id: 'e1', nom: 'Équipe 1', membres: ['ana', 'bob'] }].
 *
 * Chaque équipe a aussi son score, tous jeux confondus, rangé comme celui des personnes
 * (scores-groupe.js) mais sous l'identifiant de l'équipe : { e1: { motus: 3 } }.
 * Fonctions pures ; charger/enregistrer passent par stockage.js.
 */
import { lire, ecrire } from './stockage.js';
import { melanger } from './hasard.js';
import { classer } from './scores.js';
import { normaliserScores, totalDe } from './scores-groupe.js';

export const CLE_EQUIPES = 'equipes';
export const CLE_SCORES_EQUIPES = 'scores-equipes';
export const NOMBRE_EQUIPES_MAX = 8;
export const LONGUEUR_NOM_EQUIPE = 30;

const cle = (prenom) => String(prenom).replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');

export function normaliserNomEquipe(texte) {
  return String(texte ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGUEUR_NOM_EQUIPE);
}

/** Premier identifiant libre : e1, e2… */
function idLibre(equipes) {
  const pris = new Set(equipes.map((e) => e.id));
  for (let n = 1; ; n++) if (!pris.has(`e${n}`)) return `e${n}`;
}

/** Premier nom « Équipe N » qui n'est pas déjà pris. */
function nomLibre(equipes) {
  const pris = new Set(equipes.map((e) => e.nom.toLocaleLowerCase('fr')));
  for (let n = equipes.length + 1; ; n++) {
    if (!pris.has(`équipe ${n}`)) return `Équipe ${n}`;
  }
}

/**
 * Équipes nettoyées : au plus 8, chacune avec un identifiant unique, un nom (« Équipe 2 » par
 * défaut) et des membres qui sont dans la liste, dans une seule équipe (la première citée).
 */
export function normaliserEquipes(brut, participants) {
  if (!Array.isArray(brut)) return [];
  const connus = new Set(participants.map(cle));
  const deja = new Set();
  const equipes = [];
  for (const entree of brut) {
    if (equipes.length >= NOMBRE_EQUIPES_MAX) break;
    if (!entree || typeof entree !== 'object') continue;
    const libre =
      typeof entree.id === 'string' &&
      /^e\d{1,3}$/.test(entree.id) &&
      !equipes.some((e) => e.id === entree.id);
    const membres = [];
    for (const membre of Array.isArray(entree.membres) ? entree.membres : []) {
      if (typeof membre !== 'string') continue;
      const c = cle(membre);
      if (!connus.has(c) || deja.has(c)) continue;
      deja.add(c);
      membres.push(c);
    }
    equipes.push({
      id: libre ? entree.id : idLibre(equipes),
      nom: normaliserNomEquipe(entree.nom) || nomLibre(equipes),
      membres,
    });
  }
  return equipes;
}

/** L'équipe d'une personne, ou null. */
export function equipeDe(equipes, prenom) {
  const c = cle(prenom);
  return equipes.find((e) => e.membres.includes(c)) ?? null;
}

/** Les membres d'une équipe parmi `prenoms` (les joueurs d'une partie…), dans leur ordre. */
export function membresParmi(equipe, prenoms) {
  const membres = new Set(equipe.membres);
  return prenoms.filter((p) => membres.has(cle(p)));
}

/** Les personnes de `prenoms` qui n'ont pas d'équipe. */
export function sansEquipe(equipes, prenoms) {
  return prenoms.filter((p) => !equipeDe(equipes, p));
}

/** Une équipe vide de plus (« Équipe 3 »), s'il en reste la place. */
export function ajouterEquipe(equipes) {
  if (equipes.length >= NOMBRE_EQUIPES_MAX) return equipes;
  return [...equipes, { id: idLibre(equipes), nom: nomLibre(equipes), membres: [] }];
}

/** Retire une équipe : ses membres se retrouvent sans équipe. */
export function retirerEquipe(equipes, id) {
  return equipes.filter((e) => e.id !== id);
}

/** Change le nom d'une équipe (un nom vide ne change rien). */
export function renommerEquipe(equipes, id, nom) {
  const propre = normaliserNomEquipe(nom);
  if (!propre) return equipes;
  return equipes.map((e) => (e.id === id ? { ...e, nom: propre } : e));
}

/** Met une personne dans une équipe (`id`), ou hors de toute équipe (`id` null). */
export function placerDansEquipe(equipes, prenom, id) {
  const c = cle(prenom);
  return equipes.map((e) => {
    const membres = e.membres.filter((m) => m !== c);
    if (e.id === id) membres.push(c);
    return { ...e, membres };
  });
}

/**
 * Répartit `prenoms` au hasard en `nombre` équipes de même taille (à une personne près). Les
 * équipes déjà là gardent leur nom ; il s'en ajoute ou s'en retire pour arriver au nombre voulu.
 * Les personnes hors de `prenoms` (absentes aujourd'hui) se retrouvent sans équipe.
 */
export function repartirAuHasard(equipes, prenoms, nombre, hasard = Math.random) {
  const n = Math.max(1, Math.min(NOMBRE_EQUIPES_MAX, Math.trunc(nombre) || 1));
  let nouvelles = equipes.slice(0, n).map((e) => ({ ...e, membres: [] }));
  while (nouvelles.length < n) nouvelles = ajouterEquipe(nouvelles);
  melanger(prenoms, hasard).forEach((prenom, i) => nouvelles[i % n].membres.push(cle(prenom)));
  return nouvelles;
}

/** Classement des équipes : [{ id, nom, points, rang }], ex æquo au même rang. */
export function classementEquipes(scores, equipes) {
  const noms = new Map(equipes.map((e) => [e.id, e.nom]));
  return classer(equipes.map((e) => ({ prenom: e.id, points: totalDe(scores, e.id) }))).map(
    ({ prenom: id, points, rang }) => ({ id, nom: noms.get(id), points, rang }),
  );
}

/** Ne garde que les scores des équipes qui existent encore. */
export function normaliserScoresEquipes(scores, equipes) {
  return normaliserScores(
    scores,
    equipes.map((e) => e.id),
  );
}

export function charger(participants) {
  return normaliserEquipes(lire(CLE_EQUIPES, []), participants);
}

export function enregistrer(equipes) {
  return ecrire(CLE_EQUIPES, equipes);
}

export function chargerScores(equipes) {
  return normaliserScoresEquipes(lire(CLE_SCORES_EQUIPES, {}), equipes);
}

export function enregistrerScores(scores) {
  return ecrire(CLE_SCORES_EQUIPES, scores);
}
