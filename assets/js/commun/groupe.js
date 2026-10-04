/**
 * Le groupe : son nom, les participants, une info par personne, les absences du jour, le plan
 * de salle et le score de chacun, partagés par toutes les pages (accueil, page « Le groupe »,
 * jeux). Les données passent par participants.js, salle.js et scores-groupe.js ; le plan, les
 * absences et les scores sont nettoyés dès que la liste change (personne retirée : place
 * libérée, points oubliés).
 */
import * as listeParticipants from './participants.js';
import * as salle from './salle.js';
import * as scoresGroupe from './scores-groupe.js';
import { el, icone } from './ui.js';

export function creerGroupe() {
  let nom = listeParticipants.chargerNom();
  let participants = listeParticipants.charger();
  let infos = listeParticipants.chargerInfos();
  let absents = listeParticipants.chargerAbsents(participants);
  let plan = salle.charger(participants);
  let scores = scoresGroupe.charger(participants);
  const ecouteurs = new Set();
  const prevenir = () => {
    for (const ecouteur of ecouteurs) ecouteur();
  };
  // Les points changent souvent pendant une partie : ils ont leurs propres écouteurs
  const ecouteursScores = new Set();
  const prevenirScores = () => {
    for (const ecouteur of ecouteursScores) ecouteur();
  };

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
     * Remplace tout le groupe d'un coup (fichier importé) : nom, prénoms, infos, absences et
     * plan, gardés cohérents avec la nouvelle liste. Les écouteurs ne sont prévenus qu'une fois.
     */
    remplacer(nouveau) {
      nom = listeParticipants.normaliserNom(nouveau.nom);
      participants = listeParticipants.ajouter([], (nouveau.participants ?? []).join('\n'));
      infos = listeParticipants.garderInfos(nouveau.infos ?? {}, participants);
      absents = listeParticipants.garderAbsents(nouveau.absents ?? [], participants);
      plan = salle.nettoyerPlan(nouveau.plan, participants);
      scores = scoresGroupe.normaliserScores(nouveau.scores ?? {}, participants);
      listeParticipants.enregistrerNom(nom);
      listeParticipants.enregistrer(participants);
      listeParticipants.enregistrerInfos(infos);
      listeParticipants.enregistrerAbsents(absents);
      salle.enregistrer(plan);
      scoresGroupe.enregistrer(scores);
      prevenir();
    },

    changerParticipants(nouveaux) {
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
      prevenir();
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
    // autre onglet a pu en ajouter.

    /** Points gagnés (ou perdus) dans un jeu : `source` est le slug du jeu. */
    ajouterPoints(prenom, source, n) {
      scores = scoresGroupe.ajouterPoints(scoresGroupe.charger(participants), prenom, source, n);
      scoresGroupe.enregistrer(scores);
      prevenirScores();
    },

    /** L'animateur corrige le total d'une personne. */
    fixerTotal(prenom, total) {
      scores = scoresGroupe.fixerTotal(scoresGroupe.charger(participants), prenom, total);
      scoresGroupe.enregistrer(scores);
      prevenirScores();
    },

    reinitialiserScores() {
      scores = {};
      scoresGroupe.enregistrer(scores);
      prevenirScores();
    },

    /** Relit les scores (changés par une autre page) et prévient les écouteurs. */
    rechargerScores() {
      scores = scoresGroupe.charger(participants);
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
