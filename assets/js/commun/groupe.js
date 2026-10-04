/**
 * Le groupe : les participants, une info par personne et le plan de salle, partagés par toutes
 * les pages (accueil, page « Le groupe », jeux). Les données passent par participants.js et
 * salle.js ; le plan est nettoyé dès que la liste change (personne retirée : place libérée).
 */
import * as listeParticipants from './participants.js';
import * as salle from './salle.js';
import { el, icone } from './ui.js';

export function creerGroupe() {
  let participants = listeParticipants.charger();
  let infos = listeParticipants.chargerInfos();
  let plan = salle.charger(participants);
  const ecouteurs = new Set();
  const prevenir = () => {
    for (const ecouteur of ecouteurs) ecouteur();
  };

  return {
    get participants() {
      return participants;
    },
    get infos() {
      return infos;
    },
    get plan() {
      return plan;
    },

    changerParticipants(nouveaux) {
      participants = nouveaux;
      listeParticipants.enregistrer(participants);
      infos = listeParticipants.garderInfos(infos, participants);
      listeParticipants.enregistrerInfos(infos);
      plan = salle.nettoyerPlan(plan, participants);
      salle.enregistrer(plan);
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
