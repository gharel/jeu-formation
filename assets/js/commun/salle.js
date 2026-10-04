/**
 * Plan de salle : dispositions (en U, salle de classe, îlots, réunion) et placement des
 * participants. Fonctions pures, sauf charger/enregistrer qui passent par stockage.js.
 *
 * La salle mesure 100 × 70 (unités carrées), l'écran et l'animateur sont en haut.
 * Une place : { id: 'p1', numero: 1, x, y, groupe, inverse } (x, y = centre ; inverse : la table
 * est en dessous, l'avatar se met donc en bas, côté table). Toutes les places d'une
 * disposition ont la même taille { l, h }, carrée : un avatar et un prénom.
 * Une table : { x, y, l, h, forme: 'rect' | 'arrondie' | 'u', libelle, epaisseur } (libellé
 * facultatif : « Îlot 2 » ; épaisseur des branches pour la table en U).
 *
 * Le plan enregistré : { disposition, nombre, parIlot, places: { p1: 'ana', … } }.
 * `nombre` vaut null tant que l'animateur ne l'a pas saisi : la salle suit alors la taille du
 * groupe (de 1 à 12 places). Les prénoms sont rangés en minuscules, comme les infos.
 */
import { lire, ecrire } from './stockage.js';
import { melanger as melangerListe } from './hasard.js';

const CLE = 'plan-salle';
export const LARGEUR = 100;
export const HAUTEUR = 70;
/** Bas de l'écran dessiné en haut de la salle : aucune place au-dessus. */
export const HAUT_SALLE = 8;
export const PLACES_PAR_DEFAUT_MAX = 12;
export const PLACES_MAX = 30;
export const PAR_ILOT = [4, 5, 6];

export const DISPOSITIONS = [
  { valeur: 'u', libelle: 'En U', icone: 'u' },
  { valeur: 'classe', libelle: 'Salle de classe', icone: 'chalkboard-user' },
  { valeur: 'ilots', libelle: 'Îlots', icone: 'people-group' },
  { valeur: 'cercle', libelle: 'Réunion', icone: 'circle-notch' },
];

const cle = (prenom) => String(prenom).toLocaleLowerCase('fr');

/** Côté d'une place (carrée : un avatar et un prénom) quand il y a de la place. */
const PLACE = 13;
/** Espace entre deux places voisines d'une même table. */
const ECART = 1.5;
/** Espace entre le bord d'une place et sa table. */
const BORD = 1.5;
/** Diamètre de l'avatar dans sa place (--d de composants.css : 56 % du côté). */
const AVATAR = 0.56;

/**
 * Distance entre une table et une place posée au-dessus ou en dessous. Sur le côté d'une table,
 * l'avatar est centré dans sa place : il est à BORD + (marge latérale de la place) de la table.
 * Au-dessus ou en dessous, l'avatar touche le bord de sa place : on ajoute cette même marge,
 * pour que l'écart entre l'avatar et la table soit partout le même.
 */
const espaceTable = (cote) => BORD + (cote * (1 - AVATAR)) / 2;

/**
 * n positions centrées sur le milieu de [debut, fin], espacées de `pasMax` au plus
 * (une seule : au milieu). Renvoie aussi le pas obtenu.
 */
function centrer(n, debut, fin, pasMax) {
  const pas = n > 1 ? Math.min((fin - debut) / (n - 1), pasMax) : pasMax;
  const premier = (debut + fin) / 2 - (pas * (n - 1)) / 2;
  return { positions: Array.from({ length: Math.max(n, 0) }, (_, i) => premier + i * pas), pas };
}

/**
 * Réduit la taille des places (sans changer leurs proportions) pour qu'aucune n'en chevauche
 * une autre : deux places doivent être séparées en largeur ou en hauteur.
 */
function sansChevauchement(points, taille) {
  let facteur = 1;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = Math.abs(points[i].x - points[j].x) / taille.l;
      const dy = Math.abs(points[i].y - points[j].y) / taille.h;
      facteur = Math.min(facteur, Math.max(dx, dy) * 0.96);
    }
  }
  return { l: taille.l * facteur, h: taille.h * facteur };
}

function resultat(points, cote, tables) {
  return {
    places: points.map((p, i) => ({ id: `p${i + 1}`, numero: i + 1, groupe: null, ...p })),
    taille: sansChevauchement(points, { l: cote, h: cote }),
    tables,
  };
}

// ---------- Dispositions ----------

/**
 * En U, ouvert vers l'écran : des tables à gauche, au fond et à droite, chacun assis à
 * l'extérieur du U et tourné vers le centre.
 */
function enU(n) {
  const fond = n <= 2 ? n : Math.ceil(n / 3);
  const gauche = Math.ceil((n - fond) / 2);
  const droite = n - fond - gauche;
  // Les deux colonnes partagent les mêmes hauteurs ; à droite, les places les plus basses
  // (le tour du U continue depuis le fond)
  // Beaucoup de monde : les colonnes et le fond s'étirent pour garder des places lisibles
  const colonne =
    gauche > 4 ? centrer(gauche, 13, 66, PLACE + 4) : centrer(gauche, 21, 62, PLACE + 4);
  const bas = fond > 4 ? centrer(fond, 25, 75, PLACE + 5) : centrer(fond, 29, 71, PLACE + 5);
  const cote = Math.min(
    PLACE,
    gauche > 1 ? colonne.pas * 0.9 : PLACE,
    fond > 1 ? bas.pas * 0.9 : PLACE,
  );
  const points = [
    ...colonne.positions.map((y) => ({ x: 11, y })),
    ...bas.positions.map((x) => ({ x, y: 62.5 })),
    ...colonne.positions
      .slice(gauche - droite)
      .reverse()
      .map((y) => ({ x: 89, y })),
  ];
  // Une seule table en U (épaisseur 5), ouverte vers l'écran. Son bas s'arrête à la même
  // distance des places du fond que ses côtés des places latérales (BORD, avatar centré)
  const basTable = 62.5 - cote / 2 - espaceTable(cote);
  const tables = [
    { x: 50, y: (14 + basTable) / 2, l: 62, h: basTable - 14, forme: 'u', epaisseur: 5 },
  ];
  return resultat(points, cote, tables);
}

/** Salle de classe : des rangées face à l'écran, une table devant chaque rangée. */
function enClasse(n) {
  const bureau = 4.5;
  // Le nombre de colonnes qui donne les plus grandes places, puis le moins de places vides
  let choix = null;
  for (let colonnes = 1; colonnes <= Math.min(n, 10); colonnes++) {
    const rangees = Math.ceil(n / colonnes);
    const pasX = colonnes > 1 ? Math.min(76 / (colonnes - 1), PLACE + 6) : PLACE + 6;
    // Une rangée : table, espace, place (côte + marge), puis 3 avant la table suivante
    const cote = Math.min(
      PLACE,
      pasX - ECART,
      ((58 + 3) / rangees - 3 - bureau - BORD) / (1 + (1 - AVATAR) / 2),
    );
    const vides = colonnes * rangees - n;
    const mieux =
      !choix ||
      cote > choix.cote + 0.01 ||
      (Math.abs(cote - choix.cote) <= 0.01 && vides < choix.vides);
    if (mieux) choix = { colonnes, rangees, pasX, cote, vides };
  }
  const { colonnes, rangees, pasX, cote } = choix;
  const rangee = bureau + espaceTable(cote) + cote;
  const hauteur = rangees * rangee + (rangees - 1) * 3;
  const debut = 11 + (58 - hauteur) / 2;
  const points = [];
  const tables = [];
  for (let r = 0; r < rangees; r++) {
    const haut = debut + r * (rangee + 3);
    const dans = Math.min(colonnes, n - r * colonnes);
    const { positions } = centrer(dans, 50 - pasX * 4, 50 + pasX * 4, pasX);
    for (const x of positions) {
      points.push({ x, y: haut + bureau + espaceTable(cote) + cote / 2 });
    }
    tables.push({
      x: 50,
      y: haut + bureau / 2,
      l: positions[positions.length - 1] - positions[0] + cote + 2,
      h: bureau,
      forme: 'rect',
    });
  }
  return resultat(points, cote, tables);
}

/**
 * Îlots : des tables de 4 à 6 personnes, la moitié de chaque côté. Les îlots sont répartis
 * en grille, avec le nombre de colonnes qui donne les plus grandes places.
 */
function enIlots(n, parIlot = 4) {
  const ilots = Math.ceil(n / parIlot);
  const parCote = Math.ceil(parIlot / 2);
  const table = 5;
  let grille = null;
  for (let colonnes = 1; colonnes <= ilots; colonnes++) {
    const lignes = Math.ceil(ilots / colonnes);
    const celluleX = 86 / colonnes;
    const celluleY = 58 / lignes;
    const cote = Math.min(
      PLACE,
      (celluleX - 5 - ECART * (parCote - 1)) / parCote,
      (celluleY - table - 4 - 2 * BORD) / (2 + (1 - AVATAR)),
    );
    if (!grille || cote > grille.cote + 0.01) {
      grille = { colonnes, celluleX, celluleY, cote };
    }
  }
  const { colonnes, celluleX, celluleY, cote } = grille;
  const points = [];
  const tables = [];
  for (let i = 0; i < ilots; i++) {
    const ligne = Math.floor(i / colonnes);
    const dansLigne = Math.min(colonnes, ilots - ligne * colonnes);
    const cx = 7 + celluleX * ((i % colonnes) + 0.5 + (colonnes - dansLigne) / 2);
    const cy = 11 + celluleY * (ligne + 0.5);
    const assis = Math.min(parIlot, n - i * parIlot);
    const enHaut = Math.ceil(assis / 2);
    const rangee = (combien) => centrer(combien, cx - 40, cx + 40, cote + ECART).positions;
    const decalage = table / 2 + espaceTable(cote) + cote / 2;
    // Dans le sens des aiguilles d'une montre : le côté haut de gauche à droite, puis le bas
    // Au-dessus de la table : l'avatar côté table, le prénom au-dessus (inverse)
    for (const x of rangee(enHaut)) {
      points.push({ x, y: cy - decalage, groupe: i + 1, inverse: true });
    }
    for (const x of rangee(assis - enHaut).reverse()) {
      points.push({ x, y: cy + decalage, groupe: i + 1 });
    }
    tables.push({
      x: cx,
      y: cy,
      l: parCote * (cote + ECART) - ECART + 2,
      h: table,
      forme: 'rect',
      libelle: `Îlot ${i + 1}`,
    });
  }
  return {
    places: points.map((p, i) => ({ id: `p${i + 1}`, numero: i + 1, ...p })),
    taille: sansChevauchement(points, { l: cote, h: cote }),
    tables,
  };
}

/**
 * Réunion : une table rectangulaire aux angles arrondis, des places le long des deux grands
 * côtés et, à partir de 6 personnes, une à chaque bout. Dans le sens des aiguilles d'une
 * montre : le côté haut de gauche à droite, le bout droit, le bas de droite à gauche, le bout
 * gauche.
 */
function enCercle(n) {
  const bouts = n >= 6 ? 1 : 0;
  const enHaut = Math.ceil((n - 2 * bouts) / 2);
  const enBas = n - 2 * bouts - enHaut;
  const parCote = Math.max(enHaut, 1);
  // La table et ses places tiennent dans la largeur (96) et la hauteur (11 à 69) de la salle
  const cote = Math.min(
    PLACE,
    (96 - 4 - (parCote - 1) * ECART - 2 * BORD * bouts) / (parCote + 2 * bouts),
  );
  const largeur = parCote * (cote + ECART) - ECART + 4;
  // Une table plus basse ; assez haute pour l'avatar des places en bout de table
  const hauteur = Math.max(10, bouts ? cote * AVATAR + 3 : 0);
  const [cx, cy] = [50, 40];
  const rangee = (combien) => centrer(combien, cx - 45, cx + 45, cote + ECART).positions;
  const decalageY = hauteur / 2 + espaceTable(cote) + cote / 2;
  const decalageX = largeur / 2 + BORD + cote / 2;
  // En bout de table, l'avatar (en haut de sa place) est centré sur la hauteur de la table
  const yBout = cy + (cote * (1 - AVATAR)) / 2;
  const points = [
    // Au-dessus de la table : l'avatar côté table, le prénom au-dessus (inverse)
    ...rangee(enHaut).map((x) => ({ x, y: cy - decalageY, inverse: true })),
    ...(bouts ? [{ x: cx + decalageX, y: yBout }] : []),
    ...rangee(enBas)
      .reverse()
      .map((x) => ({ x, y: cy + decalageY })),
    ...(bouts ? [{ x: cx - decalageX, y: yBout }] : []),
  ];
  const tables = [{ x: cx, y: cy, l: largeur, h: hauteur, forme: 'arrondie' }];
  return resultat(points, cote, tables);
}

const DESSINS = { u: enU, classe: enClasse, ilots: enIlots, cercle: enCercle };

/** Nombre de places : celui saisi, sinon autant que de participants (de 1 à 12). */
export function taillePourGroupe(nombreDeParticipants) {
  return Math.min(Math.max(nombreDeParticipants, 1), PLACES_PAR_DEFAUT_MAX);
}

export function nombreDePlaces(plan, participants) {
  return plan.nombre ?? taillePourGroupe(participants.length);
}

/** Places, taille des places et tables de la salle pour ce plan. */
export function dessinerSalle(plan, participants) {
  const n = nombreDePlaces(plan, participants);
  return DESSINS[plan.disposition](n, plan.parIlot);
}

// ---------- Plan : nettoyage et placement ----------

export function planVide() {
  return { disposition: 'u', nombre: null, parIlot: 4, places: {} };
}

/** Garde seulement des réglages valides (plan importé, abîmé ou d'une ancienne version). */
export function normaliserPlan(brut) {
  const plan = planVide();
  if (!brut || typeof brut !== 'object') return plan;
  if (DISPOSITIONS.some((d) => d.valeur === brut.disposition)) plan.disposition = brut.disposition;
  if (Number.isInteger(brut.nombre)) plan.nombre = Math.min(PLACES_MAX, Math.max(1, brut.nombre));
  if (PAR_ILOT.includes(brut.parIlot)) plan.parIlot = brut.parIlot;
  if (brut.places && typeof brut.places === 'object' && !Array.isArray(brut.places)) {
    for (const [id, prenom] of Object.entries(brut.places)) {
      if (/^p\d{1,2}$/.test(id) && typeof prenom === 'string' && prenom) plan.places[id] = prenom;
    }
  }
  return plan;
}

/**
 * Plan cohérent avec le groupe : seulement des places qui existent, des personnes encore là,
 * et chacune une seule fois.
 */
export function nettoyerPlan(brut, participants) {
  const plan = normaliserPlan(brut);
  const n = nombreDePlaces(plan, participants);
  const presents = new Set(participants.map(cle));
  const deja = new Set();
  const places = {};
  for (const [id, prenom] of Object.entries(plan.places)) {
    const numero = Number(id.slice(1));
    if (numero < 1 || numero > n || !presents.has(prenom) || deja.has(prenom)) continue;
    deja.add(prenom);
    places[id] = prenom;
  }
  return { ...plan, places };
}

/** Prénom (tel que saisi) assis à cette place, ou null. */
export function occupant(plan, participants, id) {
  const valeur = plan.places[id];
  return valeur ? (participants.find((p) => cle(p) === valeur) ?? null) : null;
}

export function placeDe(plan, prenom) {
  const valeur = cle(prenom);
  return Object.keys(plan.places).find((id) => plan.places[id] === valeur) ?? null;
}

/**
 * Assoit `prenom` à la place `id`. S'il était assis ailleurs, l'occupant de `id` prend son
 * ancienne place (échange) ; sinon l'occupant retourne parmi les personnes à placer.
 */
export function placer(plan, id, prenom) {
  const places = { ...plan.places };
  const ancienne = placeDe(plan, prenom);
  const voisin = places[id];
  if (ancienne) delete places[ancienne];
  if (ancienne && voisin && ancienne !== id) places[ancienne] = voisin;
  places[id] = cle(prenom);
  return { ...plan, places };
}

export function liberer(plan, id) {
  const places = { ...plan.places };
  delete places[id];
  return { ...plan, places };
}

/** Échange deux places (l'une peut être libre). */
export function echanger(plan, a, b) {
  const places = { ...plan.places };
  const [pa, pb] = [places[a], places[b]];
  delete places[a];
  delete places[b];
  if (pb) places[a] = pb;
  if (pa) places[b] = pa;
  return { ...plan, places };
}

export function nonPlaces(plan, participants) {
  const assis = new Set(Object.values(plan.places));
  return participants.filter((p) => !assis.has(cle(p)));
}

function placesLibres(plan, participants) {
  const n = nombreDePlaces(plan, participants);
  return Array.from({ length: n }, (_, i) => `p${i + 1}`).filter((id) => !plan.places[id]);
}

/** Les personnes pas encore assises prennent les places libres, dans l'ordre de la liste. */
export function placerDansLOrdre(plan, participants) {
  const places = { ...plan.places };
  const libres = placesLibres(plan, participants);
  nonPlaces(plan, participants).forEach((prenom, i) => {
    if (libres[i]) places[libres[i]] = cle(prenom);
  });
  return { ...plan, places };
}

/** Tout le monde est replacé au hasard (`hasard` : ?graine= pour des tests reproductibles). */
export function melanger(plan, participants, hasard = Math.random) {
  const n = nombreDePlaces(plan, participants);
  const places = {};
  melangerListe(participants, hasard)
    .slice(0, n)
    .forEach((prenom, i) => {
      places[`p${i + 1}`] = cle(prenom);
    });
  return { ...plan, places };
}

export function vider(plan) {
  return { ...plan, places: {} };
}

/** « Place 4 » ou « Place 4, îlot 2 ». */
export function libellePlace(plan, participants, id) {
  const place = dessinerSalle(plan, participants).places.find((p) => p.id === id);
  if (!place) return '';
  return place.groupe ? `Place ${place.numero}, îlot ${place.groupe}` : `Place ${place.numero}`;
}

// ---------- Stockage ----------

export function charger(participants) {
  return nettoyerPlan(lire(CLE, null), participants);
}

export function enregistrer(plan) {
  return ecrire(CLE, plan);
}
