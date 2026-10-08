import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, icone, animer, ecouterClavier } from '../../assets/js/commun/ui.js';
import { schema, exemple } from './exemple.js';
import { POINTS_PAR_QUESTION, pointsDuRang, reponseAffichee, creerManche } from './logique.js';
import { creerIllustrationTop5 } from './illustration.js';

/** Aide « (Entrée) » d'un bouton : inutile sur téléphone, où elle est masquée (base.css). */
const aideClavier = (touche) => el('span', { class: 'aide-clavier' }, ` (${touche})`);
const points = (n) => `${n} point${n > 1 ? 's' : ''}`;

function demarrer(ctx) {
  const questions = ctx.elements;
  const { erreursMax } = ctx.reglages;
  const avecPrenoms = ctx.participants.length > 0;
  let index = 0;
  let total = 0;
  let touches = {};
  const retirerClavier = ecouterClavier({ Entrée: () => touches.entree?.() });
  // Le trophée : il saute à chaque réponse trouvée, ses étoiles brillent au top 5 complet
  const illustration = creerIllustrationTop5();

  function afficherQuestion() {
    const { question, reponses } = questions[index];
    const manche = creerManche(reponses, { erreursMax });
    illustration.etat(null);
    const derniere = index === questions.length - 1;
    // Qui a trouvé chaque réponse (rang → prénom), pour lui donner les points
    const attribues = new Map();
    touches = {};

    const score = el('p', { class: 'top5__score' });
    const tableau = el('ol', { class: 'top5__tableau', 'aria-label': 'Les 5 réponses' });
    const croix = el('p', { class: 'top5__croix', 'aria-hidden': 'true' }, icone('xmark'));
    const erreurs = el('p', { class: 'top5__erreurs' });
    const saisie = el('input', {
      id: 'top5-proposition',
      class: 'champ__controle top5__saisie',
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const formulaire = el(
      'form',
      { class: 'top5__formulaire' },
      el('label', { for: 'top5-proposition', class: 'champ__libelle' }, 'Proposition du groupe'),
      el(
        'div',
        { class: 'champ__ligne' },
        saisie,
        el('button', { type: 'submit', class: 'bouton bouton--principal' }, 'Vérifier'),
      ),
    );
    const message = el('p', { class: 'top5__message', 'aria-live': 'polite' });
    const actions = el('div', { class: 'groupe-boutons top5__actions' });
    const panneau = el(
      'div',
      { class: 'panneau top5', tabindex: '-1' },
      el(
        'div',
        { class: 'top5__entete' },
        el('p', { class: 'panneau__surtitre' }, `Question ${index + 1} sur ${questions.length}`),
        score,
      ),
      el(
        'div',
        { class: 'top5__titre' },
        illustration.element,
        el('h3', { class: 'panneau__texte top5__question' }, question),
      ),
      el(
        'div',
        { class: 'top5__plateau' },
        el('div', { class: 'top5__colonne' }, tableau, croix),
        el('div', { class: 'top5__commandes' }, erreurs, formulaire, message, actions),
      ),
    );

    /** `apparue` : le rang de la réponse qui vient d'être trouvée, qui se retourne (animation). */
    function dessinerTableau(apparue = -1) {
      remplir(
        tableau,
        reponses.map((reponse, rang) => {
          const trouvee = manche.estTrouvee(rang);
          const valeur = pointsDuRang(rang);
          const rangAffiche = el('span', { class: 'top5__rang' }, String(rang + 1));
          if (!trouvee && !manche.finie) {
            return el(
              'li',
              { class: 'top5__case top5__case--cachee' },
              el(
                'button',
                {
                  type: 'button',
                  class: 'top5__retourner',
                  'aria-label': `Réponse ${rang + 1}, cachée : la retourner à la main`,
                  onclick: () => revelerALaMain(rang),
                },
                rangAffiche,
                el('span', { class: 'top5__cache' }),
              ),
            );
          }
          const texte = reponseAffichee(reponse);
          let gagnant = null;
          if (trouvee && avecPrenoms) {
            gagnant = attribues.has(rang)
              ? el('span', { class: 'top5__gagnant' }, `+${valeur} ${attribues.get(rang)}`)
              : el(
                  'button',
                  {
                    type: 'button',
                    class: 'bouton top5__attribuer',
                    'aria-label': `Attribuer les ${points(valeur)} de « ${texte} »`,
                    onclick: () => attribuer(rang),
                  },
                  icone('trophy'),
                  'Attribuer',
                );
          }
          return el(
            'li',
            {
              class: `top5__case top5__case--${trouvee ? 'trouvee' : 'manquee'}${rang === apparue ? ' top5__case--apparue' : ''}`,
            },
            rangAffiche,
            el('span', { class: 'top5__reponse' }, texte),
            gagnant,
            el('span', { class: 'top5__points' }, points(valeur)),
          );
        }),
      );
    }

    function dessinerEtat() {
      remplir(score, `${points(manche.points)} sur ${POINTS_PAR_QUESTION}`);
      remplir(
        erreurs,
        el('span', { class: 'top5__erreurs-libelle' }, 'Erreurs'),
        Array.from({ length: erreursMax }, (_, i) =>
          el(
            'span',
            {
              class: `top5__x${i < manche.erreurs ? ' top5__x--pleine' : ''}`,
              'aria-hidden': 'true',
            },
            icone('xmark'),
          ),
        ),
        el('span', { class: 'visuellement-cache' }, `${manche.erreurs} sur ${erreursMax}`),
      );
    }

    function dessinerActions() {
      if (manche.finie) {
        const suite = () => {
          touches = {};
          if (derniere) {
            ctx.terminer({
              message: `Le groupe a trouvé ${points(total)} sur ${questions.length * POINTS_PAR_QUESTION}.`,
            });
            return;
          }
          index += 1;
          afficherQuestion();
        };
        touches = { entree: suite };
        const bouton = el(
          'button',
          { type: 'button', class: 'bouton bouton--sombre bouton--grand', onclick: suite },
          derniere ? 'Voir le classement' : 'Question suivante',
          aideClavier('Entrée'),
        );
        remplir(actions, bouton);
        return bouton;
      }
      remplir(
        actions,
        el(
          'button',
          { type: 'button', class: 'bouton bouton--danger', onclick: compterErreur },
          icone('xmark'),
          'Mauvaise réponse',
        ),
        el(
          'button',
          { type: 'button', class: 'bouton bouton--discret', onclick: abandonner },
          icone('eye'),
          'Tout dévoiler',
        ),
      );
      return null;
    }

    function dessiner(apparue = -1) {
      dessinerTableau(apparue);
      dessinerEtat();
      return dessinerActions();
    }

    function trouver(rang) {
      // La dernière réponse du top 5 : directement le bilan, qui la retourne aussi
      if (manche.finie) {
        conclure(rang);
        return;
      }
      const valeur = pointsDuRang(rang);
      const texte = reponseAffichee(reponses[rang]);
      remplir(message, icone('circle-check'), `« ${texte} » : ${points(valeur)} !`);
      dessiner(rang);
      // L'illustration et le son une fois le tableau à jour
      illustration.reagir('hop');
      ctx.sons.top.trouvee(valeur);
      ctx.annoncer(`Trouvé : ${texte}, ${points(valeur)}.`);
    }

    function erreur(texte) {
      remplir(
        message,
        icone('circle-xmark'),
        texte ? `« ${texte} » n’est pas dans le top 5.` : 'Ce n’est pas dans le top 5.',
      );
      ctx.annoncer(`Erreur ${manche.erreurs} sur ${erreursMax}.`);
      if (manche.finie) conclure();
      else dessinerEtat();
      // Les animations et le son une fois la page à jour
      illustration.reagir('secousse');
      animer(croix, 'top5__croix--visible');
      ctx.sons.top.erreur();
    }

    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      const texte = saisie.value.trim();
      const resultat = manche.proposer(texte);
      if (!resultat || resultat.resultat === 'vide') return;
      if (resultat.resultat === 'ambigu') {
        // On garde la saisie : il suffit de la compléter
        remplir(
          message,
          icone('circle-question'),
          `« ${texte} » se trouve dans plusieurs réponses : précisez.`,
        );
        animer(message, 'secousse');
        saisie.select();
        return;
      }
      saisie.value = '';
      if (resultat.resultat === 'trouvee') trouver(resultat.rang);
      else if (resultat.resultat === 'deja') {
        remplir(
          message,
          icone('rotate-left'),
          `« ${reponseAffichee(reponses[resultat.rang])} » est déjà au tableau !`,
        );
        animer(message, 'secousse');
      } else erreur(texte);
    });

    async function revelerALaMain(rang) {
      const confirme = await ctx.confirmer({
        titre: `Retourner la réponse ${rang + 1} ?`,
        message: `Le groupe l’a trouvée, dite autrement : elle se retourne et rapporte ${points(pointsDuRang(rang))}.`,
        oui: 'Retourner',
      });
      if (!confirme || !manche.reveler(rang)) return;
      trouver(rang);
      if (!manche.finie) saisie.focus();
    }

    function compterErreur() {
      if (!manche.compterErreur()) return;
      erreur('');
      if (!manche.finie) saisie.focus();
    }

    function abandonner() {
      if (!manche.abandonner()) return;
      conclure();
    }

    async function attribuer(rang) {
      const [prenom] = await ctx.choisirPrenoms({
        titre: `Qui a trouvé « ${reponseAffichee(reponses[rang])} » ?`,
        message: `${points(pointsDuRang(rang))} pour cette réponse.`,
      });
      if (!prenom || attribues.has(rang)) return;
      attribues.set(rang, prenom);
      ctx.scores.ajouter(prenom, pointsDuRang(rang));
      ctx.sons.ding();
      dessinerTableau();
      if (!manche.finie) saisie.focus();
    }

    /** `apparue` : la réponse qui finit le top 5, qui se retourne avec le bilan. */
    function conclure(apparue = -1) {
      total += manche.points;
      saisie.disabled = true;
      formulaire.hidden = true;
      const bilans = {
        complet: 'Les 5 réponses sont trouvées, bravo !',
        erreurs: `${erreursMax} erreurs : la manche s’arrête.`,
        abandon: 'Voici les réponses qui manquaient.',
      };
      remplir(
        message,
        el('strong', {}, bilans[manche.issue]),
        ` Le groupe marque ${points(manche.points)} sur ${POINTS_PAR_QUESTION}.`,
      );
      const bouton = dessiner(apparue);
      bouton?.focus();
      // L'illustration et les sons une fois le bilan affiché
      if (manche.issue === 'complet') {
        illustration.etat('complet');
        illustration.reagir('fete');
        ctx.sons.top.complet();
      } else {
        ctx.sons.top.devoile();
      }
      ctx.annoncer(`${bilans[manche.issue]} ${points(manche.points)} sur ${POINTS_PAR_QUESTION}.`);
    }

    remplir(ctx.zone, panneau);
    dessiner();
    saisie.focus();
  }

  afficherQuestion();
  return () => retirerClavier();
}

monterJeu({
  slug: 'top-5',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des questions « Citez… » et leurs 5 réponses, de la plus attendue à la moins attendue.',
    'Le groupe propose des réponses à l’oral, vous les tapez : une réponse du top 5 se retourne au tableau. Un seul de ses mots suffit (« passe » pour « Mot de passe »).',
    'La plus attendue rapporte 5 points, la moins attendue 1 point : attribuez-les à qui l’a trouvée.',
    'Une proposition absente du tableau est une erreur. Au bout de 3 erreurs (réglable), la manche s’arrête et le reste se dévoile.',
  ],
  demarrer,
});
