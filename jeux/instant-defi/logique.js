/**
 * Règles d'Instant défi : un début générique (« 30 secondes pour trouver… ») + une fin
 * préparée par l'animateur (« … le menu pour enregistrer un fichier »).
 */

const DUREE_PAR_DEFAUT = 30;

export const AMORCES = [
  { valeur: 'trouver30', texte: '30 secondes pour trouver…' },
  { valeur: 'montrer60', texte: '1 minute pour montrer à tout le monde…' },
  { valeur: 'expliquer20', texte: '20 secondes pour expliquer…' },
  { valeur: 'retrouver45', texte: '45 secondes pour retrouver…' },
];

export const OPTIONS_AMORCE = [
  ...AMORCES.map((a) => ({ valeur: a.valeur, libelle: a.texte })),
  { valeur: 'surprise', libelle: 'Surprise : un début tiré au hasard' },
  { valeur: 'perso', libelle: 'Autre : j’écris mon propre début' },
];

/** Nombres écrits en lettres, des plus longs aux plus courts (« quarante-cinq » avant « cinq »). */
const NOMBRES_EN_LETTRES = [
  ['quatre-vingt-dix', 90],
  ['quarante-cinq', 45],
  ['soixante', 60],
  ['cinquante', 50],
  ['quarante', 40],
  ['trente', 30],
  ['vingt', 20],
  ['quinze', 15],
  ['douze', 12],
  ['onze', 11],
  ['dix', 10],
  ['neuf', 9],
  ['huit', 8],
  ['sept', 7],
  ['six', 6],
  ['cinq', 5],
  ['quatre', 4],
  ['trois', 3],
  ['deux', 2],
  ['une', 1],
  ['un', 1],
].map(([mot, n]) => [new RegExp(`(?<![\\p{L}-])${mot}(?![\\p{L}-])`, 'gu'), String(n)]);

/** « deux minutes » → « 2 minutes » : un mot entier seulement (« dixième », « unique » restent). */
function enChiffres(texte) {
  return NOMBRES_EN_LETTRES.reduce((t, [mot, n]) => t.replace(mot, n), texte);
}

/**
 * Durée du chrono lue dans le texte : « 30 secondes », « 45 s », « 1 minute », « 2 min »,
 * « 1 min 30 », et en lettres : « Une minute », « Deux minutes et demie », « Quinze secondes ».
 * Sans durée lisible, on prend la valeur par défaut.
 */
export function dureeDepuisAmorce(texte) {
  const t = enChiffres(String(texte ?? '').toLowerCase());
  const demie = t.match(/(\d+)\s*(?:minutes?|min|mn)\s+et\s+demie?\b/);
  if (demie) return Number(demie[1]) * 60 + 30;
  const minutes = t.match(/(\d+)\s*(?:minutes?|min|mn)\b\s*(\d+)?/);
  if (minutes) return Number(minutes[1]) * 60 + Number(minutes[2] ?? 0);
  const secondes = t.match(/(\d+)\s*(?:s|sec|secondes?)\b/);
  if (secondes) return Number(secondes[1]);
  return DUREE_PAR_DEFAUT;
}

/** Assemble le défi : « 30 secondes pour trouver » + « le menu… », sans les points de suspension. */
export function formulerDefi(amorce, fin) {
  const debut = String(amorce ?? '')
    .trim()
    .replace(/(\.\.\.|…)\s*$/, '')
    .trim();
  const suite = String(fin ?? '')
    .trim()
    .replace(/^(\.\.\.|…)\s*/, '')
    .trim();
  return `${debut} ${suite}`.trim();
}

/** Début et durée d'un défi préparé. « Surprise » tire un début au hasard. */
export function resoudreDefi(element, hasard = Math.random) {
  let texteAmorce;
  if (element.amorce === 'perso') {
    texteAmorce = element.amorcePerso;
  } else if (element.amorce === 'surprise') {
    texteAmorce = AMORCES[Math.floor(hasard() * AMORCES.length)].texte;
  } else {
    texteAmorce = (AMORCES.find((a) => a.valeur === element.amorce) ?? AMORCES[0]).texte;
  }
  return {
    texte: formulerDefi(texteAmorce, element.fin),
    duree: dureeDepuisAmorce(texteAmorce),
  };
}

/** Vérification d'un défi préparé (message ou null). */
export function validerDefi(element) {
  if (element.amorce === 'perso' && !String(element.amorcePerso ?? '').trim()) {
    return 'écrivez le début du défi, ou choisissez-en un dans la liste.';
  }
  return null;
}
