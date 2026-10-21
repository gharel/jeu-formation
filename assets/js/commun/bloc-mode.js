/**
 * Bloc « Mode de jeu » de l'accueil d'un jeu : chacun pour soi, par équipes, ou équipes et
 * joueurs (mode-jeu.js), et qui joue contre qui. Les équipes se composent sur la page « Le
 * groupe » ; ici, on peut les former au hasard parmi les joueurs de la partie, ou y placer ceux
 * qui n'en ont pas, sans quitter le jeu.
 *
 * creerBlocMode(groupe, { mode, surMode, joueurs, equipesEnJeu, hasard, cooperatif })
 * → { element, actualiser() }
 * - mode : le mode choisi ; surMode(nouveau) : appelé à chaque changement ;
 * - joueurs() : les joueurs de la partie ; equipesEnJeu() : les équipes réduites à ces joueurs ;
 * - cooperatif : tout le groupe joue ensemble (le mode dit seulement qui reçoit les points).
 */
import { MODES, avecEquipes, equipesSuffisantes } from './mode-jeu.js';
import { NOMBRE_EQUIPES_MAX, completerEquipes, repartirAuHasard, sansEquipe } from './equipes.js';
import { confirmer } from './dialogues.js';
import { sons } from './sons.js';
import { el, remplir, icone, annoncer } from './ui.js';

/** Adresse de la page « Le groupe », depuis n'importe quelle page du site. */
const PAGE_GROUPE = new URL('../../../groupe/', import.meta.url).href;

export function creerBlocMode(
  groupe,
  { mode, surMode, joueurs, equipesEnJeu, hasard, cooperatif = false },
) {
  let actuel = mode;
  let nombreEquipes = 2;
  const bloc = el('section', { class: 'carte bloc-mode', 'aria-labelledby': 'titre-mode' });
  const corps = el('div', { class: 'bloc-mode__corps' });

  function choisir(nouveau) {
    actuel = nouveau;
    surMode(nouveau);
    dessiner();
  }

  async function former() {
    const presents = joueurs();
    const dejaFormees = groupe.equipes.some((e) => e.membres.length);
    if (
      dejaFormees &&
      !(await confirmer({
        titre: 'Former les équipes au hasard ?',
        message: `Les équipes du groupe sont refaites au hasard parmi les ${presents.length} joueurs de la partie. Les autres personnes du groupe se retrouvent sans équipe.`,
        oui: 'Former au hasard',
      }))
    ) {
      return;
    }
    groupe.changerEquipes(repartirAuHasard(groupe.equipes, presents, nombreEquipes, hasard));
    sons.ding();
    annoncer(
      equipesEnJeu()
        .map((e) => `${e.nom} : ${e.membres.join(', ')}`)
        .join('. '),
    );
  }

  function completer() {
    groupe.changerEquipes(completerEquipes(groupe.equipes, joueurs()));
    annoncer('Chaque joueur a maintenant une équipe.');
  }

  function dessinerModes() {
    return el(
      'fieldset',
      { class: 'segments segments--mode' },
      el('legend', { class: 'visuellement-cache' }, 'Mode de jeu'),
      MODES.map((m) =>
        el(
          'label',
          { class: 'segment' },
          el('input', {
            type: 'radio',
            name: 'mode-jeu',
            value: m.valeur,
            class: 'visuellement-cache',
            checked: actuel === m.valeur,
            onchange: () => choisir(m.valeur),
          }),
          m.libelle,
        ),
      ),
    );
  }

  /** Qui joue contre qui : une carte par équipe, ses joueurs dessous, « contre » entre deux. */
  function dessinerAffiche(equipes) {
    return el(
      'ul',
      { class: 'affiche-equipes', 'aria-label': 'Qui joue contre qui' },
      equipes.flatMap((e, i) => [
        i ? el('li', { class: 'affiche-equipes__contre', 'aria-hidden': 'true' }, 'contre') : null,
        el(
          'li',
          { class: 'affiche-equipes__equipe' },
          el(
            'span',
            { class: 'affiche-equipes__nom' },
            icone('people-group'),
            e.nom,
            el('span', { class: 'affiche-equipes__nombre' }, ` · ${e.membres.length}`),
          ),
          el('span', { class: 'affiche-equipes__membres' }, e.membres.join(', ')),
        ),
      ]),
    );
  }

  function dessinerFormation(n) {
    const max = Math.min(NOMBRE_EQUIPES_MAX, n);
    if (max < 2) return null;
    nombreEquipes = Math.min(Math.max(2, nombreEquipes), max);
    const nombre = el(
      'select',
      {
        id: 'mode-nombre-equipes',
        class: 'champ__controle champ__controle--court',
        onchange: (e) => {
          nombreEquipes = Number(e.target.value);
        },
      },
      Array.from({ length: max - 1 }, (_, i) =>
        el('option', { value: String(i + 2) }, `${i + 2} équipes`),
      ),
    );
    nombre.value = String(nombreEquipes);
    return el(
      'div',
      { class: 'bloc-mode__formation' },
      el('label', { for: 'mode-nombre-equipes', class: 'visuellement-cache' }, 'Nombre d’équipes'),
      nombre,
      el(
        'button',
        { type: 'button', class: 'bouton', onclick: () => former() },
        icone('shuffle'),
        'Former au hasard',
      ),
    );
  }

  function dessiner() {
    const presents = joueurs();
    const equipes = equipesEnJeu();
    const assez = equipesSuffisantes(equipes);
    const description = MODES.find((m) => m.valeur === actuel)?.aide ?? '';
    const enEquipes = avecEquipes(actuel);
    const seuls = assez ? sansEquipe(groupe.equipes, presents) : [];
    let etat = null;
    if (enEquipes && !assez) {
      etat = el(
        'p',
        { class: 'bloc-mode__alerte', role: 'status' },
        icone('triangle-exclamation'),
        presents.length < 2
          ? 'Il faut au moins deux joueurs pour jouer en équipes : la partie se jouera chacun pour soi.'
          : 'Formez au moins deux équipes parmi les joueurs : sinon, la partie se jouera chacun pour soi.',
      );
    }
    remplir(
      corps,
      dessinerModes(),
      el('p', { class: 'champ__aide' }, description),
      cooperatif
        ? el(
            'p',
            { class: 'champ__aide' },
            'Jeu coopératif : tout le groupe joue ensemble. Le mode dit qui reçoit les points.',
          )
        : null,
      etat,
      enEquipes && assez ? dessinerAffiche(equipes) : null,
      seuls.length
        ? el(
            'div',
            { class: 'bloc-mode__seuls' },
            el(
              'p',
              { class: 'bloc-mode__alerte' },
              icone('triangle-exclamation'),
              `Sans équipe : ${seuls.join(', ')}.`,
            ),
            el(
              'button',
              { type: 'button', class: 'bouton bouton--discret', onclick: completer },
              icone('user-plus'),
              seuls.length > 1
                ? 'Les placer dans les équipes'
                : `Placer ${seuls[0]} dans une équipe`,
            ),
          )
        : null,
      enEquipes ? dessinerFormation(presents.length) : null,
    );
  }

  bloc.append(
    el(
      'div',
      { class: 'bloc-joueurs__entete' },
      el('h3', { id: 'titre-mode' }, 'Mode de jeu'),
      el(
        'a',
        { class: 'bouton bouton--discret', href: PAGE_GROUPE },
        icone('people-group'),
        'Gérer les équipes',
      ),
    ),
    corps,
  );
  dessiner();
  return { element: bloc, actualiser: dessiner };
}
