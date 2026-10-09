/**
 * Page d'accueil : une carte par jeu, générée à partir de la liste des jeux,
 * et un bouton qui tire un jeu au hasard avec la roue.
 */
import { JEUX, libelleCourt } from './jeux.js';
import { el, remplir, icone } from './commun/ui.js';
import { hasardDePage } from './commun/hasard.js';
import { creerTirage } from './commun/roue.js';
import { tirerAvecRoue } from './commun/dialogues.js';
import { exigerAcces, verrouiller } from './commun/acces.js';
import { charger as chargerParticipants } from './commun/participants.js';
import { creerHautDePage } from './commun/haut-de-page.js';

await exigerAcces();
creerHautDePage();

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
        el('span', { class: 'carte-jeu__icone' }, icone(jeu.icone)),
        el('span', { class: 'carte-jeu__duree' }, icone('clock', { style: 'regular' }), jeu.duree),
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
        el(
          'p',
          { class: 'carte-jeu__jouer', 'aria-hidden': 'true' },
          'Jouer',
          icone('arrow-right', { classe: 'icone--apres' }),
        ),
      ),
    ),
  );
}

remplir(document.getElementById('grille-jeux'), JEUX.map(carteJeu));

// « Le groupe · 8 participants » : la liste sert à tous les jeux. Sur un écran étroit, la
// seule coupure possible est après le point : « Le groupe · » puis « 8 participants »,
// jamais « Le » ou « 8 » seuls sur leur ligne.
const libelleGroupe = document.getElementById('libelle-groupe');
const nombre = chargerParticipants().length;
const compte = nombre ? `${nombre}\u00a0participant${nombre > 1 ? 's' : ''}` : 'à\u00a0saisir';
libelleGroupe?.append(el('span', { class: 'heros__compte' }, `\u00a0· ${compte}`));

const bouton = document.getElementById('jeu-hasard');
const hasard = hasardDePage();
const tirage = creerTirage(
  JEUX.map((j) => j.slug),
  { equitable: true, hasard },
);
bouton.hidden = false;
bouton.addEventListener('click', async () => {
  const index = await tirerAvecRoue({
    titre: 'Quel jeu pour réveiller la salle ?',
    libelles: JEUX.map(libelleCourt),
    tirage,
    hasard,
    resultatDe: (i) => [icone(JEUX[i].icone), JEUX[i].titre],
    detailDe: (i) => JEUX[i].accroche,
    libelleValider: (i) => [`Jouer à ${JEUX[i].titre}`, icone('arrow-right')],
    optionsRoue: { longueurMax: 16, taillePolice: 7.5 },
  });
  if (index !== null) window.location.href = `jeux/${JEUX[index].slug}/`;
});

document.querySelector('.pied')?.append(
  el(
    'p',
    {},
    el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--discret',
        onclick: () => {
          verrouiller();
          window.location.reload();
        },
      },
      icone('lock'),
      'Verrouiller l’accès sur cet ordinateur',
    ),
  ),
);
