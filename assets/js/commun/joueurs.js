/**
 * Qui joue la partie : tout le groupe (présents), une sélection au clic, ou un tirage au sort.
 * Fonctions pures, sauf chargerTires/enregistrerTires qui passent par stockage.js.
 *
 * La sélection n'est pas mémorisée : chaque jeu s'ouvre sur « Tout le groupe ». Seuls les
 * tirages au sort gardent la mémoire de qui a déjà été tiré, d'un jeu à l'autre, pour que
 * chacun passe à son tour.
 */
import { lire, ecrire } from './stockage.js';
import { melanger } from './hasard.js';

const CLE_TIRES = 'joueurs-tires';

export const MODES = [
  { valeur: 'tous', libelle: 'Tout le groupe' },
  { valeur: 'choix', libelle: 'Choisir' },
  { valeur: 'hasard', libelle: 'Au hasard' },
];

const cle = (prenom) => String(prenom).toLocaleLowerCase('fr');

/** Nouvelle sélection : tout le groupe joue. */
export function selectionParDefaut() {
  return { mode: 'tous', choisis: [] };
}

/**
 * Joueurs de la partie, dans l'ordre du groupe : tous les présents, ou ceux qui sont choisis
 * (au clic ou au hasard) et toujours présents.
 */
export function joueursDeLaPartie(presents, selection) {
  if (selection.mode === 'tous') return [...presents];
  const choisis = new Set(selection.choisis.map(cle));
  return presents.filter((p) => choisis.has(cle(p)));
}

/** Coche ou décoche une personne (le mode « tous » devient alors un choix au clic). */
export function basculerJoueur(presents, selection, prenom) {
  const actuels = joueursDeLaPartie(presents, selection).map(cle);
  const c = cle(prenom);
  const choisis = actuels.includes(c) ? actuels.filter((x) => x !== c) : [...actuels, c];
  return { mode: selection.mode === 'tous' ? 'choix' : selection.mode, choisis };
}

/**
 * Tire `nombre` joueurs parmi les présents : d'abord ceux qui n'ont pas encore été tirés
 * (`dejaTires` : prénoms en minuscules), puis les autres. Quand tout le monde est passé, un
 * nouveau tour commence. Renvoie les joueurs tirés (dans l'ordre du groupe) et la mémoire mise
 * à jour.
 */
export function tirerJoueurs(presents, nombre, dejaTires = [], hasard = Math.random) {
  const n = Math.max(0, Math.min(nombre, presents.length));
  const deja = new Set(dejaTires.map(cle));
  const pasEncore = melanger(
    presents.filter((p) => !deja.has(cle(p))),
    hasard,
  );
  const autres = melanger(
    presents.filter((p) => deja.has(cle(p))),
    hasard,
  );
  const tires = [...pasEncore, ...autres].slice(0, n);
  const garder = new Set(presents.map(cle));
  let memoire;
  if (pasEncore.length > n) {
    memoire = [...[...deja].filter((d) => garder.has(d)), ...tires.map(cle)];
  } else {
    // Tout le monde est passé : le nouveau tour commence avec ceux tirés en plus
    memoire = tires.slice(pasEncore.length).map(cle);
  }
  const tiresCles = new Set(tires.map(cle));
  return {
    joueurs: presents.filter((p) => tiresCles.has(cle(p))),
    dejaTires: memoire,
  };
}

export function chargerTires() {
  const brut = lire(CLE_TIRES, []);
  return Array.isArray(brut) ? brut.filter((t) => typeof t === 'string') : [];
}

export function enregistrerTires(tires) {
  return ecrire(CLE_TIRES, tires);
}
