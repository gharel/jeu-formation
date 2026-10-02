/**
 * Page d'accueil : une carte par jeu, générée à partir de la liste des jeux.
 */
import { JEUX } from './jeux.js';
import { el, remplir } from './commun/ui.js';

function carteJeu(jeu) {
  return el(
    'li',
    {},
    el(
      'article',
      { class: 'carte-jeu', dataset: { couleur: jeu.couleur, jeu: jeu.slug } },
      el(
        'div',
        { class: 'carte-jeu__entete' },
        el('span', { class: 'carte-jeu__icone', 'aria-hidden': 'true' }, jeu.icone),
        el('span', { class: 'carte-jeu__duree' }, `⏱ ${jeu.duree}`),
      ),
      el(
        'div',
        { class: 'carte-jeu__corps' },
        el('h3', { class: 'carte-jeu__titre' }, el('a', { href: `jeux/${jeu.slug}/` }, jeu.titre)),
        el('p', {}, jeu.accroche),
        el(
          'p',
          { class: 'carte-jeu__preparation' },
          `À préparer : ${jeu.preparation.toLowerCase()}`,
        ),
        el('p', { class: 'carte-jeu__jouer', 'aria-hidden': 'true' }, 'Jouer →'),
      ),
    ),
  );
}

remplir(document.getElementById('grille-jeux'), JEUX.map(carteJeu));
