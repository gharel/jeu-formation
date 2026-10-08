/**
 * Bloc « Équipes » de la page « Le groupe » : former des équipes au hasard (parmi les présents) ou
 * à la main, les renommer, changer quelqu'un d'équipe, en ajouter ou en retirer. Dans les jeux,
 * la fenêtre « Qui a trouvé ? » propose chaque équipe : ses points vont à l'équipe et à ses
 * membres. Les équipes passent par groupe.js (equipes.js).
 */
import {
  NOMBRE_EQUIPES_MAX,
  LONGUEUR_NOM_EQUIPE,
  ajouterEquipe,
  retirerEquipe,
  renommerEquipe,
  placerDansEquipe,
  repartirAuHasard,
  sansEquipe,
} from './equipes.js';
import { confirmer, ouvrirDialogue } from './dialogues.js';
import { el, remplir, icone, annoncer } from './ui.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Fenêtre « Équipe de Ana » : une équipe au clic, ou aucune. Résout avec son id, null, ou undefined. */
function choisirEquipe(groupe, prenom) {
  const actuelle = groupe.equipeDe(prenom)?.id ?? null;
  return ouvrirDialogue({
    titre: `Équipe de ${prenom}`,
    classe: 'dialogue--prenoms',
    valeurAnnulation: undefined,
    construire({ corps, pied, fermer }) {
      const choix = (id, contenu) =>
        el(
          'button',
          {
            type: 'button',
            class: 'puce-prenom',
            'aria-current': id === actuelle ? 'true' : null,
            onclick: () => fermer(id),
          },
          contenu,
        );
      corps.append(
        el(
          'div',
          { class: 'grille-prenoms' },
          groupe.equipes.map((e) => choix(e.id, [icone('people-group'), e.nom])),
          choix(null, [icone('user'), 'Sans équipe']),
        ),
      );
      pied.append(
        el(
          'button',
          { type: 'button', class: 'bouton', onclick: () => fermer(undefined) },
          'Annuler',
        ),
      );
    },
  });
}

export function creerBlocEquipes(groupe, { hasard = Math.random } = {}) {
  const contenu = el('div', { class: 'bloc-equipes__contenu' });
  const nombre = el('select', { id: 'nombre-equipes', class: 'champ__controle' });

  /** Bouton d'une personne : il ouvre le choix de son équipe. */
  function puceMembre(prenom) {
    const absent = groupe.estAbsent(prenom);
    return el(
      'li',
      {},
      el(
        'button',
        {
          type: 'button',
          class: `puce puce--bouton${absent ? ' puce--absente' : ''}`,
          dataset: { membre: prenom },
          title: 'Changer d’équipe',
          onclick: async () => {
            const id = await choisirEquipe(groupe, prenom);
            if (id === undefined) return;
            groupe.changerEquipes(placerDansEquipe(groupe.equipes, prenom, id));
            const equipe = groupe.equipeDe(prenom);
            annoncer(equipe ? `${prenom} est dans ${equipe.nom}.` : `${prenom} n’a plus d’équipe.`);
            contenu.querySelector(`[data-membre="${CSS.escape(prenom)}"]`)?.focus();
          },
        },
        el('span', { class: 'puce__prenom' }, prenom),
        absent ? el('span', { class: 'puce__absence' }, 'absence') : null,
        icone('arrow-right-arrow-left', { classe: 'puce__changer' }),
      ),
    );
  }

  function carteEquipe(equipe, numero) {
    const membres = groupe.participants.filter((p) => groupe.equipeDe(p)?.id === equipe.id);
    const idNom = `nom-equipe-${equipe.id}`;
    const champ = el('input', {
      id: idNom,
      type: 'text',
      class: 'champ__controle equipe__nom',
      autocomplete: 'off',
      maxlength: LONGUEUR_NOM_EQUIPE,
      value: equipe.nom,
      onchange: (e) => {
        groupe.changerEquipes(renommerEquipe(groupe.equipes, equipe.id, e.target.value));
        document.getElementById(idNom)?.focus();
      },
    });
    return el(
      'li',
      { class: 'equipe' },
      el(
        'div',
        { class: 'equipe__entete' },
        el('label', { for: idNom, class: 'visuellement-cache' }, `Nom de l’équipe ${numero}`),
        icone('people-group'),
        champ,
        el(
          'button',
          {
            type: 'button',
            class: 'puce__retirer',
            'aria-label': `Retirer l’équipe ${equipe.nom}`,
            title: 'Retirer cette équipe (ses membres restent dans le groupe)',
            onclick: () => groupe.changerEquipes(retirerEquipe(groupe.equipes, equipe.id)),
          },
          icone('xmark'),
        ),
      ),
      el(
        'p',
        { class: 'equipe__compte' },
        membres.length ? pluriel(membres.length, 'membre') : 'Personne pour l’instant',
      ),
      membres.length
        ? el(
            'ul',
            { class: 'puces equipe__membres', 'aria-label': `Membres de ${equipe.nom}` },
            membres.map(puceMembre),
          )
        : null,
    );
  }

  function dessiner() {
    const presents = groupe.presents;
    const { equipes, participants } = groupe;
    // De 2 équipes à une par présent (8 au plus)
    const max = Math.min(NOMBRE_EQUIPES_MAX, Math.max(2, presents.length));
    const voulu = Math.min(max, Math.max(2, equipes.length || 2));
    remplir(
      nombre,
      Array.from({ length: max - 1 }, (_, i) =>
        el('option', { value: String(i + 2), selected: i + 2 === voulu }, `${i + 2} équipes`),
      ),
    );
    nombre.value = String(voulu);

    if (!participants.length) {
      remplir(
        contenu,
        el('p', { class: 'bloc-equipes__etat' }, 'Ajoutez des prénoms pour former des équipes.'),
      );
      return;
    }
    const seuls = sansEquipe(equipes, participants);
    remplir(
      contenu,
      equipes.length
        ? el(
            'ol',
            { class: 'equipes', 'aria-label': 'Équipes' },
            equipes.map((e, i) => carteEquipe(e, i + 1)),
          )
        : el(
            'p',
            { class: 'bloc-equipes__etat' },
            'Pas encore d’équipe : formez-les au hasard, ou ajoutez-en une et composez-la.',
          ),
      equipes.length && seuls.length
        ? el(
            'div',
            { class: 'equipes__seuls' },
            el(
              'p',
              { class: 'champ__libelle', id: 'titre-sans-equipe' },
              `Sans équipe (${seuls.length})`,
            ),
            el(
              'ul',
              { class: 'puces', 'aria-labelledby': 'titre-sans-equipe' },
              seuls.map(puceMembre),
            ),
          )
        : null,
      equipes.length
        ? el(
            'p',
            { class: 'groupe-boutons' },
            el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--discret',
                onclick: async () => {
                  if (
                    await confirmer({
                      titre: 'Supprimer les équipes ?',
                      message:
                        'Les équipes et leurs points disparaissent. Les participants et leurs points restent.',
                      oui: 'Supprimer',
                    })
                  ) {
                    groupe.changerEquipes([]);
                    annoncer('Équipes supprimées');
                  }
                },
              },
              icone('trash-can'),
              'Supprimer les équipes',
            ),
          )
        : null,
    );
  }

  const former = el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--principal',
      onclick: async () => {
        const composees = groupe.equipes.some((e) => e.membres.length);
        if (
          composees &&
          !(await confirmer({
            titre: 'Recomposer les équipes ?',
            message:
              'Les présents sont répartis de nouveau au hasard. Les équipes gardent leur nom et leurs points.',
            oui: 'Recomposer',
          }))
        ) {
          return;
        }
        groupe.changerEquipes(
          repartirAuHasard(groupe.equipes, groupe.presents, Number(nombre.value), hasard),
        );
        annoncer(`${pluriel(groupe.equipes.length, 'équipe')} formées au hasard.`);
      },
    },
    icone('dice'),
    'Former au hasard',
  );
  const ajouter = el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--discret',
      onclick: () => {
        groupe.changerEquipes(ajouterEquipe(groupe.equipes));
        const champs = contenu.querySelectorAll('.equipe__nom');
        champs[champs.length - 1]?.focus();
      },
    },
    icone('plus'),
    'Ajouter une équipe',
  );

  groupe.surChangement(() => {
    dessiner();
    ajouter.disabled = groupe.equipes.length >= NOMBRE_EQUIPES_MAX;
    former.disabled = groupe.presents.length < 2;
  });
  dessiner();
  ajouter.disabled = groupe.equipes.length >= NOMBRE_EQUIPES_MAX;
  former.disabled = groupe.presents.length < 2;

  return el(
    'section',
    { class: 'carte bloc-equipes', 'aria-labelledby': 'titre-equipes' },
    el('h3', { id: 'titre-equipes' }, icone('people-group'), 'Équipes'),
    el(
      'p',
      { class: 'champ__aide' },
      'Pour jouer en équipes : dans les jeux, la fenêtre « Qui a trouvé ? » propose chaque équipe. Ses points vont à l’équipe et à chacun de ses membres. Cliquez sur une personne pour la changer d’équipe.',
    ),
    el(
      'div',
      { class: 'bloc-equipes__former' },
      el(
        'div',
        { class: 'champ' },
        el('label', { for: 'nombre-equipes', class: 'champ__libelle' }, 'Nombre d’équipes'),
        nombre,
      ),
      el('div', { class: 'groupe-boutons' }, former, ajouter),
    ),
    contenu,
  );
}
