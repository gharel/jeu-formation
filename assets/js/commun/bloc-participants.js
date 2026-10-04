/**
 * Bloc « Participants » : ajout de prénoms (plusieurs à la fois), une info par personne,
 * retrait, liste effacée. Il sert sur l'accueil de chaque jeu et sur la page « Le groupe ».
 * `designer` (facultatif) : la roue, pour le bouton « Désigner quelqu'un ».
 */
import * as listeParticipants from './participants.js';
import { el, remplir, icone } from './ui.js';
import { confirmer, modifierInfo } from './dialogues.js';
import { etiquetteInfo } from './groupe.js';

export function creerBlocParticipants(groupe, { designer = null } = {}) {
  const bloc = el('section', {
    class: 'carte bloc-participants',
    'aria-labelledby': 'titre-participants',
  });
  const champ = el('input', {
    id: 'nouveau-prenom',
    type: 'text',
    class: 'champ__controle',
    autocomplete: 'off',
    maxlength: 200,
    placeholder: 'Ex. : Marie, Paul, Léa',
    'aria-describedby': 'aide-prenoms',
  });
  const liste = el('ul', { class: 'puces', 'aria-label': 'Participants' });
  const compteur = el('p', { class: 'bloc-participants__compte' });
  const boutonRoue = designer
    ? el(
        'button',
        { type: 'button', class: 'bouton', onclick: () => designer() },
        icone('arrows-spin'),
        'Désigner quelqu’un',
      )
    : null;
  const boutonEffacer = el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--discret',
      onclick: async () => {
        if (
          await confirmer({
            titre: 'Effacer la liste ?',
            message: 'Tous les prénoms (et leurs infos) seront retirés.',
            oui: 'Effacer',
          })
        ) {
          groupe.changerParticipants([]);
          dessiner();
          champ.focus();
        }
      },
    },
    'Effacer la liste',
  );

  function dessiner() {
    remplir(
      liste,
      groupe.participants.map((prenom) =>
        el(
          'li',
          { class: 'puce' },
          el('span', { class: 'puce__prenom' }, prenom),
          etiquetteInfo(groupe, prenom, 'puce__info'),
          el(
            'button',
            {
              type: 'button',
              class: 'puce__retirer puce__modifier',
              'aria-label': listeParticipants.infoDe(groupe.infos, prenom)
                ? `Modifier l’info sur ${prenom}`
                : `Ajouter une info sur ${prenom}`,
              title: 'Une info sur cette personne (passion, film, dessert…)',
              onclick: async () => {
                const reponse = await modifierInfo({
                  prenom,
                  info: listeParticipants.infoDe(groupe.infos, prenom),
                  themes: listeParticipants.THEMES,
                });
                if (reponse)
                  groupe.changerInfos(listeParticipants.definirInfo(groupe.infos, prenom, reponse));
                dessiner();
              },
            },
            icone('pen'),
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'puce__retirer',
              'aria-label': `Retirer ${prenom}`,
              onclick: () => {
                groupe.changerParticipants(listeParticipants.retirer(groupe.participants, prenom));
                dessiner();
                champ.focus();
              },
            },
            icone('xmark'),
          ),
        ),
      ),
    );
    remplir(
      compteur,
      groupe.participants.length
        ? `${groupe.participants.length} participant${groupe.participants.length > 1 ? 's' : ''}`
        : 'Aucun participant : on peut jouer sans prénoms, mais sans classement.',
    );
    if (boutonRoue) boutonRoue.disabled = groupe.participants.length < 2;
    boutonEffacer.hidden = groupe.participants.length === 0;
  }

  const theme = el(
    'select',
    { id: 'nouveau-theme', class: 'champ__controle ajout-prenom__theme' },
    listeParticipants.THEMES.map((t) => el('option', { value: t.valeur }, t.libelle)),
  );
  const info = el('input', {
    id: 'nouvelle-info',
    type: 'text',
    class: 'champ__controle',
    autocomplete: 'off',
    maxlength: listeParticipants.LONGUEUR_INFO,
    placeholder: 'Ex. : la guitare, le tiramisu…',
    'aria-describedby': 'aide-info',
  });

  const formulaire = el(
    'form',
    {
      class: 'ajout-prenom',
      onsubmit: (e) => {
        e.preventDefault();
        if (!champ.value.trim()) return;
        groupe.changerParticipants(listeParticipants.ajouter(groupe.participants, champ.value));
        // L'info ne s'applique que si un seul prénom est saisi
        const saisis = champ.value
          .split(/[,;\n]/)
          .map(listeParticipants.normaliserPrenom)
          .filter(Boolean);
        if (saisis.length === 1 && info.value.trim()) {
          const cible = groupe.participants.find(
            (p) => p.toLocaleLowerCase('fr') === saisis[0].toLocaleLowerCase('fr'),
          );
          if (cible) {
            groupe.changerInfos(
              listeParticipants.definirInfo(groupe.infos, cible, {
                theme: theme.value,
                texte: info.value,
              }),
            );
          }
        }
        champ.value = '';
        info.value = '';
        dessiner();
        champ.focus();
      },
    },
    el('label', { for: 'nouveau-prenom', class: 'champ__libelle' }, 'Ajouter un prénom'),
    el(
      'div',
      { class: 'champ__ligne' },
      champ,
      el('button', { type: 'submit', class: 'bouton' }, 'Ajouter'),
    ),
    el(
      'p',
      { id: 'aide-prenoms', class: 'champ__aide' },
      'Plusieurs à la fois ? Séparez-les par des virgules. La liste sert pour tous les jeux.',
    ),
    el(
      'p',
      { class: 'champ__libelle ajout-prenom__info-titre', id: 'titre-info' },
      'Une info sur la personne (facultatif)',
    ),
    el(
      'div',
      {
        class: 'champ__ligne ajout-prenom__info',
        role: 'group',
        'aria-labelledby': 'titre-info',
      },
      el('label', { for: 'nouveau-theme', class: 'visuellement-cache' }, 'Thème de l’info'),
      theme,
      el('label', { for: 'nouvelle-info', class: 'visuellement-cache' }, 'Info'),
      info,
    ),
    el(
      'p',
      { id: 'aide-info', class: 'champ__aide' },
      'Sa passion, son film ou son dessert préféré… La roue l’affiche quand elle désigne la personne. Modifiable avec le crayon. Rien ne sort de ce navigateur.',
    ),
  );
  dessiner();
  bloc.append(
    el('h3', { id: 'titre-participants' }, 'Participants'),
    formulaire,
    compteur,
    liste,
    el('div', { class: 'groupe-boutons' }, boutonRoue, boutonEffacer),
  );
  return bloc;
}
