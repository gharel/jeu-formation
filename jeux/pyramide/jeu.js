import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
} from '../../assets/js/commun/ui.js';
import { elementsDeListe } from '../../assets/js/commun/contenu.js';
import { schema, exemple } from './exemple.js';
import { NOMBRE_INDICES, pointsPourIndice, nombreDeLettres } from './logique.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Cases du mot : une case par lettre, les espaces et tirets restent visibles. */
function casesDuMot(mot, revele) {
  return [...String(mot).trim()].map((c) => {
    if (/\p{L}/u.test(c)) {
      return el(
        'span',
        { class: `pyramide__case${revele ? ' pyramide__case--revelee' : ''}` },
        revele ? c.toUpperCase() : '',
      );
    }
    return el('span', { class: 'pyramide__separateur' }, c === ' ' ? '' : c);
  });
}

function demarrer(ctx) {
  const mots = ctx.elements.map((e) => ({
    mot: e.mot.trim(),
    indices: elementsDeListe(e.indices),
  }));
  const { afficherLongueur } = ctx.reglages;
  let index = 0;
  let actionEspace = null;
  const retirerClavier = ecouterClavier({ Espace: () => actionEspace?.() });

  function afficherMot() {
    const { mot, indices } = mots[index];
    let affiches = 1;
    let fini = false;

    const surtitre = el('p', { class: 'panneau__surtitre' }, `Mot ${index + 1} sur ${mots.length}`);
    const longueur = el('div', {
      class: 'pyramide__mot',
      role: 'group',
      'aria-label': 'Mot à deviner',
    });
    const etages = el('ol', { class: 'pyramide__etages', 'aria-label': 'Indices' });
    const actions = el('div', { class: 'actions-jeu' });
    const resultat = el('div', { class: 'pyramide__resultat', 'aria-live': 'polite' });

    function dessinerLongueur(revele) {
      if (!afficherLongueur && !revele) {
        longueur.hidden = true;
        return;
      }
      longueur.hidden = false;
      remplir(
        longueur,
        el('div', { class: 'pyramide__cases' }, casesDuMot(mot, revele)),
        revele
          ? null
          : el('p', { class: 'pyramide__nombre' }, pluriel(nombreDeLettres(mot), 'lettre')),
      );
    }

    function dessinerEtages() {
      remplir(
        etages,
        indices.slice(0, NOMBRE_INDICES).map((indice, i) => {
          const visible = i < affiches;
          const courant = !fini && i === affiches - 1;
          const points = pointsPourIndice(i + 1);
          return el(
            'li',
            {
              class: `pyramide__etage pyramide__etage--${i + 1}${visible ? ' pyramide__etage--visible' : ''}${courant ? ' pyramide__etage--courant' : ''}`,
            },
            el('span', { class: 'pyramide__points' }, pluriel(points, 'point')),
            el(
              'span',
              { class: 'pyramide__indice' },
              visible ? indice : el('span', { class: 'visuellement-cache' }, 'Indice caché'),
            ),
          );
        }),
      );
    }

    function dessinerActions() {
      if (fini) return;
      const points = pointsPourIndice(affiches);
      const trouve = el(
        'button',
        { type: 'button', class: 'bouton bouton--succes bouton--grand', onclick: () => trouver() },
        icone('check'),
        `Trouvé ! (${pluriel(points, 'point')})`,
      );
      const suivant =
        affiches < indices.length
          ? el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--principal bouton--grand',
                onclick: () => indiceSuivant(),
              },
              'Indice suivant (Espace)',
            )
          : el(
              'button',
              { type: 'button', class: 'bouton bouton--grand', onclick: () => conclure(null, 0) },
              'Personne n’a trouvé',
            );
      actionEspace = affiches < indices.length ? indiceSuivant : null;
      remplir(actions, trouve, suivant);
    }

    function indiceSuivant() {
      if (fini || affiches >= indices.length) return;
      affiches += 1;
      ctx.sons.tic();
      dessinerEtages();
      dessinerActions();
      animer(etages.children[affiches - 1], 'apparition');
      ctx.annoncer(`Indice ${affiches} : ${indices[affiches - 1]}`);
    }

    async function trouver() {
      const points = pointsPourIndice(affiches);
      let prenom = null;
      if (ctx.participants.length) {
        const [choisi] = await ctx.choisirPrenoms({
          titre: `Qui a trouvé ? (${pluriel(points, 'point')})`,
          libelleAucun: 'Annuler',
        });
        if (!choisi) return;
        prenom = choisi;
        ctx.scores.ajouter(prenom, points);
      }
      ctx.sons.succes();
      conclure(prenom, points);
    }

    function conclure(prenom, points) {
      const trouve = points > 0;
      fini = true;
      actionEspace = null;
      if (!trouve) ctx.sons.erreur();
      affiches = indices.length;
      dessinerEtages();
      dessinerLongueur(true);
      const dernier = index === mots.length - 1;
      const titre = el(
        'p',
        { class: 'pyramide__verdict' },
        trouve
          ? [icone('face-grin-stars'), `Trouvé${prenom ? ` par ${prenom}` : ''} !`]
          : [icone('hourglass-end'), 'Personne n’a trouvé…'],
      );
      remplir(
        resultat,
        titre,
        prenom
          ? el(
              'p',
              { class: 'pyramide__gain' },
              icone('check'),
              `+${pluriel(points, 'point')} pour ${prenom}`,
            )
          : null,
      );
      const suite = () => {
        if (dernier) {
          ctx.terminer({ message: 'Tous les mots de la pyramide ont été joués.' });
          return;
        }
        index += 1;
        afficherMot();
      };
      actionEspace = suite;
      remplir(
        actions,
        el(
          'button',
          { type: 'button', class: 'bouton bouton--sombre bouton--grand', onclick: suite },
          dernier ? 'Voir le classement' : ['Mot suivant', icone('arrow-right')],
        ),
      );
      animer(resultat, 'apparition');
      ctx.annoncer(`Le mot était : ${mot}`);
      focaliser(titre);
    }

    remplir(
      ctx.zone,
      el('div', { class: 'panneau pyramide' }, surtitre, longueur, etages, resultat, actions),
    );
    dessinerLongueur(false);
    dessinerEtages();
    dessinerActions();
    actions.querySelector('.bouton--principal')?.focus();
  }

  afficherMot();
  return () => retirerClavier();
}

monterJeu({
  slug: 'pyramide',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des mots à deviner, chacun avec 3 indices d’un seul mot.',
    'Le premier indice s’affiche en haut de la pyramide : trouvé tout de suite, c’est 3 points !',
    'Personne ne trouve ? Indice suivant (Espace) : 2 points, puis 1 point au dernier indice.',
    'Quelqu’un trouve : cliquez « Trouvé ! » puis son prénom.',
  ],
  demarrer,
});
