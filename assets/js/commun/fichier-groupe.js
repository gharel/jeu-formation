/**
 * Le groupe dans un fichier JSON, lisible et modifiable à la main : nom, prénoms, infos,
 * absences, disposition de la salle et places. Fonctions pures (export et lecture d'un import).
 *
 * {
 *   format: 'skazy-jeux-groupe', version: 1, exporteLe: '…',
 *   groupe: {
 *     nom: 'Google Sheets, mairie',
 *     salle: { disposition: 'u' | 'classe' | 'ilots' | 'cercle', nombreDePlaces: 12 | null, parIlot: 4 },
 *     participants: [
 *       { prenom: 'Ana', info: { theme: 'dessert', texte: 'le tiramisu' }, place: 1 },
 *       { prenom: 'Bob', absent: true },
 *       'Chloé',                                   // un prénom seul suffit
 *     ],
 *   },
 * }
 * `nombreDePlaces: null` : la salle suit la taille du groupe. `place` : numéro affiché sur le plan.
 * À l'import, l'info peut être un simple texte (thème « Autre »).
 */
import { FORMAT, FORMAT_DONNEES } from './contenu.js';
import {
  ajouter,
  normaliserPrenom,
  normaliserNom,
  definirInfo,
  infoDe,
  estAbsent,
  NOMBRE_MAX,
} from './participants.js';
import { DISPOSITIONS, normaliserPlan, nombreDePlaces, placeDe } from './salle.js';

export const FORMAT_GROUPE = 'skazy-jeux-groupe';
export const VERSION_GROUPE = 1;

/** Fichier du groupe : `groupe` a les mêmes propriétés que creerGroupe() (nom, participants…). */
export function preparerExportGroupe(groupe, maintenant = new Date()) {
  const { nom, participants, infos, absents, plan } = groupe;
  return {
    format: FORMAT_GROUPE,
    version: VERSION_GROUPE,
    exporteLe: maintenant.toISOString(),
    groupe: {
      nom,
      salle: { disposition: plan.disposition, nombreDePlaces: plan.nombre, parIlot: plan.parIlot },
      participants: participants.map((prenom) => {
        const entree = { prenom };
        const info = infoDe(infos, prenom);
        if (info) entree.info = { theme: info.theme, texte: info.texte };
        const place = placeDe(plan, prenom);
        if (place) entree.place = Number(place.slice(1));
        if (estAbsent(absents, prenom)) entree.absent = true;
        return entree;
      }),
    },
  };
}

/** Nombre entier lu dans le fichier (numéro de place…) : 3 ou « 3 » ; null sinon. */
function numeroDePlace(valeur) {
  if (Number.isInteger(valeur)) return valeur;
  if (typeof valeur === 'string' && /^\s*\d{1,3}\s*$/.test(valeur)) return Number(valeur);
  return null;
}

/**
 * Lit un fichier de groupe. Renvoie { nom, participants, infos, absents, plan, avertissements }
 * prêt pour groupe.remplacer(). Les avertissements disent ce qui a été ignoré (doublon, place
 * inexistante ou déjà prise…). Lève une erreur au message lisible si le fichier ne convient pas.
 */
export function lireImportGroupe(contenuFichier) {
  let donnees;
  try {
    donnees = JSON.parse(contenuFichier);
  } catch {
    throw new Error('Ce fichier n’est pas un groupe valide (JSON illisible).');
  }
  if (donnees?.format === FORMAT || donnees?.format === FORMAT_DONNEES) {
    throw new Error(
      'Ce fichier contient le contenu des jeux, pas un groupe : importez-le sur la page « Les contenus ».',
    );
  }
  // Un fichier écrit à la main peut se passer de « format » et de l'enveloppe « groupe »
  let source = null;
  if (donnees?.format === FORMAT_GROUPE) source = donnees.groupe;
  else if (donnees && typeof donnees === 'object' && !('format' in donnees)) {
    source = donnees.groupe ?? donnees;
  }
  if (!source || typeof source !== 'object' || !Array.isArray(source.participants)) {
    throw new Error('Ce fichier n’est pas un groupe des mini-jeux Skazy Formation.');
  }

  const avertissements = [];
  let participants = [];
  let infos = {};
  const absents = [];
  const placesVoulues = [];
  for (const brut of source.participants) {
    const entree = typeof brut === 'string' ? { prenom: brut } : brut;
    if (!entree || typeof entree !== 'object') continue;
    // Une virgule séparerait deux prénoms (voir ajouter()) : on la remplace par une espace
    const prenom = normaliserPrenom(String(entree.prenom ?? '').replace(/[,;\n]/g, ' '));
    if (!prenom) continue;
    const avant = participants.length;
    participants = ajouter(participants, prenom);
    if (participants.length === avant) {
      const deja = participants.find(
        (p) => p.toLocaleLowerCase('fr') === prenom.toLocaleLowerCase('fr'),
      );
      if (deja) avertissements.push(`${deja} apparaît deux fois : le doublon est ignoré.`);
      continue;
    }
    const info =
      typeof entree.info === 'string' ? { theme: 'autre', texte: entree.info } : entree.info;
    if (info) infos = definirInfo(infos, prenom, info);
    if (entree.absent === true) absents.push(prenom.toLocaleLowerCase('fr'));
    if (entree.place !== undefined && entree.place !== null && entree.place !== '') {
      placesVoulues.push({ prenom, place: entree.place });
    }
  }
  if (source.participants.length > NOMBRE_MAX && participants.length === NOMBRE_MAX) {
    avertissements.push(`Seuls les ${NOMBRE_MAX} premiers participants sont gardés.`);
  }

  const salle = source.salle && typeof source.salle === 'object' ? source.salle : {};
  let plan = normaliserPlan({
    disposition: salle.disposition,
    nombre: numeroDePlace(salle.nombreDePlaces),
    parIlot: numeroDePlace(salle.parIlot),
  });
  if (salle.disposition !== undefined && salle.disposition !== plan.disposition) {
    const connues = DISPOSITIONS.map((d) => d.valeur).join(', ');
    avertissements.push(
      `Disposition « ${salle.disposition} » inconnue (${connues}) : la salle est en U.`,
    );
  }
  const n = nombreDePlaces(plan, participants);
  for (const { prenom, place } of placesVoulues) {
    const numero = numeroDePlace(place);
    if (numero === null) {
      avertissements.push(`Place « ${place} » de ${prenom} ignorée : un numéro est attendu.`);
      continue;
    }
    if (numero < 1 || numero > n) {
      avertissements.push(
        `Place ${numero} de ${prenom} ignorée : la salle a ${n} place${n > 1 ? 's' : ''}.`,
      );
      continue;
    }
    if (plan.places[`p${numero}`]) {
      avertissements.push(`Place ${numero} déjà prise : ${prenom} reste à placer.`);
      continue;
    }
    plan = { ...plan, places: { ...plan.places, [`p${numero}`]: prenom.toLocaleLowerCase('fr') } };
  }

  return {
    nom: normaliserNom(source.nom),
    participants,
    infos,
    absents,
    plan,
    avertissements,
  };
}
