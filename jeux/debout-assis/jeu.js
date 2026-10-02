import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
} from '../../assets/js/commun/ui.js';
import { creerMinuteur } from '../../assets/js/commun/chrono.js';
import { creerBoutonPoints } from '../../assets/js/commun/points.js';
import { schema, exemple } from './exemple.js';
import { consigne, appliquerEliminations, gagnant } from './logique.js';

function tuileGeste(c, sens) {
  const { geste, icone: nomIcone } = c[sens];
  return el(
    'div',
    { class: `debout__tuile debout__tuile--${sens}` },
    el('span', { class: 'debout__icone' }, icone(nomIcone)),
    el('span', { class: 'debout__geste' }, geste),
    el('span', { class: 'debout__sens' }, `= ${sens.toUpperCase()}`),
  );
}

function demarrer(ctx) {
  const { duree, survie: survieDemandee } = ctx.reglages;
  const c = consigne(ctx.reglages.consigne);
  const survie = survieDemandee && ctx.participants.length >= 2;
  const affirmations = ctx.elements;
  let index = 0;
  let enJeu = [...ctx.participants];
  let minuteur = null;
  let actionPrincipale = null;
  const retirerClavier = ecouterClavier({ Espace: () => actionPrincipale?.() });

  function blocEnJeu() {
    if (!survie) return null;
    return el(
      'p',
      { class: 'debout__en-jeu' },
      el('strong', {}, `En jeu (${enJeu.length}) : `),
      enJeu.join(', '),
    );
  }

  function afficherDepart() {
    const titre = el('h3', { class: 'panneau__texte debout__depart' }, c.depart);
    const bouton = el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--principal bouton--grand',
        onclick: () => afficherAffirmation(),
      },
      'C’est parti !',
    );
    actionPrincipale = () => afficherAffirmation();
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau debout' },
        el('p', { class: 'debout__grande-icone' }, icone(c.vrai.icone)),
        titre,
        el('div', { class: 'debout__tuiles' }, tuileGeste(c, 'vrai'), tuileGeste(c, 'faux')),
        survie
          ? el(
              'p',
              { class: 'champ__aide debout__regle' },
              'Mode survie : qui se trompe est éliminé. Le dernier en jeu gagne !',
            )
          : null,
        blocEnJeu(),
        el('div', { class: 'actions-jeu' }, bouton),
      ),
    );
    focaliser(titre);
  }

  function afficherAffirmation() {
    const a = affirmations[index];
    minuteur?.arreter();
    minuteur = creerMinuteur({ duree, sons: ctx.sons, surFin: () => reveler() });
    const enonce = el('h3', { class: 'panneau__texte debout__affirmation' }, a.affirmation);
    const devoiler = el(
      'button',
      { type: 'button', class: 'bouton bouton--grand', onclick: () => reveler() },
      'Révéler la réponse',
    );
    actionPrincipale = () => reveler();
    const resultat = el('div', { class: 'debout__resultat', hidden: true });
    const actions = el('div', { class: 'actions-jeu' }, devoiler);
    const tuiles = el(
      'div',
      { class: 'debout__tuiles' },
      tuileGeste(c, 'vrai'),
      tuileGeste(c, 'faux'),
    );
    let revele = false;

    function reveler() {
      if (revele) return;
      revele = true;
      minuteur.arreter();
      minuteur.element.hidden = true;
      const vrai = a.reponse === 'vrai';
      const sens = vrai ? 'vrai' : 'faux';
      ctx.sons.ding();
      for (const tuile of tuiles.children) {
        tuile.classList.toggle(
          'debout__tuile--bonne',
          tuile.classList.contains(`debout__tuile--${sens}`),
        );
        tuile.classList.toggle(
          'debout__tuile--mauvaise',
          !tuile.classList.contains(`debout__tuile--${sens}`),
        );
      }
      const verdict = el(
        'p',
        { class: `debout__verdict debout__verdict--${sens}` },
        vrai ? 'VRAI' : 'FAUX',
      );
      remplir(
        resultat,
        verdict,
        el(
          'p',
          { class: 'debout__bonne' },
          'Les bonnes réponses : ',
          icone(c[sens].icone),
          c[sens].geste.toLowerCase(),
        ),
        a.explication ? el('p', { class: 'debout__explication' }, a.explication) : null,
      );
      resultat.hidden = false;
      animer(resultat, 'apparition');
      ctx.annoncer(`${vrai ? 'Vrai' : 'Faux'}. ${a.explication ?? ''}`);
      afficherSuite();
    }

    function afficherSuite() {
      const dernier = index === affirmations.length - 1;
      const suivant = el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--sombre bouton--grand',
          onclick: () => passerALaSuite(),
        },
        dernier ? 'Voir le classement' : ['Affirmation suivante', icone('arrow-right')],
      );
      actionPrincipale = () => passerALaSuite();

      if (!survie) {
        remplir(
          actions,
          creerBoutonPoints(ctx, {
            titre: 'Qui avait la bonne réponse ?',
            message: 'Cliquez sur les bonnes réponses, puis Valider.',
            multiple: true,
          }),
          suivant,
        );
        return;
      }

      const enJeuAffiche = el('div', {}, blocEnJeu());
      const eliminer = el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--danger bouton--grand',
          onclick: async () => {
            const elimines = await ctx.choisirPrenoms({
              prenoms: enJeu,
              titre: 'Qui s’est trompé ?',
              message: 'Cliquez sur les personnes éliminées, puis Valider.',
              multiple: true,
            });
            if (!elimines.length) return;
            const issue = appliquerEliminations(enJeu, elimines);
            eliminer.disabled = true;
            if (issue.tousElimines) {
              remplir(
                enJeuAffiche,
                el(
                  'p',
                  { class: 'debout__info' },
                  'Tout le monde s’est trompé : personne n’est éliminé !',
                ),
                blocEnJeu(),
              );
              return;
            }
            enJeu = issue.enJeu;
            ctx.sons.erreur();
            const champion = gagnant(enJeu);
            remplir(
              enJeuAffiche,
              champion
                ? el(
                    'p',
                    { class: 'debout__info debout__info--gagnant' },
                    icone('trophy'),
                    `${champion} est le dernier en jeu !`,
                  )
                : null,
              blocEnJeu(),
            );
            // passerALaSuite() termine la partie dès qu'il ne reste qu'une personne
            if (champion) suivant.textContent = 'Voir le classement';
          },
        },
        'Éliminer ceux qui se sont trompés',
      );
      remplir(actions, eliminer, suivant);
      resultat.append(enJeuAffiche);
    }

    function passerALaSuite() {
      // Mode survie : chaque manche survécue rapporte 1 point (le classement suit l'ordre d'élimination)
      if (survie) for (const prenom of enJeu) ctx.scores.ajouter(prenom, 1);
      const champion = survie ? gagnant(enJeu) : null;
      if (champion || index === affirmations.length - 1) {
        ctx.terminer({
          message: champion
            ? `${champion} est le dernier en jeu !`
            : 'Toutes les affirmations ont été jouées.',
        });
        return;
      }
      index += 1;
      afficherAffirmation();
    }

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau debout' },
        el(
          'p',
          { class: 'panneau__surtitre' },
          `Affirmation ${index + 1} sur ${affirmations.length}`,
        ),
        enonce,
        tuiles,
        minuteur.element,
        resultat,
        actions,
      ),
    );
    animer(enonce, 'apparition');
    minuteur.demarrer();
    focaliser(enonce);
  }

  afficherDepart();
  return () => {
    minuteur?.arreter();
    retirerClavier();
  };
}

monterJeu({
  slug: 'debout-assis',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des affirmations vraies ou fausses, avec une courte explication.',
    'Tout le monde se lève. Vrai ? On reste debout. Faux ? On s’assoit. (Variante : main levée.)',
    'Après le compte à rebours, la réponse et l’explication s’affichent.',
    'Mode survie possible : qui se trompe est éliminé, le dernier en jeu gagne.',
  ],
  demarrer,
});
