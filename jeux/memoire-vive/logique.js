/**
 * Règles de Mémoire vive (d'après le Memory) : des cartes face cachée, par paires (« Ctrl + Z »
 * et « Annuler »). Le joueur retourne deux cartes : si elles vont ensemble, il gagne la paire
 * (1 point) et rejoue ; sinon, tout le monde les mémorise, elles se cachent et la main passe au
 * joueur suivant. Le nombre de cartes se choisit au lancement de la partie.
 */
import { melanger } from '../../assets/js/commun/hasard.js';

export const NOMBRES_DE_CARTES = [8, 12, 16, 20, 24];
/** Il faut au moins assez de paires pour la plus petite grille. */
export const PAIRES_MIN = NOMBRES_DE_CARTES[0] / 2;

/** Vérifie une paire préparée par l'animateur : un message, ou null si elle convient. */
export function validerPaire({ carteA = '', carteB = '' } = {}) {
  const a = String(carteA).trim().toLowerCase();
  if (a && a === String(carteB).trim().toLowerCase()) {
    return 'les deux cartes d’une paire doivent être différentes.';
  }
  return null;
}

/** Nombres de cartes possibles avec `paires` paires préparées. */
export function nombresPossibles(paires) {
  return NOMBRES_DE_CARTES.filter((n) => n / 2 <= paires);
}

/**
 * Nombre de cartes proposé : le dernier choisi s'il est encore possible, sinon 16, sinon le plus
 * grand possible.
 */
export function nombreParDefaut(paires, prefere = null) {
  const possibles = nombresPossibles(paires);
  if (possibles.includes(prefere)) return prefere;
  if (possibles.includes(16)) return 16;
  return possibles.at(-1) ?? null;
}

/** Colonnes et lignes de la grille : 4 colonnes jusqu'à 16 cartes, puis 5 et 6. */
export function disposition(nombre) {
  let colonnes = 6;
  if (nombre <= 16) colonnes = 4;
  else if (nombre <= 20) colonnes = 5;
  return { colonnes, lignes: Math.ceil(nombre / colonnes) };
}

/** Repère d'une carte, comme à la bataille navale : la colonne en lettre, la ligne en chiffre. */
export function repere(index, colonnes) {
  return `${String.fromCharCode(65 + (index % colonnes))}${Math.floor(index / colonnes) + 1}`;
}

/**
 * Distribue `nombre` cartes : nombre / 2 paires tirées au hasard parmi celles préparées, chacune
 * donnant une carte A (« Ctrl + Z ») et une carte B (« Annuler »), le tout mélangé.
 * Renvoie { paires: [paire choisie…], cartes: [{ paire: rang dans `paires`, face, texte }] }.
 */
export function distribuer(paires, nombre, hasard = Math.random) {
  const choisies = melanger(paires, hasard).slice(0, nombre / 2);
  const cartes = choisies.flatMap((paire, rang) => [
    { paire: rang, face: 'a', texte: paire.carteA },
    { paire: rang, face: 'b', texte: paire.carteB },
  ]);
  return { paires: choisies, cartes: melanger(cartes, hasard) };
}

/** Joueur suivant dans la liste, en boucle (null sans joueurs). */
export function joueurSuivant(participants, actuel) {
  if (!participants.length) return null;
  const i = participants.indexOf(actuel);
  return participants[(i + 1) % participants.length];
}

/**
 * Une partie. On retourne une carte, puis une seconde : si elles forment une paire, elles restent
 * visibles pour de bon ; sinon elles restent visibles le temps de les mémoriser, jusqu'à cacher()
 * ou jusqu'à ce qu'on retourne une autre carte.
 */
export function creerPartie(cartes) {
  const nombreDePaires = new Set(cartes.map((c) => c.paire)).size;
  const trouvees = new Set();
  let visibles = [];
  // 'premiere' : on attend une 1re carte ; 'seconde' : une 2de ; 'ratee' : deux cartes à cacher
  let phase = cartes.length ? 'premiere' : 'finie';

  return {
    get phase() {
      return phase;
    },
    /** Index des cartes retournées et pas encore trouvées (0, 1 ou 2). */
    get visibles() {
      return [...visibles];
    },
    get pairesTrouvees() {
      return trouvees.size;
    },
    get nombreDePaires() {
      return nombreDePaires;
    },
    estTrouvee(index) {
      return trouvees.has(cartes[index]?.paire);
    },
    /**
     * Retourne la carte `index` : 'premiere', 'paire', 'ratee', ou null si elle ne peut pas
     * l'être (déjà visible ou déjà trouvée). Après un raté, cache d'abord les deux cartes.
     */
    retourner(index) {
      if (phase === 'finie' || !cartes[index]) return null;
      if (trouvees.has(cartes[index].paire) || visibles.includes(index)) return null;
      if (phase === 'ratee') {
        visibles = [];
        phase = 'premiere';
      }
      if (phase === 'premiere') {
        visibles = [index];
        phase = 'seconde';
        return 'premiere';
      }
      const premiere = cartes[visibles[0]];
      if (premiere.paire === cartes[index].paire) {
        trouvees.add(premiere.paire);
        visibles = [];
        phase = trouvees.size === nombreDePaires ? 'finie' : 'premiere';
        return 'paire';
      }
      visibles = [visibles[0], index];
      phase = 'ratee';
      return 'ratee';
    },
    /** Cache les deux cartes d'un raté. */
    cacher() {
      if (phase !== 'ratee') return false;
      visibles = [];
      phase = 'premiere';
      return true;
    },
  };
}
