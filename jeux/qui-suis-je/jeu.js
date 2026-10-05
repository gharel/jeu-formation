import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, icone, focaliser } from '../../assets/js/commun/ui.js';
import { creerMancheAPaliers } from '../../assets/js/commun/manche-paliers.js';
import { elementsDeListe } from '../../assets/js/commun/contenu.js';
import { schema, exemple } from './exemple.js';
import { indicesVisibles } from './logique.js';
import { creerIllustrationQuiSuisJe } from './illustration.js';

function demarrer(ctx) {
  const mysteres = ctx.elements.map((e) => ({
    reponse: e.reponse,
    indices: elementsDeListe(e.indices),
  }));
  let index = 0;
  let manche = null;
  // Le personnage masqué : sa bulle passe de « ? » à « ! » quand on trouve
  const illustration = creerIllustrationQuiSuisJe();

  function afficherMystere() {
    manche?.detruire();
    illustration.etat(null);
    const { reponse, indices } = mysteres[index];
    const liste = el('ol', {
      class: 'qsj__indices',
      'aria-label': 'Indices',
      'aria-live': 'polite',
    });
    // L'animation d'apparition se joue d'elle-même quand le résultat cesse d'être caché
    const resultat = el('div', { class: 'qsj__resultat apparition', hidden: true });
    let affiches = 0;

    function montrerIndices(n) {
      while (affiches < n) {
        const li = el('li', { class: 'qsj__indice apparition' }, indices[affiches]);
        liste.append(li);
        affiches += 1;
      }
      const derniers = liste.querySelectorAll('.qsj__indice');
      derniers.forEach((li, i) =>
        li.classList.toggle('qsj__indice--dernier', i === derniers.length - 1),
      );
    }

    manche = creerMancheAPaliers({
      ctx,
      dureePalier: ctx.reglages.dureePalier,
      surValeur: (valeur) => montrerIndices(indicesVisibles(valeur, indices.length)),
      surFin({ trouve, prenom, points }) {
        ctx.zone.querySelector('.panneau')?.classList.add('manche-finie');
        montrerIndices(indices.length);
        const dernier = index === mysteres.length - 1;
        const titre = el(
          'p',
          { class: 'qsj__verdict' },
          trouve
            ? [icone('face-grin-stars'), 'Bien joué !']
            : [icone('hourglass-end'), 'Personne n’a trouvé…'],
        );
        remplir(
          resultat,
          titre,
          el(
            'div',
            { class: 'reponse-revelee' },
            el('p', { class: 'panneau__surtitre' }, 'Je suis…'),
            el('p', { class: 'reponse-revelee__valeur' }, reponse),
          ),
          prenom
            ? el(
                'p',
                { class: 'qsj__gain' },
                icone('check'),
                `+${points} point${points > 1 ? 's' : ''} pour ${prenom}`,
              )
            : null,
          el(
            'div',
            { class: 'actions-jeu' },
            el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--sombre bouton--grand',
                onclick: () => {
                  if (dernier) {
                    ctx.terminer({ message: 'Tous les mystères ont été joués.' });
                    return;
                  }
                  index += 1;
                  afficherMystere();
                },
              },
              dernier ? 'Voir le classement' : ['Mystère suivant', icone('arrow-right')],
            ),
          ),
        );
        resultat.hidden = false;
        // L'illustration réagit une fois l'écran de réponse construit
        if (trouve) illustration.etat('trouve');
        illustration.reagir(trouve ? 'fete' : 'secousse');
        ctx.annoncer(`La réponse était : ${reponse}`);
        focaliser(titre);
      },
    });

    const question = el('h3', { class: 'panneau__texte qsj__question' }, 'Qui suis-je ?');
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau qsj' },
        el('p', { class: 'panneau__surtitre' }, `Mystère ${index + 1} sur ${mysteres.length}`),
        el('div', { class: 'qsj__haut' }, illustration.element, manche.paliers, question),
        el('div', { class: 'qsj__corps' }, liste, resultat),
        manche.actions,
        el('p', { class: 'raccourci' }, el('kbd', {}, 'Espace'), ' : démarrer, stop, reprendre'),
      ),
    );
    manche.actions.querySelector('button')?.focus();
  }

  afficherMystere();
  return () => manche?.detruire();
}

monterJeu({
  slug: 'qui-suis-je',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des mystères (un logiciel, un terme, une touche…) avec 3 à 5 indices.',
    'Les chiffres 5 4 3 2 1 s’éteignent un à un : à chaque fois, un nouvel indice apparaît.',
    'Quelqu’un lève la main ? Appuyez sur Stop (Espace) : le temps se fige pendant sa réponse.',
    'Bonne réponse : la personne gagne les points encore allumés. Plus on tarde, moins on marque !',
  ],
  demarrer,
});
