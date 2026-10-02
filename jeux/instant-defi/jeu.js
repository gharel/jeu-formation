import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  focaliser,
  ecouterClavier,
  animer,
} from '../../assets/js/commun/ui.js';
import { creerRoue, couleursRoue } from '../../assets/js/commun/roue.js';
import { creerMinuteur } from '../../assets/js/commun/chrono.js';
import { entierEntre } from '../../assets/js/commun/hasard.js';
import { creerBoutonPoints } from '../../assets/js/commun/points.js';
import { schema, exemple } from './exemple.js';
import { resoudreDefi } from './logique.js';

function demarrer(ctx) {
  const defis = ctx.elements.map((e, i) => ({ numero: i + 1, element: e }));
  let restants = [...defis];
  let auTourDe = null;
  let minuteur = null;
  let actionPrincipale = null;

  const retirerClavier = ecouterClavier({ Espace: () => actionPrincipale?.() });
  ctx.quandDesigne((prenom) => {
    auTourDe = prenom;
    const etiquette = ctx.zone.querySelector('.au-tour-de');
    if (etiquette) dessinerTour(etiquette);
  });

  function dessinerTour(etiquette) {
    etiquette.hidden = !auTourDe;
    remplir(etiquette, icone('microphone'), `Au tour de ${auTourDe}`);
  }

  function afficherRoue() {
    minuteur?.arreter();
    auTourDe = null;
    const roue = creerRoue(
      restants.map((d) => `Défi ${d.numero}`),
      couleursRoue(restants.length),
      { hasard: ctx.hasard },
    );
    const titre = el('h3', { class: 'panneau__texte' }, 'Quel sera le prochain défi ?');
    const bouton = el(
      'button',
      { type: 'button', class: 'bouton bouton--principal bouton--grand' },
      'Lancer la roue',
    );
    let enCours = false;
    async function lancer() {
      if (enCours) return;
      enCours = true;
      bouton.disabled = true;
      const index = entierEntre(0, restants.length - 1, ctx.hasard);
      await roue.tourner(index);
      ctx.sons.ding();
      const defi = restants[index];
      restants = restants.filter((d) => d !== defi);
      afficherDefi(defi);
    }
    bouton.addEventListener('click', lancer);
    actionPrincipale = lancer;
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau defi-roue' },
        el('div', { class: 'defi-roue__roue' }, roue.element),
        el(
          'div',
          { class: 'defi-roue__texte' },
          el(
            'p',
            { class: 'panneau__surtitre' },
            `${restants.length} défi${restants.length > 1 ? 's' : ''} dans la roue`,
          ),
          titre,
          bouton,
          el('p', { class: 'raccourci' }, 'ou appuyez sur ', el('kbd', {}, 'Espace')),
        ),
      ),
    );
    focaliser(titre);
  }

  function afficherDefi(defi) {
    const { texte, duree } = resoudreDefi(defi.element, ctx.hasard);
    minuteur = creerMinuteur({ duree, sons: ctx.sons, surFin: () => finir(false) });
    const enonce = el('p', { class: 'panneau__texte defi__enonce' }, texte);
    const tour = el('p', { class: 'au-tour-de', hidden: true });
    dessinerTour(tour);
    const actions = el('div', { class: 'actions-jeu' });
    const issue = el('div', { class: 'defi__issue', 'aria-live': 'polite' });

    function boutonsAvant() {
      const depart = el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--principal bouton--grand',
          onclick: () => partir(),
        },
        'Top départ !',
      );
      remplir(
        actions,
        ctx.participants.length > 1
          ? el(
              'button',
              { type: 'button', class: 'bouton bouton--grand', onclick: () => ctx.designer() },
              icone('arrows-spin'),
              'Désigner un joueur',
            )
          : null,
        depart,
      );
      actionPrincipale = partir;
      depart.focus();
    }

    function partir() {
      minuteur.demarrer();
      const stop = el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--succes bouton--grand',
          onclick: () => finir(true),
        },
        icone('check'),
        'Réussi, on arrête le chrono',
      );
      remplir(actions, stop);
      actionPrincipale = () => finir(true);
      stop.focus();
    }

    function finir(reussi) {
      minuteur.arreter();
      minuteur.element.classList.add('chrono--compact');
      actionPrincipale = null;
      if (reussi) ctx.sons.succes();
      const message = reussi ? 'Défi réussi !' : 'Temps écoulé !';
      remplir(
        issue,
        el(
          'p',
          { class: 'defi__message' },
          icone(reussi ? 'face-grin-stars' : 'hourglass-end'),
          message,
        ),
      );
      animer(issue, 'apparition');
      const dernier = restants.length === 0;
      const suivant = el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--sombre bouton--grand',
          onclick: () =>
            dernier ? ctx.terminer({ message: 'Tous les défis ont été joués.' }) : afficherRoue(),
        },
        dernier ? 'Voir le classement' : ['Défi suivant', icone('arrow-right')],
      );
      remplir(
        actions,
        creerBoutonPoints(ctx, {
          titre: 'Qui a réussi le défi ?',
          message: 'Cliquez sur toutes les personnes qui ont réussi, puis Valider.',
          multiple: true,
          preselection: auTourDe ? [auTourDe] : [],
        }),
        suivant,
      );
      actionPrincipale = () => suivant.click();
      ctx.annoncer(message);
    }

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau defi' },
        el('p', { class: 'panneau__surtitre' }, `Défi ${defi.numero}`),
        tour,
        enonce,
        minuteur.element,
        issue,
        actions,
      ),
    );
    animer(enonce, 'apparition');
    boutonsAvant();
  }

  afficherRoue();

  return () => {
    minuteur?.arreter();
    retirerClavier();
  };
}

monterJeu({
  slug: 'instant-defi',
  schema,
  exemple,
  regles: [
    'Avant la séance, écrivez la fin de vos défis (« … le menu pour enregistrer un fichier »).',
    'La roue tire un défi au hasard, avec un début générique : « 30 secondes pour trouver… ».',
    'Désignez un joueur ou laissez tout le monde chercher sur son poste, puis Top départ !',
    'Cochez les personnes qui ont réussi : 1 point chacune.',
  ],
  demarrer,
});
