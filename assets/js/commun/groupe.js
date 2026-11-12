/**
 * Le groupe : son nom, les participants, une info par personne, les absences du jour, le plan
 * de salle, les équipes, le score de chacun (et de chaque équipe) et les notes de suivi (suivi.js),
 * partagés par toutes les pages (accueil, page « Le groupe », jeux). Les données passent par participants.js, salle.js,
 * equipes.js et scores-groupe.js ; le plan, les absences, les équipes et les scores sont nettoyés
 * dès que la liste change (personne retirée : place libérée, équipe quittée, points oubliés).
 */
import * as listeParticipants from './participants.js';
import * as salle from './salle.js';
import * as scoresGroupe from './scores-groupe.js';
import * as listeEquipes from './equipes.js';
import * as historique from './historique-groupes.js';
import * as notesSuivi from './suivi.js';
import { preparerExportGroupe, lireGroupe } from './fichier-groupe.js';
import { el, icone } from './ui.js';

export function creerGroupe() {
  let nom = listeParticipants.chargerNom();
  let participants = listeParticipants.charger();
  let infos = listeParticipants.chargerInfos();
  let absents = listeParticipants.chargerAbsents(participants);
  let plan = salle.charger(participants);
  let scores = scoresGroupe.charger(participants);
  let equipes = listeEquipes.charger(participants);
  let scoresEquipes = listeEquipes.chargerScores(equipes);
  let suivi = notesSuivi.charger();
  /** Les équipes telles qu'enregistrées (peut-être changées dans un autre onglet). */
  const equipesEnregistrees = () => listeEquipes.charger(listeParticipants.charger());
  const ecouteurs = new Set();
  const prevenir = () => {
    for (const ecouteur of ecouteurs) ecouteur();
  };
  // Les points changent souvent pendant une partie : ils ont leurs propres écouteurs
  const ecouteursScores = new Set();
  const prevenirScores = () => {
    for (const ecouteur of ecouteursScores) ecouteur();
  };
  // L'entrée des « Groupes récents » du groupe en cours : { id, creeLe }, ou null sans prénom
  let courant = historique.chargerCourant();
  const suivreCourant = () => {
    if (!participants.length) {
      if (courant) historique.enregistrerCourant(null);
      courant = null;
    } else if (!courant) {
      const maintenant = new Date();
      courant = { id: historique.nouvelId(maintenant), creeLe: maintenant.toISOString() };
      historique.enregistrerCourant(courant);
    }
  };
  const etat = () => ({
    nom,
    participants,
    infos,
    absents,
    plan,
    scores,
    equipes,
    scoresEquipes,
    suivi,
  });

  /**
   * Met le groupe de côté dans les « Groupes récents » (s'il a des prénoms), avant qu'il soit
   * perdu. `nouveau` : la suite est un autre groupe (nouvelle formation), avec sa propre entrée.
   */
  function mettreDeCote({ nouveau = false } = {}) {
    if (participants.length) {
      suivreCourant();
      const groupe = preparerExportGroupe(etat()).groupe;
      historique.enregistrer(historique.mettreDeCote(historique.charger(), { ...courant, groupe }));
    }
    if (nouveau) {
      historique.enregistrerCourant(null);
      courant = null;
      suivreCourant();
    }
  }

  /**
   * Remplace tout le groupe d'un coup (fichier importé, groupe rechargé) : nom, prénoms, infos,
   * absences, plan et notes de suivi, gardés cohérents avec la nouvelle liste. Les écouteurs ne sont prévenus
   * qu'une fois. `suite` : l'entrée des « Groupes récents » qu'il reprend (sinon, une nouvelle).
   */
  function remplacer(nouveau, { suite = null } = {}) {
    nom = listeParticipants.normaliserNom(nouveau.nom);
    participants = listeParticipants.ajouter([], (nouveau.participants ?? []).join('\n'));
    infos = listeParticipants.garderInfos(nouveau.infos ?? {}, participants);
    absents = listeParticipants.garderAbsents(nouveau.absents ?? [], participants);
    plan = salle.nettoyerPlan(nouveau.plan, participants);
    scores = scoresGroupe.normaliserScores(nouveau.scores ?? {}, participants);
    equipes = listeEquipes.normaliserEquipes(nouveau.equipes ?? [], participants);
    scoresEquipes = listeEquipes.normaliserScoresEquipes(nouveau.scoresEquipes ?? {}, equipes);
    suivi = notesSuivi.normaliserSuivi(nouveau.suivi);
    listeParticipants.enregistrerNom(nom);
    listeParticipants.enregistrer(participants);
    listeParticipants.enregistrerInfos(infos);
    listeParticipants.enregistrerAbsents(absents);
    salle.enregistrer(plan);
    scoresGroupe.enregistrer(scores);
    listeEquipes.enregistrer(equipes);
    listeEquipes.enregistrerScores(scoresEquipes);
    notesSuivi.enregistrer(suivi);
    courant = suite;
    historique.enregistrerCourant(courant);
    suivreCourant();
    prevenir();
  }

  return {
    /** Nom du groupe (facultatif), '' sans nom. */
    get nom() {
      return nom;
    },
    get participants() {
      return participants;
    },
    get infos() {
      return infos;
    },
    get plan() {
      return plan;
    },
    /** Points de chacun, tous jeux confondus (voir scores-groupe.js). */
    get scores() {
      return scores;
    },
    /** Les équipes : [{ id, nom, membres }] (voir equipes.js). */
    get equipes() {
      return equipes;
    },
    /** Points de chaque équipe, tous jeux confondus : { e1: { motus: 3 } }. */
    get scoresEquipes() {
      return scoresEquipes;
    },
    /** Notes de suivi : { diapositive, vu } (voir suivi.js). */
    get suivi() {
      return suivi;
    },
    /** Prénoms (en minuscules) des personnes absentes aujourd'hui. */
    get absents() {
      return absents;
    },
    /** Les personnes présentes aujourd'hui, dans l'ordre de la liste. */
    get presents() {
      return listeParticipants.presents(participants, absents);
    },

    changerNom(nouveau) {
      nom = listeParticipants.normaliserNom(nouveau);
      listeParticipants.enregistrerNom(nom);
      prevenir();
    },

    /**
     * Notes de suivi changées (numéro de la diapositive, ce qui a été vu). Les écouteurs ne sont pas prévenus :
     * seul le bloc « Où en est-on ? » les affiche, et il s'enregistre à chaque frappe.
     */
    changerSuivi(nouveau) {
      suivi = notesSuivi.normaliserSuivi(nouveau);
      notesSuivi.enregistrer(suivi);
    },

    remplacer,
    mettreDeCote,

    /** Identifiant de l'entrée des « Groupes récents » du groupe en cours, ou null. */
    get idHistorique() {
      return courant?.id ?? null;
    },

    /**
     * Recharge un groupe récent, en entier ou en partie (`choix` : clés de PARTIES_RECHARGE,
     * historique-groupes.js). Le groupe en cours est d'abord mis de côté, sauf s'il est ce
     * groupe-là : on revient alors à son état enregistré.
     */
    recharger(entree, choix) {
      const archive = lireGroupe(entree.groupe);
      if (entree.id !== courant?.id) mettreDeCote();
      const suite = choix.includes('prenoms') ? { id: entree.id, creeLe: entree.creeLe } : courant;
      remplacer(historique.fusionner(etat(), archive, choix), { suite });
    },

    changerParticipants(nouveaux) {
      // Liste effacée : le groupe reste un mois dans les « Groupes récents »
      if (!nouveaux.length && participants.length) mettreDeCote({ nouveau: true });
      participants = nouveaux;
      listeParticipants.enregistrer(participants);
      infos = listeParticipants.garderInfos(infos, participants);
      listeParticipants.enregistrerInfos(infos);
      absents = listeParticipants.garderAbsents(absents, participants);
      listeParticipants.enregistrerAbsents(absents);
      plan = salle.nettoyerPlan(plan, participants);
      salle.enregistrer(plan);
      scores = scoresGroupe.charger(participants);
      scoresGroupe.enregistrer(scores);
      equipes = listeEquipes.normaliserEquipes(equipes, participants);
      listeEquipes.enregistrer(equipes);
      suivreCourant();
      prevenir();
    },

    /**
     * Nouvelles équipes (composées, renommées, ajoutées, retirées) : les points d'une équipe
     * retirée sont oubliés.
     */
    changerEquipes(nouvelles) {
      equipes = listeEquipes.normaliserEquipes(nouvelles, participants);
      listeEquipes.enregistrer(equipes);
      scoresEquipes = listeEquipes.chargerScores(equipes);
      listeEquipes.enregistrerScores(scoresEquipes);
      prevenir();
    },

    /** Relit les équipes (composées sur la page « Le groupe », dans un autre onglet). */
    rechargerEquipes() {
      equipes = listeEquipes.charger(participants);
      scoresEquipes = listeEquipes.chargerScores(equipes);
    },

    /** L'équipe d'une personne, ou null. */
    equipeDe(prenom) {
      return listeEquipes.equipeDe(equipes, prenom);
    },

    estAbsent(prenom) {
      return listeParticipants.estAbsent(absents, prenom);
    },

    /** Marque la personne absente aujourd'hui, ou de nouveau présente. */
    basculerAbsent(prenom) {
      absents = listeParticipants.basculerAbsent(absents, prenom);
      listeParticipants.enregistrerAbsents(absents);
      prevenir();
    },

    changerInfos(nouvelles) {
      infos = nouvelles;
      listeParticipants.enregistrerInfos(infos);
      prevenir();
    },

    changerPlan(nouveau) {
      plan = salle.nettoyerPlan(nouveau, participants);
      salle.enregistrer(plan);
      prevenir();
    },

    // Les scores sont relus dans le stockage avant chaque changement : un jeu ouvert dans un
    // autre onglet a pu en ajouter. Ils sont gardés selon la liste et les équipes enregistrées,
    // pas celles de cette page : une personne ajoutée ailleurs ne perd pas ses points.

    /**
     * Points gagnés (ou perdus) dans un jeu par une personne ou plusieurs (une liste) : `source`
     * est le slug du jeu. Une seule lecture et une seule écriture, quel que soit le nombre.
     */
    ajouterPoints(prenoms, source, n) {
      let nouveaux = scoresGroupe.charger(listeParticipants.charger());
      for (const prenom of [].concat(prenoms)) {
        nouveaux = scoresGroupe.ajouterPoints(nouveaux, prenom, source, n);
      }
      scores = nouveaux;
      scoresGroupe.enregistrer(scores);
      prevenirScores();
    },

    /** Points gagnés (ou perdus) dans un jeu par une équipe ou plusieurs (leurs identifiants). */
    ajouterPointsEquipes(ids, source, n) {
      const enregistrees = equipesEnregistrees();
      let nouveaux = listeEquipes.chargerScores(enregistrees);
      for (const id of [].concat(ids)) {
        if (enregistrees.some((e) => e.id === id)) {
          nouveaux = scoresGroupe.ajouterPoints(nouveaux, id, source, n);
        }
      }
      scoresEquipes = nouveaux;
      listeEquipes.enregistrerScores(scoresEquipes);
      prevenirScores();
    },

    /** L'animateur corrige le total d'une équipe. */
    fixerTotalEquipe(id, total) {
      scoresEquipes = scoresGroupe.fixerTotal(
        listeEquipes.chargerScores(equipesEnregistrees()),
        id,
        total,
      );
      listeEquipes.enregistrerScores(scoresEquipes);
      prevenirScores();
    },

    /** L'animateur corrige le total d'une personne. */
    fixerTotal(prenom, total) {
      scores = scoresGroupe.fixerTotal(
        scoresGroupe.charger(listeParticipants.charger()),
        prenom,
        total,
      );
      scoresGroupe.enregistrer(scores);
      prevenirScores();
    },

    reinitialiserScores() {
      scores = {};
      scoresEquipes = {};
      scoresGroupe.enregistrer(scores);
      listeEquipes.enregistrerScores(scoresEquipes);
      prevenirScores();
    },

    /** Relit les scores (changés par une autre page) et prévient les écouteurs. */
    rechargerScores() {
      scores = scoresGroupe.charger(participants);
      scoresEquipes = listeEquipes.chargerScores(equipes);
      prevenirScores();
    },

    totalDe(prenom) {
      return scoresGroupe.totalDe(scores, prenom);
    },

    infoDe(prenom) {
      return listeParticipants.infoDe(infos, prenom);
    },

    /** « Dessert préféré : le tiramisu », ou '' sans info. */
    decrire(prenom) {
      return listeParticipants.decrireInfo(listeParticipants.infoDe(infos, prenom));
    },

    /** « Place 4, îlot 2 », ou '' si la personne n'est pas placée. */
    placeDe(prenom) {
      const id = salle.placeDe(plan, prenom);
      return id ? salle.libellePlace(plan, participants, id) : '';
    },

    /** Appelé à chaque changement ; renvoie une fonction pour arrêter d'écouter. */
    surChangement(ecouteur) {
      ecouteurs.add(ecouteur);
      return () => ecouteurs.delete(ecouteur);
    },

    /** Appelé quand les points changent (pas la liste) ; renvoie une fonction pour arrêter. */
    surChangementScores(ecouteur) {
      ecouteursScores.add(ecouteur);
      return () => ecouteursScores.delete(ecouteur);
    },
  };
}

/** Petite étiquette « (icône) tiramisu » à côté d'un prénom (rien s'il n'y a pas d'info). */
export function etiquetteInfo(groupe, prenom, classe) {
  const info = groupe.infoDe(prenom);
  if (!info) return null;
  const theme = listeParticipants.themeDe(info.theme);
  return el(
    'span',
    { class: classe, title: groupe.decrire(prenom) },
    icone(theme.icone),
    el('span', { class: 'visuellement-cache' }, `${theme.libelle} : `),
    info.texte,
  );
}
