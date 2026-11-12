/**
 * « Groupes récents » : les groupes du dernier mois, mis de côté au moment où ils seraient perdus
 * (tout vider, importer un autre groupe, recharger un groupe récent, effacer la liste), pour les
 * recharger en entier ou en partie (prénoms, disposition, équipes, scores, notes de suivi).
 *
 * Une entrée : { id, creeLe, utiliseLe, groupe } ; `groupe` est le contenu `groupe` du fichier
 * JSON (fichier-groupe.js), relu par lireGroupe(). Le groupe en cours porte l'identifiant de son
 * entrée (clé `groupe-courant` : { id, creeLe }) : le remettre de côté met son entrée à jour au
 * lieu d'en ajouter une. Fonctions pures, sauf charger/enregistrer qui passent par stockage.js.
 */
import { lire, ecrire, effacer } from './stockage.js';
import { DISPOSITIONS } from './salle.js';
import { decrireSuivi } from './suivi.js';

export const CLE_HISTORIQUE = 'historique-groupes';
export const CLE_COURANT = 'groupe-courant';
/** Un groupe reste un mois après sa dernière utilisation. */
export const DUREE_JOURS = 30;
/** Au plus 20 groupes : le stockage du navigateur est limité. */
export const NOMBRE_MAX = 20;
const JOUR = 24 * 60 * 60 * 1000;

/** Ce qu'on peut recharger, dans l'ordre de la fenêtre « Recharger ce groupe ? ». */
export const PARTIES_RECHARGE = [
  {
    cle: 'prenoms',
    libelle: 'Les prénoms',
    aide: 'Avec leurs infos et le nom du groupe. Les absences repartent à zéro.',
  },
  {
    cle: 'salle',
    libelle: 'La disposition',
    aide: 'La salle (en U, îlots…), le nombre de places et la place de chacun.',
  },
  { cle: 'equipes', libelle: 'Les équipes', aide: 'Leurs noms et leurs membres.' },
  {
    cle: 'scores',
    libelle: 'Les scores',
    aide: 'Les points de chacun (et des équipes, si elles reviennent aussi).',
  },
  {
    cle: 'suivi',
    libelle: 'Les notes',
    aide: 'La diapositive où le groupe s’est arrêté et ce qui a été vu ensemble.',
  },
];

/** Une date ISO enregistrée, ou null (new Date(null) donnerait 1970). */
const date = (texte) => {
  if (typeof texte !== 'string') return null;
  const d = new Date(texte);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Une entrée lisible : un identifiant, des dates, un groupe avec des participants. */
function entreeValide(entree) {
  return (
    entree &&
    typeof entree === 'object' &&
    typeof entree.id === 'string' &&
    date(entree.creeLe) !== null &&
    date(entree.utiliseLe) !== null &&
    entree.groupe &&
    typeof entree.groupe === 'object' &&
    Array.isArray(entree.groupe.participants)
  );
}

/**
 * Garde les entrées valides utilisées depuis moins d'un mois, les plus récentes d'abord, 20 au
 * plus.
 */
export function purger(liste, maintenant = new Date()) {
  if (!Array.isArray(liste)) return [];
  const limite = maintenant.getTime() - DUREE_JOURS * JOUR;
  return liste
    .filter(entreeValide)
    .filter((e) => date(e.utiliseLe).getTime() >= limite)
    .sort((a, b) => date(b.utiliseLe) - date(a.utiliseLe))
    .slice(0, NOMBRE_MAX);
}

/** Un nouvel identifiant d'entrée : « g » + l'heure + un peu de hasard (jamais deux pareils). */
export function nouvelId(maintenant = new Date()) {
  return `g${maintenant.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Met un groupe de côté : remplace l'entrée de même identifiant, ou l'ajoute en tête. Un groupe
 * sans participant n'est pas gardé.
 */
export function mettreDeCote(liste, { id, creeLe, groupe }, maintenant = new Date()) {
  const gardees = purger(liste, maintenant).filter((e) => e.id !== id);
  if (!groupe?.participants?.length) return gardees;
  const entree = {
    id,
    creeLe: date(creeLe)?.toISOString() ?? maintenant.toISOString(),
    utiliseLe: maintenant.toISOString(),
    groupe,
  };
  return purger([entree, ...gardees], maintenant);
}

export function supprimer(liste, id) {
  return liste.filter((e) => e.id !== id);
}

/** Total des points d'une entrée du fichier : { motus: 3, correction: -1 } → 2. */
function total(points) {
  if (!points || typeof points !== 'object') return 0;
  return Object.values(points).reduce((somme, n) => somme + (Number(n) || 0), 0);
}

/**
 * Ce qu'on affiche d'une entrée : { titre, prenoms, participants, equipes, places, disposition,
 * meilleur: { prenom, points } | null, suivi: « arrêté à la diapo 42 · vu : Google Sheets… » ou '' }.
 */
export function resumer(entree) {
  const { groupe } = entree;
  const personnes = groupe.participants
    .map((p) => (typeof p === 'string' ? { prenom: p } : p))
    .filter((p) => p && typeof p.prenom === 'string' && p.prenom);
  let meilleur = null;
  for (const p of personnes) {
    const points = total(p.points);
    if (points > 0 && (!meilleur || points > meilleur.points)) {
      meilleur = { prenom: p.prenom, points };
    }
  }
  const disposition = DISPOSITIONS.find((d) => d.valeur === groupe.salle?.disposition);
  return {
    titre: typeof groupe.nom === 'string' && groupe.nom ? groupe.nom : 'Groupe sans nom',
    prenoms: personnes.map((p) => p.prenom),
    participants: personnes.length,
    equipes: Array.isArray(groupe.equipes) ? groupe.equipes.length : 0,
    places: personnes.filter((p) => p.place !== undefined && p.place !== null).length,
    disposition: disposition?.libelle ?? '',
    meilleur,
    suivi: decrireSuivi(groupe.suivi),
  };
}

const jourMois = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/** « créé le 3 octobre, utilisé le 28 octobre », ou « utilisé le 3 novembre » (le même jour). */
export function decrireDates(entree) {
  const cree = jourMois(date(entree.creeLe));
  const utilise = jourMois(date(entree.utiliseLe));
  return cree === utilise ? `utilisé le ${utilise}` : `créé le ${cree}, utilisé le ${utilise}`;
}

/**
 * Le groupe rechargé, prêt pour groupe.remplacer() : `actuel` et `archive` ont les propriétés de
 * creerGroupe() (archive : relue par lireGroupe()), `choix` les clés de PARTIES_RECHARGE.
 * Ce qui n'est pas choisi reste celui du groupe actuel ; sans les prénoms, places, équipes et
 * scores rechargés ne valent que pour les personnes déjà dans le groupe (remplacer() nettoie).
 */
export function fusionner(actuel, archive, choix) {
  const avec = new Set(choix);
  const personnes = avec.has('prenoms') ? archive : actuel;
  let scoresEquipes = actuel.scoresEquipes;
  if (avec.has('equipes')) scoresEquipes = avec.has('scores') ? archive.scoresEquipes : {};
  return {
    nom: personnes.nom,
    participants: personnes.participants,
    infos: personnes.infos,
    // Les absences sont celles du jour : un groupe rechargé est présent au complet
    absents: avec.has('prenoms') ? [] : actuel.absents,
    plan: avec.has('salle') ? archive.plan : actuel.plan,
    equipes: avec.has('equipes') ? archive.equipes : actuel.equipes,
    scores: avec.has('scores') ? archive.scores : actuel.scores,
    scoresEquipes,
    suivi: avec.has('suivi') ? archive.suivi : actuel.suivi,
  };
}

/** « les prénoms, la disposition et les scores » */
export function decrireParties(parties) {
  const noms = PARTIES_RECHARGE.filter((p) => parties.includes(p.cle)).map((p) =>
    p.libelle.toLowerCase(),
  );
  return noms.length < 2 ? (noms[0] ?? '') : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`;
}

/* ---------- Stockage ---------- */

export function charger(maintenant = new Date()) {
  return purger(lire(CLE_HISTORIQUE, []), maintenant);
}

export function enregistrer(liste) {
  if (liste.length) ecrire(CLE_HISTORIQUE, liste);
  else effacer(CLE_HISTORIQUE);
}

/** L'entrée du groupe en cours : { id, creeLe }, ou null. */
export function chargerCourant() {
  const courant = lire(CLE_COURANT, null);
  return courant && typeof courant.id === 'string' && date(courant.creeLe) ? courant : null;
}

export function enregistrerCourant(courant) {
  if (courant) ecrire(CLE_COURANT, { id: courant.id, creeLe: courant.creeLe });
  else effacer(CLE_COURANT);
}
