/**
 * Nombre d'éléments joués dans une partie, et équité des passages : fonctions pures.
 *
 * Un jeu joue moins d'éléments que préparés (6 mots sur 10, par exemple). Pour que chacun passe
 * autant de fois, le nombre joué doit tomber juste selon la façon de passer du jeu (`tour`) :
 *   - 'individuel' : un joueur par élément (Motus, Instant défi…) ;
 *   - 'binome'     : deux joueurs par tour, `parTour` éléments par tour (Pyramide) ; un duel est un
 *                    binôme dont l'unité est le duel ;
 *   - 'collectif'  : tout le groupe joue ensemble, aucune contrainte.
 *
 * `equipes` : les équipes en jeu, sous forme d'effectifs ([3, 3, 4]) ou d'objets ({ membres }).
 */
import { melanger } from './hasard.js';

/** Effectif d'une équipe : un nombre, ou la taille de ses membres. */
function effectif(equipe) {
  return typeof equipe === 'number' ? equipe : (equipe?.membres?.length ?? 0);
}

function pgcd(a, b) {
  return b === 0 ? a : pgcd(b, a % b);
}

function ppcm(nombres) {
  return nombres.reduce((m, n) => (m * n) / pgcd(m, n), 1);
}

/** Les multiples de `pas` compris entre `min` et `max`, par ordre croissant. */
function multiples(pas, min, max) {
  const valeurs = [];
  if (!(pas > 0) || !Number.isFinite(max)) return valeurs;
  for (let v = pas; v <= max; v += pas) if (v >= min) valeurs.push(v);
  return valeurs;
}

/**
 * `n` éléments tirés au hasard, dans leur ordre d'origine. Sans nombre (null, 0), ou si `n` couvre
 * tout le contenu, on les garde tous. Rend toujours une nouvelle liste.
 */
export function choisirElements(elements, n, hasard = Math.random) {
  if (!n || n < 1 || n >= elements.length) return [...elements];
  const gardes = new Set(melanger(elements.keys(), hasard).slice(0, n));
  return elements.filter((_, i) => gardes.has(i));
}

/**
 * Liste croissante des nombres d'éléments (entre `min` et `max`) pour lesquels chacun passe autant
 * de fois ; vide si le jeu est collectif, s'il y a moins de deux joueurs, ou si aucun nombre ne
 * convient. En équipes, à défaut d'un nombre où chacun passe autant dans son équipe, on garde
 * ceux où chaque équipe passe autant.
 */
export function valeursEquitables({
  tour,
  joueurs = 0,
  equipes = [],
  parTour = 1,
  min = 1,
  max = Infinity,
}) {
  if (joueurs < 2 || (tour !== 'individuel' && tour !== 'binome')) return [];
  const tailles = equipes.map(effectif);

  if (tour === 'individuel') {
    const nombreEquipes = tailles.length;
    if (nombreEquipes < 2) return multiples(joueurs, min, max);
    // Équipes chacune leur tour, membres à tour de rôle : tout juste quand chaque équipe a passé
    // un multiple de son effectif de fois
    const justes = multiples(nombreEquipes * ppcm(tailles.filter(Boolean)), min, max);
    return justes.length ? justes : multiples(nombreEquipes, min, max);
  }

  // Binôme : B binômes occupent 2B places, réparties entre les joueurs
  const unite = (n) => (n % 2 === 0 ? n / 2 : n);
  const enBinomes = (valeurs) =>
    valeurs.map((b) => b * parTour).filter((v) => v >= min && v <= max);
  const jouables = tailles.filter((t) => t >= 2);
  if (!jouables.length) {
    const nombreMax = Math.ceil(max / parTour);
    return enBinomes(multiples(unite(joueurs), 1, nombreMax));
  }
  const nombreMax = Math.ceil(max / parTour);
  const parEquipe = (pas) =>
    multiples(pas, 1, Math.ceil(nombreMax / jouables.length)).map((b) => b * jouables.length);
  const justes = enBinomes(parEquipe(ppcm(jouables.map(unite))));
  return justes.length ? justes : enBinomes(parEquipe(1));
}

/**
 * Jeu en binômes : quand aucun nombre d'éléments n'est équitable avec `parTour` éléments par tour
 * (7 joueurs, 2 mots par binôme : 14 mots, plus que les 10 du contenu), cherche la plus grande
 * valeur plus petite du réglage (de `parTour − 1` jusqu'à `parTourMin`) qui en donne au moins un.
 * `min` peut être une fonction de `parTour` (le plus petit nombre joué dépend de la taille du
 * tour). Rend { parTour, valeurs } (valeurs équitables, croissantes), ou null s'il n'y en a pas.
 */
export function parTourEquitable({
  joueurs = 0,
  equipes = [],
  parTour,
  parTourMin = 1,
  min = 1,
  max = Infinity,
}) {
  for (let candidat = parTour - 1; candidat >= Math.max(1, parTourMin); candidat--) {
    const valeurs = valeursEquitables({
      tour: 'binome',
      joueurs,
      equipes,
      parTour: candidat,
      min: typeof min === 'function' ? min(candidat) : min,
      max,
    });
    if (valeurs.length) return { parTour: candidat, valeurs };
  }
  return null;
}

/** Valeur proposée au départ : la plus grande valeur équitable (≤ max), sinon `max`. */
export function valeurProposee(valeurs, max) {
  const possibles = valeurs.filter((v) => v <= max);
  return possibles.length ? possibles[possibles.length - 1] : max;
}

/** La valeur équitable la plus proche de `nombre` (la plus petite à égalité), ou null. */
export function valeurLaPlusProche(valeurs, nombre) {
  let meilleure = null;
  for (const v of valeurs) {
    if (meilleure === null || Math.abs(v - nombre) < Math.abs(meilleure - nombre)) meilleure = v;
  }
  return meilleure;
}

const cleBinome = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/**
 * Les binômes d'un bloc : une permutation `ordre` des joueurs, découpée par deux. Avec un nombre
 * pair de joueurs, un bloc est un tour complet (chacun une fois) ; avec un nombre impair, la suite
 * est répétée deux fois (chacun deux fois, un binôme par arête du cercle des joueurs).
 */
function bloc(ordre) {
  const places = ordre.length % 2 === 0 ? ordre : [...ordre, ...ordre];
  const binomes = [];
  for (let i = 0; i < places.length; i += 2) binomes.push([places[i], places[i + 1]]);
  return binomes;
}

/**
 * Remet les binômes dans le bon sens : chacun alterne les deux places (`[a, b]` : a joue le
 * premier rôle). On retourne un binôme tant que cela équilibre mieux « premier » et « second ».
 */
function orienter(plan) {
  const solde = new Map();
  const de = (nom) => solde.get(nom) ?? 0;
  for (const [a, b] of plan) {
    solde.set(a, de(a) + 1);
    solde.set(b, de(b) - 1);
  }
  for (let tour = 0; tour < 20; tour++) {
    let change = false;
    for (const binome of plan) {
      const [a, b] = binome;
      // Retourner ce binôme fait passer a de +1 à −1 et b de −1 à +1 : gain si a − b ≥ 2
      if (de(a) - de(b) >= 2) {
        binome.reverse();
        solde.set(a, de(a) - 2);
        solde.set(b, de(b) + 2);
        change = true;
      }
    }
    if (!change) break;
  }
  return plan;
}

/**
 * `nombre` binômes `[a, b]` tirés parmi les joueurs : chacun passe autant de fois (à un près),
 * jamais deux fois de suite le même binôme, pas de binôme répété tant qu'on peut l'éviter, et
 * chacun alterne les deux places (a joue le premier rôle).
 */
export function planBinomes(joueurs, nombre, hasard = Math.random) {
  const noms = [...new Set(joueurs)];
  if (noms.length < 2 || !(nombre > 0)) return [];
  const plan = [];
  const dejaVus = new Map();
  const ESSAIS = 60;
  while (plan.length < nombre) {
    const precedent = plan[plan.length - 1];
    let meilleur = null;
    let meilleurScore = Infinity;
    for (let essai = 0; essai < ESSAIS && meilleurScore > 0; essai++) {
      const candidat = bloc(melanger(noms, hasard)).slice(0, nombre - plan.length);
      let score = 0;
      for (const [a, b] of candidat) score += dejaVus.get(cleBinome(a, b)) ?? 0;
      if (precedent) {
        const [a, b] = candidat[0];
        if (cleBinome(a, b) === cleBinome(...precedent)) score += 1000;
        else if (precedent.includes(a) || precedent.includes(b)) score += 0.5;
      }
      if (score < meilleurScore) {
        meilleur = candidat;
        meilleurScore = score;
      }
    }
    for (const [a, b] of meilleur) {
      const cle = cleBinome(a, b);
      dejaVus.set(cle, (dejaVus.get(cle) ?? 0) + 1);
    }
    plan.push(...meilleur.map((binome) => [...binome]));
  }
  return orienter(plan);
}

/** Les équipes d'au moins deux joueurs : seules elles forment des binômes. */
function equipesJouables(equipes) {
  return equipes.filter((e) => e.membres.length >= 2);
}

/**
 * Plan des binômes en équipes : `nombre` binômes, les équipes d'au moins deux joueurs jouant
 * chacune leur tour ; chaque équipe a son propre plan. Rend [{ equipe, binome }] dans l'ordre de
 * passage (vide sans équipe jouable).
 */
export function planBinomesParEquipe(equipes, nombre, hasard = Math.random) {
  const jouables = equipesJouables(equipes);
  if (!jouables.length || !(nombre > 0)) return [];
  const plans = jouables.map((equipe, t) => {
    const siens = Math.floor(nombre / jouables.length) + (t < nombre % jouables.length ? 1 : 0);
    return planBinomes(equipe.membres, siens, hasard);
  });
  return Array.from({ length: nombre }, (_, i) => ({
    equipe: jouables[i % jouables.length],
    binome: plans[i % jouables.length][Math.floor(i / jouables.length)],
  }));
}

/**
 * « Tirer au sort » : un binôme tiré parmi ceux qui restent à jouer (de `position` à la fin, de la
 * même équipe : `equipe` d'une entrée du plan, ou absente), échangé avec celui prévu à `position`.
 * Le plan reste complet : chacun passe autant de fois. Rend le plan (modifié sur place).
 */
export function tirerDansLePlan(plan, position, hasard = Math.random) {
  const prevu = plan[position];
  if (!prevu) return plan;
  const candidats = [];
  for (let i = position; i < plan.length; i++) {
    if ((plan[i].equipe?.id ?? null) === (prevu.equipe?.id ?? null)) candidats.push(i);
  }
  const autre = candidats[Math.floor(hasard() * candidats.length)];
  [plan[position].binome, plan[autre].binome] = [plan[autre].binome, plan[position].binome];
  return plan;
}

/** Combien de fois chacun passe quand `places` places sont réparties entre `n` joueurs. */
function repartition(places, n) {
  const base = Math.floor(places / n);
  const reste = places % n;
  return Array.from({ length: n }, (_, i) => base + (i < reste ? 1 : 0));
}

/**
 * Bilan des passages pour la ligne d'aide de l'accueil :
 * { unites, equitable, passages, moins, parEquipe }
 *   - unites : nombre de tours (éléments, ou binômes) ;
 *   - equitable : chacun passe autant de fois ;
 *   - passages : combien de fois passe chacun (le plus souvent, si ce n'est pas égal) ;
 *   - moins : ceux qui passent une fois de moins (leurs prénoms en individuel, leur nombre en
 *     binôme, où le plan se fait au lancement) ;
 *   - parEquipe : chaque équipe passe autant de fois.
 * Paramètres : `nombre` d'éléments joués, `parTour`, `joueurs` (nombre de joueurs, binôme),
 * `ordre` (ordre de passage, répété autant que nécessaire : individuel), `equipes`.
 */
export function bilanPassages({
  tour,
  nombre,
  parTour = 1,
  joueurs = 0,
  ordre = [],
  equipes = [],
}) {
  if (tour !== 'individuel' && tour !== 'binome') {
    return { unites: nombre, equitable: true, passages: null, moins: [], parEquipe: true };
  }

  if (tour === 'individuel') {
    const noms = [...new Set(ordre)];
    if (!noms.length) {
      return { unites: nombre, equitable: true, passages: null, moins: [], parEquipe: true };
    }
    const comptes = new Map(noms.map((nom) => [nom, 0]));
    for (let i = 0; i < nombre; i++) {
      const nom = ordre[i % ordre.length];
      comptes.set(nom, comptes.get(nom) + 1);
    }
    const valeurs = [...comptes.values()];
    const haut = Math.max(...valeurs);
    const bas = Math.min(...valeurs);
    const parEquipe = equipes.length
      ? new Set(
          equipes.map((e) => e.membres.reduce((somme, m) => somme + (comptes.get(m) ?? 0), 0)),
        ).size === 1
      : bas === haut;
    return {
      unites: nombre,
      equitable: bas === haut,
      passages: haut,
      moins: bas === haut ? [] : noms.filter((nom) => comptes.get(nom) === bas),
      parEquipe,
    };
  }

  const binomes = Math.ceil(nombre / parTour);
  const tailles = equipes.map(effectif).filter((t) => t >= 2);
  if (!tailles.length) {
    if (joueurs < 2) {
      return { unites: binomes, equitable: true, passages: null, moins: 0, parEquipe: true };
    }
    const comptes = repartition(2 * binomes, joueurs);
    const haut = Math.max(...comptes);
    const bas = Math.min(...comptes);
    return {
      unites: binomes,
      equitable: haut === bas,
      passages: haut,
      moins: comptes.filter((c) => c === bas && bas !== haut).length,
      parEquipe: true,
    };
  }
  // En équipes : chaque équipe joue floor ou ceil(binomes / équipes) binômes
  const parEquipeBinomes = tailles.map((_, t) => repartitionEquipe(binomes, tailles.length, t));
  const memeNombre = new Set(parEquipeBinomes).size === 1;
  const comptes = tailles.map((taille, t) => repartition(2 * parEquipeBinomes[t], taille));
  const tous = comptes.flat();
  const haut = Math.max(...tous);
  const bas = Math.min(...tous);
  const justeDansChaqueEquipe = comptes.every((c) => Math.max(...c) === Math.min(...c));
  return {
    unites: binomes,
    equitable: memeNombre && justeDansChaqueEquipe,
    passages: haut === bas ? haut : null,
    moins: tous.filter((c) => c === bas && bas !== haut).length,
    parEquipe: memeNombre,
  };
}

function repartitionEquipe(binomes, equipes, t) {
  return Math.floor(binomes / equipes) + (t < binomes % equipes ? 1 : 0);
}
