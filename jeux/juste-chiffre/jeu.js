import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, animer, focaliser } from '../../assets/js/commun/ui.js';
import { creerMinuteur } from '../../assets/js/commun/chrono.js';
import { creerBoutonPoints } from '../../assets/js/commun/points.js';
import { lireNombre, formaterNombre } from '../../assets/js/commun/nombres.js';
import { schema, exemple } from './exemple.js';
import { MESSAGES, comparer, fourchette, decrireFourchette, suivant } from './logique.js';

const FLECHES = { plus: '⬆', moins: '⬇', juste: '🎯' };

function demarrer(ctx) {
  const { duree, tourDeRole } = ctx.reglages;
  const questions = ctx.elements;
  const avecTour = tourDeRole && ctx.participants.length > 0;
  let indexQuestion = 0;
  let indexJoueur = 0;
  let designe = null;
  let minuteur = null;
  let rafraichirJoueur = null;

  function joueurCourant() {
    if (avecTour) return ctx.participants[indexJoueur];
    return designe;
  }

  ctx.quandDesigne((prenom) => {
    designe = prenom;
    if (avecTour) indexJoueur = ctx.participants.indexOf(prenom);
    rafraichirJoueur?.();
  });

  function afficherQuestion() {
    const q = questions[indexQuestion];
    const unite = String(q.unite ?? '').trim();
    const historique = [];
    let finie = false;

    minuteur?.arreter();
    minuteur = creerMinuteur({ duree, sons: ctx.sons, surFin: () => reveler('temps') });

    const surtitre = el(
      'p',
      { class: 'panneau__surtitre' },
      `Question ${indexQuestion + 1} sur ${questions.length}`,
    );
    const enonce = el('h3', { class: 'panneau__texte juste__question' }, q.question);
    const precision = unite ? el('p', { class: 'juste__unite' }, `Réponse en ${unite}`) : null;
    const tour = el('p', { class: 'au-tour-de' });
    const etiquette = el('label', { for: 'juste-saisie', class: 'champ__libelle' });
    const saisie = el('input', {
      id: 'juste-saisie',
      class: 'champ__controle juste__saisie',
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      'aria-describedby': 'juste-erreur',
    });
    const erreur = el('p', { id: 'juste-erreur', class: 'juste__erreur', role: 'alert' });
    const formulaire = el(
      'form',
      { class: 'juste__formulaire' },
      etiquette,
      el(
        'div',
        { class: 'champ__ligne' },
        saisie,
        el('button', { type: 'submit', class: 'bouton bouton--principal' }, 'Valider'),
      ),
    );
    const verdict = el('p', { class: 'juste__verdict', 'aria-live': 'assertive' });
    const borne = el('p', { class: 'juste__fourchette' });
    const liste = el('ol', { class: 'juste__historique', 'aria-label': 'Propositions' });
    const compteur = el('p', { class: 'juste__compteur' });
    const pause = el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--discret',
        onclick: () => {
          if (minuteur.enCours) minuteur.pause();
          else minuteur.demarrer();
          pause.textContent = minuteur.enCours ? '⏸ Pause' : '▶ Reprendre';
        },
      },
      '⏸ Pause',
    );
    const devoiler = el(
      'button',
      { type: 'button', class: 'bouton bouton--discret', onclick: () => reveler('abandon') },
      'Révéler la réponse',
    );
    const fin = el('div', { class: 'juste__fin', hidden: true });
    const commandes = el(
      'div',
      { class: 'groupe-boutons groupe-boutons--centre' },
      pause,
      devoiler,
    );

    rafraichirJoueur = () => {
      const joueur = joueurCourant();
      tour.hidden = !joueur;
      remplir(tour, el('span', { 'aria-hidden': 'true' }, '🎤'), `Au tour de ${joueur}`);
      etiquette.textContent = joueur ? `Proposition de ${joueur}` : 'Proposition';
    };
    rafraichirJoueur();

    function dessinerHistorique() {
      remplir(
        liste,
        [...historique]
          .reverse()
          .map((h) =>
            el(
              'li',
              { class: `juste__entree juste__entree--${h.resultat}` },
              el('span', { class: 'juste__valeur' }, formaterNombre(h.valeur)),
              h.joueur ? el('span', { class: 'juste__joueur' }, h.joueur) : null,
              el('span', { class: 'juste__sens' }, `${FLECHES[h.resultat]} ${h.resultat}`),
            ),
          ),
      );
      borne.textContent = decrireFourchette(fourchette(historique), unite);
      compteur.textContent = historique.length
        ? `${historique.length} proposition${historique.length > 1 ? 's' : ''}`
        : '';
    }

    function reveler(raison) {
      if (finie) return;
      finie = true;
      minuteur.arreter();
      minuteur.element.classList.add('chrono--compact');
      formulaire.hidden = true;
      commandes.hidden = true;
      verdict.hidden = true;
      tour.hidden = true;
      erreur.textContent = '';
      const trouve = raison === 'juste';
      const gagnant = trouve ? historique.at(-1)?.joueur : null;
      if (gagnant) ctx.scores.ajouter(gagnant, 1);
      if (!trouve) ctx.sons.erreur();
      const reponse = `${formaterNombre(q.reponse)}${unite ? ` ${unite}` : ''}`;
      const titre = el(
        'p',
        { class: 'juste__resultat' },
        trouve
          ? `🎉 Trouvé${gagnant ? ` par ${gagnant}` : ''} !`
          : raison === 'temps'
            ? '⏰ Temps écoulé !'
            : 'Réponse',
      );
      const dernier = indexQuestion === questions.length - 1;
      remplir(
        fin,
        titre,
        el(
          'div',
          { class: 'reponse-revelee' },
          el('p', { class: 'reponse-revelee__valeur' }, reponse),
          q.anecdote ? el('p', {}, q.anecdote) : null,
        ),
        el(
          'div',
          { class: 'actions-jeu' },
          gagnant
            ? el('p', { class: 'juste__point' }, `✓ +1 point pour ${gagnant}`)
            : trouve
              ? creerBoutonPoints(ctx, { titre: 'Qui a trouvé ?' })
              : null,
          el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--sombre bouton--grand',
              onclick: () => {
                if (dernier) {
                  ctx.terminer({ message: 'Toutes les questions ont été jouées.' });
                  return;
                }
                indexQuestion += 1;
                if (avecTour) indexJoueur = suivant(ctx.participants, indexJoueur);
                afficherQuestion();
              },
            },
            dernier ? 'Voir le classement' : 'Question suivante →',
          ),
        ),
      );
      fin.hidden = false;
      animer(fin, 'apparition');
      ctx.annoncer(`${trouve ? 'Trouvé' : 'La réponse était'} : ${reponse}`);
      focaliser(titre);
    }

    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      const valeur = lireNombre(saisie.value);
      if (valeur === null) {
        erreur.textContent = 'Tapez un nombre (exemple : 1 500 ou 2,5).';
        animer(saisie, 'secousse');
        return;
      }
      erreur.textContent = '';
      const resultat = comparer(q.reponse, valeur, q.marge ?? 0);
      historique.push({ valeur, resultat, joueur: joueurCourant() });
      saisie.value = '';
      remplir(
        verdict,
        el('span', { class: 'juste__fleche', 'aria-hidden': 'true' }, FLECHES[resultat]),
        ' ',
        MESSAGES[resultat],
      );
      verdict.className = `juste__verdict juste__verdict--${resultat}`;
      animer(verdict, 'apparition');
      dessinerHistorique();
      if (resultat === 'juste') {
        ctx.sons.succes();
        reveler('juste');
        return;
      }
      ctx.sons.tic();
      if (avecTour) {
        indexJoueur = suivant(ctx.participants, indexJoueur);
        rafraichirJoueur();
      }
      saisie.focus();
    });

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau juste' },
        surtitre,
        enonce,
        precision,
        el(
          'div',
          { class: 'juste__colonnes' },
          el(
            'div',
            { class: 'juste__gauche' },
            minuteur.element,
            commandes,
            el('div', { class: 'juste__infos' }, borne, compteur, liste),
          ),
          el('div', { class: 'juste__droite' }, tour, formulaire, erreur, verdict, fin),
        ),
      ),
    );
    minuteur.demarrer();
    saisie.focus();
  }

  afficherQuestion();
  return () => minuteur?.arreter();
}

monterJeu({
  slug: 'juste-chiffre',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des questions dont la réponse est un nombre.',
    'Un participant propose un nombre à l’oral, vous le tapez : le jeu répond « c’est plus » ou « c’est moins ».',
    'Le minuteur (30 s par défaut) tourne : à zéro, la réponse est révélée.',
    'Celui ou celle qui trouve gagne 1 point. Le tour de rôle passe la main à chaque proposition.',
  ],
  demarrer,
});
