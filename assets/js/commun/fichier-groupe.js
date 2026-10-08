/**
 * Le groupe dans un fichier JSON, lisible et modifiable à la main : nom, prénoms, infos,
 * absences, disposition de la salle, places, équipes et points. Fonctions pures (export et lecture
 * d'un import).
 *
 * {
 *   format: 'skazy-jeux-groupe', version: 1, exporteLe: '…',
 *   groupe: {
 *     nom: 'Google Sheets, mairie',
 *     salle: { disposition: 'u' | 'classe' | 'ilots' | 'cercle', nombreDePlaces: 12 | null, parIlot: 4 },
 *     participants: [
 *       { prenom: 'Ana', info: { theme: 'dessert', texte: 'le tiramisu' }, place: 1,
 *         points: { motus: 3, pyramide: 2 } },             // points par jeu (scores du groupe)
 *       { prenom: 'Bob', absent: true },
 *       'Chloé',                                   // un prénom seul suffit
 *     ],
 *     equipes: [                                   // facultatif
 *       { nom: 'Les Bleus', membres: ['Ana', 'Chloé'], points: { motus: 2 } },
 *     ],
 *   },
 * }
 * `nombreDePlaces: null` : la salle suit la taille du groupe. `place` : numéro affiché sur le plan.
 * À l'import, l'info peut être un simple texte (thème « Autre ») et les points un simple nombre
 * (gardé comme une correction de l'animateur), pour une personne comme pour une équipe.
 */
import { FORMAT, FORMAT_DONNEES } from './contenu.js';
import {
  ajouterPrenoms,
  normaliserPrenom,
  normaliserNom,
  definirInfo,
  infoDe,
  estAbsent,
  NOMBRE_MAX,
} from './participants.js';
import { DISPOSITIONS, normaliserPlan, nombreDePlaces, placeDe } from './salle.js';
import { CORRECTION, normaliserScores } from './scores-groupe.js';
import { NOMBRE_EQUIPES_MAX, normaliserNomEquipe, normaliserScoresEquipes } from './equipes.js';

export const FORMAT_GROUPE = 'skazy-jeux-groupe';
export const VERSION_GROUPE = 1;

/** Fichier du groupe : `groupe` a les mêmes propriétés que creerGroupe() (nom, participants…). */
export function preparerExportGroupe(groupe, maintenant = new Date()) {
  const {
    nom,
    participants,
    infos,
    absents,
    plan,
    scores = {},
    equipes = [],
    scoresEquipes = {},
  } = groupe;
  const fichier = {
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
        const points = scores[prenom.toLocaleLowerCase('fr')];
        if (points) entree.points = { ...points };
        return entree;
      }),
    },
  };
  if (equipes.length) {
    fichier.groupe.equipes = equipes.map((equipe) => {
      const entree = {
        nom: equipe.nom,
        membres: participants.filter((p) => equipe.membres.includes(p.toLocaleLowerCase('fr'))),
      };
      if (scoresEquipes[equipe.id]) entree.points = { ...scoresEquipes[equipe.id] };
      return entree;
    });
  }
  return fichier;
}

/** Points lus dans le fichier : un détail par jeu, ou un simple nombre (une correction). */
function pointsLus(points) {
  if (typeof points === 'number' || typeof points === 'string') return { [CORRECTION]: points };
  if (points && typeof points === 'object') return points;
  return null;
}

/**
 * Équipes du fichier : chaque membre doit être dans le groupe, et dans une seule équipe.
 * Renvoie { equipes, scoresEquipes } ; ce qui est ignoré va dans les avertissements.
 */
function lireEquipes(brut, participants, avertissements) {
  const vide = { equipes: [], scoresEquipes: {} };
  if (brut === undefined || brut === null) return vide;
  if (!Array.isArray(brut)) {
    avertissements.push('Équipes ignorées : une liste d’équipes est attendue.');
    return vide;
  }
  const parCle = new Map(participants.map((p) => [p.toLocaleLowerCase('fr'), p]));
  const placees = new Map();
  const equipes = [];
  const points = {};
  for (const entree of brut) {
    if (!entree || typeof entree !== 'object') continue;
    if (equipes.length >= NOMBRE_EQUIPES_MAX) {
      avertissements.push(`Seules les ${NOMBRE_EQUIPES_MAX} premières équipes sont gardées.`);
      break;
    }
    const id = `e${equipes.length + 1}`;
    const nom = normaliserNomEquipe(entree.nom) || `Équipe ${equipes.length + 1}`;
    const membres = [];
    for (const membre of Array.isArray(entree.membres) ? entree.membres : []) {
      const saisi = normaliserPrenom(String(membre ?? ''));
      if (!saisi) continue;
      const cle = saisi.toLocaleLowerCase('fr');
      if (!parCle.has(cle)) {
        avertissements.push(
          `« ${saisi} », dans ${nom}, n’est pas dans le groupe : ce nom est ignoré.`,
        );
        continue;
      }
      if (placees.has(cle)) {
        avertissements.push(
          `${parCle.get(cle)} est déjà dans ${placees.get(cle)} : pas aussi dans ${nom}.`,
        );
        continue;
      }
      placees.set(cle, nom);
      membres.push(cle);
    }
    equipes.push({ id, nom, membres });
    const lus = pointsLus(entree.points);
    if (lus) points[id] = lus;
  }
  return { equipes, scoresEquipes: normaliserScoresEquipes(points, equipes) };
}

/** Nombre entier lu dans le fichier (numéro de place…) : 3 ou « 3 » ; null sinon. */
function numeroDePlace(valeur) {
  if (Number.isInteger(valeur)) return valeur;
  if (typeof valeur === 'string' && /^\s*\d{1,3}\s*$/.test(valeur)) return Number(valeur);
  return null;
}

/**
 * Lit un fichier de groupe. Renvoie { nom, participants, infos, absents, plan, scores, equipes,
 * scoresEquipes, avertissements } prêt pour groupe.remplacer(). Les avertissements disent ce qui a été changé ou
 * ignoré (homonyme numéroté, place inexistante ou déjà prise…). Lève une erreur au message
 * lisible si le fichier ne convient pas.
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
  const points = {};
  const placesVoulues = [];
  for (const brut of source.participants) {
    const entree = typeof brut === 'string' ? { prenom: brut } : brut;
    if (!entree || typeof entree !== 'object') continue;
    // Une virgule séparerait deux prénoms (voir ajouter()) : on la remplace par une espace
    const saisi = normaliserPrenom(String(entree.prenom ?? '').replace(/[,;\n]/g, ' '));
    if (!saisi) continue;
    const resultat = ajouterPrenoms(participants, saisi);
    if (!resultat.ajouts.length) continue;
    participants = resultat.liste;
    // Deux personnes du même prénom : la deuxième reçoit un numéro (« Ana 2 »)
    const { prenom } = resultat.ajouts[0];
    if (prenom !== saisi) {
      avertissements.push(
        `${saisi} est déjà dans le groupe : cette personne devient « ${prenom} ».`,
      );
    }
    const info =
      typeof entree.info === 'string' ? { theme: 'autre', texte: entree.info } : entree.info;
    if (info) infos = definirInfo(infos, prenom, info);
    if (entree.absent === true) absents.push(prenom.toLocaleLowerCase('fr'));
    const lus = pointsLus(entree.points);
    if (lus) points[prenom] = lus;
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

  const { equipes, scoresEquipes } = lireEquipes(source.equipes, participants, avertissements);

  return {
    nom: normaliserNom(source.nom),
    participants,
    infos,
    absents,
    plan,
    scores: normaliserScores(points, participants),
    equipes,
    scoresEquipes,
    avertissements,
  };
}
