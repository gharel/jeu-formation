/**
 * Suivi de la formation : des notes pour savoir où l'on en est avec le groupe, d'une séance à
 * l'autre. La diapositive où il s'est arrêté, et les logiciels vus ensemble.
 *
 * { diapositive: 'Diapo 42, les tableaux croisés', logiciels: ['Google Sheets', 'Excel'] }
 *
 * Les notes suivent le groupe (groupe.js) : fichier JSON, groupes récents. Fonctions pures, sauf
 * charger/enregistrer qui passent par stockage.js.
 */
import { lire, ecrire, effacer } from './stockage.js';

const CLE_SUIVI = 'suivi-groupe';
export const LONGUEUR_DIAPOSITIVE = 120;
export const LONGUEUR_LOGICIEL = 40;
export const NOMBRE_LOGICIELS_MAX = 40;

const cle = (nom) => nom.toLocaleLowerCase('fr');

/** Un texte court sur une ligne ; un nombre du fichier JSON (« 42 ») est accepté. */
function texteCourt(valeur, longueur) {
  if (typeof valeur !== 'string' && typeof valeur !== 'number') return '';
  return String(valeur).replace(/\s+/g, ' ').trim().slice(0, longueur);
}

/** « Diapo 42 » : la diapositive où le groupe s'est arrêté, '' si elle n'est pas notée. */
export function normaliserDiapositive(valeur) {
  return texteCourt(valeur, LONGUEUR_DIAPOSITIVE);
}

/**
 * Ajoute des logiciels à la liste : un texte (« Word, Excel », un par ligne) ou une liste. Un
 * logiciel déjà noté, quelles que soient ses majuscules, n'est pas ajouté deux fois. Renvoie
 * { liste, ajouts } : la nouvelle liste et les noms vraiment ajoutés.
 */
export function ajouterLogiciels(liste, saisie) {
  const noms = Array.isArray(saisie) ? saisie : String(saisie ?? '').split(/[,;\n]/);
  const nouvelle = [...liste];
  const connus = new Set(nouvelle.map(cle));
  const ajouts = [];
  for (const brut of noms) {
    const nom = texteCourt(brut, LONGUEUR_LOGICIEL);
    if (!nom || connus.has(cle(nom)) || nouvelle.length >= NOMBRE_LOGICIELS_MAX) continue;
    connus.add(cle(nom));
    nouvelle.push(nom);
    ajouts.push(nom);
  }
  return { liste: nouvelle, ajouts };
}

export function retirerLogiciel(liste, nom) {
  return liste.filter((logiciel) => cle(logiciel) !== cle(nom));
}

/** Des notes lues dans le stockage ou dans un fichier : seuls les textes prévus sont gardés. */
export function normaliserSuivi(brut) {
  const source = brut && typeof brut === 'object' ? brut : {};
  return {
    diapositive: normaliserDiapositive(source.diapositive),
    logiciels: ajouterLogiciels([], Array.isArray(source.logiciels) ? source.logiciels : []).liste,
  };
}

export function estVide(suivi) {
  return !suivi?.diapositive && !suivi?.logiciels?.length;
}

/** « arrêté à : diapo 42 · 2 logiciels vus », '' sans note. */
export function decrireSuivi(suivi) {
  const { diapositive, logiciels } = normaliserSuivi(suivi);
  const morceaux = [];
  if (diapositive) morceaux.push(`arrêté à : ${diapositive}`);
  if (logiciels.length) {
    const n = logiciels.length;
    morceaux.push(`${n} logiciel${n > 1 ? 's' : ''} vu${n > 1 ? 's' : ''}`);
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
