/**
 * Mode de jeu d'une partie, choisi à l'accueil du jeu : chacun pour soi, par équipes, ou équipes
 * et joueurs. Le mode dit qui reçoit les points (scores.js) et dans quel ordre on passe
 * (ordreDePassage). Fonctions pures ; le choix de l'animateur est gardé pour toute la séance (un
 * jeu après l'autre) par stockage.js.
 *
 * Les équipes « en jeu » sont celles du groupe, réduites aux joueurs de la partie :
 * [{ id, nom, membres: ['Ana', 'Bob'] }] (prénoms affichés, dans l'ordre des joueurs).
 */
import { lire, ecrire } from './stockage.js';

export const CLE_MODE = 'mode-jeu';

export const MODES = [
  {
    valeur: 'individuel',
    libelle: 'Chacun pour soi',
    aide: 'Chaque joueur marque ses propres points.',
  },
  {
    valeur: 'equipes',
    libelle: 'Par équipes',
    aide: 'Seules les équipes marquent : un joueur qui trouve fait marquer son équipe.',
  },
  {
    valeur: 'mixte',
    libelle: 'Équipes et joueurs',
    aide: 'L’équipe marque, et le joueur qui a trouvé aussi.',
  },
];

const MODE_PAR_DEFAUT = 'individuel';

export function nettoyerMode(brut) {
  return MODES.some((m) => m.valeur === brut) ? brut : MODE_PAR_DEFAUT;
}

/** Les deux modes où les équipes marquent. */
export function avecEquipes(mode) {
  return mode === 'equipes' || mode === 'mixte';
}

/** Jouer en équipes demande au moins deux équipes qui ont un joueur dans la partie. */
export function equipesSuffisantes(equipesEnJeu) {
  return equipesEnJeu.filter((e) => e.membres.length).length >= 2;
}

/** Le mode vraiment joué : sans deux équipes en jeu, chacun joue pour soi. */
export function modeDeLaPartie(mode, equipesEnJeu) {
  const propre = nettoyerMode(mode);
  return avecEquipes(propre) && equipesSuffisantes(equipesEnJeu) ? propre : 'individuel';
}

/** L'équipe en jeu d'un joueur ({ id, nom, membres }), ou null. */
export function equipeDuJoueur(equipes, prenom) {
  return equipes.find((e) => e.membres.includes(prenom)) ?? null;
}

/**
 * Ordre de passage des joueurs (tour de rôle, premier porteur…). Chacun pour soi : l'ordre des
 * joueurs. En équipes : les équipes passent chacune leur tour (Bleus, Rouges, Bleus…) et leurs
 * membres tournent ; un joueur sans équipe passe comme une équipe à lui seul. La liste fait un
 * tour complet de la plus grande équipe : une petite équipe y revient plus souvent.
 */
export function ordreDePassage(participants, equipes = [], mode = 'individuel') {
  if (!avecEquipes(mode) || !equipesSuffisantes(equipes)) return [...participants];
  const enJeu = new Set(participants);
  const groupes = equipes.map((e) => e.membres.filter((m) => enJeu.has(m))).filter((g) => g.length);
  const couverts = new Set(groupes.flat());
  for (const prenom of participants) if (!couverts.has(prenom)) groupes.push([prenom]);
  const tours = Math.max(...groupes.map((g) => g.length));
  const ordre = [];
  for (let tour = 0; tour < tours; tour++) {
    for (const groupe of groupes) ordre.push(groupe[tour % groupe.length]);
  }
  return ordre;
}

/** « Ana (Les Bleus) », ou « Ana » sans équipe. */
export function nommerAvecEquipe(equipes, prenom) {
  const equipe = equipeDuJoueur(equipes, prenom);
  return equipe ? `${prenom} (${equipe.nom})` : prenom;
}

/** Le mode gardé pour la séance ; `defaut` tant que l'animateur n'en a choisi aucun. */
export function lireMode(defaut = MODE_PAR_DEFAUT) {
  return nettoyerMode(lire(CLE_MODE, nettoyerMode(defaut)));
}

export function ecrireMode(mode) {
  return ecrire(CLE_MODE, nettoyerMode(mode));
}
