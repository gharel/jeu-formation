/**
 * Suivi de la formation : des notes pour savoir où l'on en est avec le groupe, d'une séance à
 * l'autre. Le numéro de la diapositive où il s'est arrêté, et ce qui a été vu ensemble (logiciels,
 * notions, ce qu'il reste à reprendre), en texte libre sur quelques lignes.
 *
 * { diapositive: 42, vu: 'Google Sheets, Excel\nÀ reprendre : RECHERCHEV' }
 *
 * Premier format, encore dans des fichiers JSON et des groupes récents : un texte et une liste.
 * { diapositive: 'Diapo 42, les tableaux croisés', logiciels: ['Google Sheets', 'Excel'] }
 * normaliserSuivi() le lit sans rien perdre : le numéro est repris, le reste rejoint « vu ».
 *
 * Les notes suivent le groupe (groupe.js) : fichier JSON, groupes récents. Fonctions pures, sauf
 * charger/enregistrer qui passent par stockage.js.
 */
import { lire, ecrire, effacer } from './stockage.js';

const CLE_SUIVI = 'suivi-groupe';
export const DIAPOSITIVE_MAX = 999;
export const LONGUEUR_VU = 2000;
/** Le résumé d'une ligne (groupes récents) ne montre que le début de ce qui a été vu. */
const LONGUEUR_RESUME = 50;

const estTexte = (valeur) => typeof valeur === 'string' || typeof valeur === 'number';

/** Un texte court sur une ligne, sans espaces en trop. */
function texteCourt(valeur, longueur) {
  return estTexte(valeur) ? String(valeur).replace(/\s+/g, ' ').trim().slice(0, longueur) : '';
}

/**
 * Le numéro de la diapositive où le groupe s'est arrêté : un entier de 1 à 999 (« 42 » tapé dans
 * un fichier est accepté), null s'il n'est pas noté.
 */
export function normaliserDiapositive(valeur) {
  const nombre = typeof valeur === 'string' && /^\s*\d+\s*$/.test(valeur) ? Number(valeur) : valeur;
  return Number.isInteger(nombre) && nombre >= 1 && nombre <= DIAPOSITIVE_MAX ? nombre : null;
}

/**
 * Ce qui a été vu ensemble : un texte de quelques lignes (une liste : une ligne par élément). Les
 * retours à la ligne sont gardés, pas les espaces en fin de ligne ni les lignes vides en série.
 */
export function normaliserVu(valeur) {
  const texte = Array.isArray(valeur) ? valeur.filter(estTexte).join('\n') : valeur;
  if (!estTexte(texte)) return '';
  return String(texte)
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, LONGUEUR_VU)
    .trimEnd();
}

/** « Diapo 42, les tableaux croisés » : un numéro au début, puis le reste du texte. */
const ANCIENNE_DIAPOSITIVE =
  /^(?:(?:diapo(?:sitive)?|slide)\s*)?(?:n°\s*)?(\d+)(?=$|[\s,;:.–—-])[\s,;:.–—-]*(.*)$/i;

/**
 * Premier format : la diapositive était un texte libre. « Diapo 42, les tableaux croisés » donne
 * le numéro 42 et le reste « les tableaux croisés ». Sans numéro sûr au début (« Module 3, fin »,
 * « Diapo 1200 »), tout le texte est gardé comme reste.
 */
function lireAncienneDiapositive(texte) {
  const propre = texteCourt(texte, 200);
  const trouve = ANCIENNE_DIAPOSITIVE.exec(propre);
  const numero = trouve ? normaliserDiapositive(Number(trouve[1])) : null;
  return numero === null ? { numero: null, reste: propre } : { numero, reste: trouve[2] };
}

/** Premier format : la liste des logiciels vus devient une ligne, « Google Sheets, Excel ». */
function lireAnciensLogiciels(liste) {
  const connus = new Set();
  const noms = [];
  for (const brut of Array.isArray(liste) ? liste : []) {
    const nom = texteCourt(brut, 80);
    const cle = nom.toLocaleLowerCase('fr');
    if (!nom || connus.has(cle)) continue;
    connus.add(cle);
    noms.push(nom);
  }
  return noms.join(', ');
}

/**
 * Des notes lues dans le stockage, un fichier ou un groupe récent : seuls le numéro et le texte
 * prévus sont gardés. Des notes au premier format sont reprises en entier (voir l'en-tête).
 */
export function normaliserSuivi(brut) {
  const source = brut && typeof brut === 'object' ? brut : {};
  const lignes = [];
  let diapositive = normaliserDiapositive(source.diapositive);
  if (diapositive === null && typeof source.diapositive === 'string') {
    const ancienne = lireAncienneDiapositive(source.diapositive);
    diapositive = ancienne.numero;
    lignes.push(ancienne.reste);
  }
  lignes.push(normaliserVu(source.vu), lireAnciensLogiciels(source.logiciels));
  return { diapositive, vu: normaliserVu(lignes.filter(Boolean).join('\n')) };
}

export function estVide(suivi) {
  return !suivi?.diapositive && !suivi?.vu;
}

/** « arrêté à la diapo 42 · vu : Google Sheets, Excel ; À reprendre… », '' sans note. */
export function decrireSuivi(suivi) {
  const { diapositive, vu } = normaliserSuivi(suivi);
  const morceaux = [];
  if (diapositive) morceaux.push(`arrêté à la diapo ${diapositive}`);
  if (vu) {
    const ligne = vu.split('\n').filter(Boolean).join(' ; ');
    const debut =
      ligne.length > LONGUEUR_RESUME ? `${ligne.slice(0, LONGUEUR_RESUME).trimEnd()}…` : ligne;
    morceaux.push(`vu : ${debut}`);
  }
  return morceaux.join(' · ');
}

/* ---------- Stockage ---------- */

export function charger() {
  return normaliserSuivi(lire(CLE_SUIVI, null));
}

export function enregistrer(suivi) {
  if (estVide(suivi)) effacer(CLE_SUIVI);
  else ecrire(CLE_SUIVI, suivi);
}
