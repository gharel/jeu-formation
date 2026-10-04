/**
 * Le groupe : son nom, les participants, une info par personne, les absences du jour et le plan
 * de salle, partagés par toutes les pages (accueil, page « Le groupe », jeux). Les données
 * passent par participants.js et salle.js ; le plan et les absences sont nettoyés dès que la
 * liste change (personne retirée : place libérée).
 */
import * as listeParticipants from './participants.js';
import * as salle from './salle.js';
import { el, icone } from './ui.js';

export function creerGroupe() {
  let nom = listeParticipants.chargerNom();
  let participants = listeParticipants.charger();
  let infos = listeParticipants.chargerInfos();
  let absents = listeParticipants.chargerAbsents(participants);
  let plan = salle.charger(participants);
  const ecouteurs = new Set();
  const prevenir = () => {
    for (const ecouteur of ecouteurs) ecouteur();
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
      listeParticipants.enregistrerNom(nom);
      listeParticipants.enregistrer(participants);
      listeParticipants.enregistrerInfos(infos);
      listeParticipants.enregistrerAbsents(absents);
      salle.enregistrer(plan);
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
