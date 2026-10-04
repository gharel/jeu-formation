/**
 * Liste des prénoms partagée par tous les jeux, et une info facultative par personne
 * (sa passion, son film préféré, son dessert…) pour briser la glace.
 * Les fonctions de manipulation sont pures ; charger/enregistrer passent par stockage.js.
 */
import { lire, ecrire } from './stockage.js';

const CLE = 'participants';
const CLE_INFOS = 'infos-participants';
const CLE_ABSENTS = 'absents';
const CLE_NOM = 'nom-groupe';
export const LONGUEUR_MAX = 30;
export const NOMBRE_MAX = 60;
export const LONGUEUR_INFO = 60;
export const LONGUEUR_NOM = 80;

export const THEMES = [
  { valeur: 'passion', libelle: 'Passion', icone: 'heart' },
  { valeur: 'loisir', libelle: 'Loisir', icone: 'puzzle-piece' },
  { valeur: 'film', libelle: 'Film préféré', icone: 'film' },
  { valeur: 'musique', libelle: 'Musique préférée', icone: 'music' },
  { valeur: 'dessert', libelle: 'Dessert préféré', icone: 'ice-cream' },
  { valeur: 'plat', libelle: 'Plat préféré', icone: 'utensils' },
  { valeur: 'voyage', libelle: 'Destination de rêve', icone: 'plane' },
  { valeur: 'animal', libelle: 'Animal préféré', icone: 'paw' },
  { valeur: 'autre', libelle: 'Autre', icone: 'star' },
];

/** Nettoie un prénom saisi : espaces superflus retirés, longueur limitée. */
export function normaliserPrenom(texte) {
  return String(texte ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGUEUR_MAX);
}

function cleComparaison(prenom) {
  return prenom.toLocaleLowerCase('fr');
}

/** Ajoute un ou plusieurs prénoms (séparés par des virgules, points-virgules ou retours à la ligne). */
export function ajouter(liste, saisie) {
  const resultat = [...liste];
  const connus = new Set(resultat.map(cleComparaison));
  for (const morceau of String(saisie ?? '').split(/[,;\n]/)) {
    const prenom = normaliserPrenom(morceau);
    if (!prenom || connus.has(cleComparaison(prenom)) || resultat.length >= NOMBRE_MAX) continue;
    connus.add(cleComparaison(prenom));
    resultat.push(prenom);
  }
  return resultat;
}

/** Initiales pour un avatar : « A » pour Ana, « JP » pour Jean-Paul, « ML » pour Marie Laure. */
export function initiales(prenom) {
  const morceaux = normaliserPrenom(prenom)
    .split(/[\s'’-]+/)
    .filter(Boolean);
  if (!morceaux.length) return '?';
  return morceaux
    .slice(0, 2)
    .map((m) => [...m][0])
    .join('')
    .toLocaleUpperCase('fr');
}

export function retirer(liste, prenom) {
  return liste.filter((p) => cleComparaison(p) !== cleComparaison(prenom));
}

export function charger() {
  const liste = lire(CLE, []);
  if (!Array.isArray(liste)) return [];
  return ajouter([], liste.filter((p) => typeof p === 'string').join('\n'));
}

export function enregistrer(liste) {
  return ecrire(CLE, liste);
}

// ---------- Infos sur les participants ----------

export function themeDe(valeur) {
  return THEMES.find((t) => t.valeur === valeur) ?? THEMES[THEMES.length - 1];
}

/** Info nettoyée { theme, texte }, ou null si le texte est vide. */
export function normaliserInfo(info) {
  const texte = String(info?.texte ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGUEUR_INFO);
  if (!texte) return null;
  return { theme: themeDe(info.theme).valeur, texte };
}

/** Renvoie de nouvelles infos où celle de `prenom` est remplacée (ou retirée si vide). */
export function definirInfo(infos, prenom, info) {
  const copie = { ...infos };
  const propre = normaliserInfo(info);
  if (propre) copie[cleComparaison(prenom)] = propre;
  else delete copie[cleComparaison(prenom)];
  return copie;
}

export function infoDe(infos, prenom) {
  return infos[cleComparaison(prenom)] ?? null;
}

/** « Dessert préféré : le tiramisu » */
export function decrireInfo(info) {
  return info ? `${themeDe(info.theme).libelle} : ${info.texte}` : '';
}

/** Ne garde que les infos des personnes encore dans la liste. */
export function garderInfos(infos, liste) {
  const gardes = new Set(liste.map(cleComparaison));
  return Object.fromEntries(Object.entries(infos).filter(([cle]) => gardes.has(cle)));
}

export function chargerInfos() {
  const brut = lire(CLE_INFOS, {});
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {};
  const infos = {};
  for (const [cle, info] of Object.entries(brut)) {
    const propre = normaliserInfo(info);
    if (propre) infos[cleComparaison(normaliserPrenom(cle))] = propre;
  }
  return infos;
}

export function enregistrerInfos(infos) {
  return ecrire(CLE_INFOS, infos);
}

// ---------- Absences du jour ----------
// Une personne absente reste dans le groupe (et sur le plan), mais ne joue pas et la roue ne
// la tire pas. Les absences sont gardées jusqu'au retour de la personne (formation sur
// plusieurs jours).

/** Absences (prénoms en minuscules) des personnes encore dans la liste, sans doublon. */
export function garderAbsents(absents, liste) {
  const presentes = new Set(liste.map(cleComparaison));
  return [...new Set(absents.map((a) => cleComparaison(String(a))))].filter((a) =>
    presentes.has(a),
  );
}

export function estAbsent(absents, prenom) {
  return absents.includes(cleComparaison(prenom));
}

/** Marque la personne absente, ou de nouveau présente si elle l'était. */
export function basculerAbsent(absents, prenom) {
  const cle = cleComparaison(prenom);
  return absents.includes(cle) ? absents.filter((a) => a !== cle) : [...absents, cle];
}

/** Les personnes présentes aujourd'hui, dans l'ordre de la liste. */
export function presents(liste, absents) {
  return liste.filter((p) => !estAbsent(absents, p));
}

export function chargerAbsents(liste) {
  const brut = lire(CLE_ABSENTS, []);
  if (!Array.isArray(brut)) return [];
  return garderAbsents(
    brut.filter((a) => typeof a === 'string'),
    liste,
  );
}

export function enregistrerAbsents(absents) {
  return ecrire(CLE_ABSENTS, absents);
}

// ---------- Nom du groupe ----------
// Facultatif : « Google Sheets, mairie, octobre ». Il nomme aussi le fichier du groupe exporté.

export function normaliserNom(texte) {
  return String(texte ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGUEUR_NOM);
}

export function chargerNom() {
  const brut = lire(CLE_NOM, '');
  return typeof brut === 'string' ? normaliserNom(brut) : '';
}

export function enregistrerNom(nom) {
  return ecrire(CLE_NOM, nom);
}
