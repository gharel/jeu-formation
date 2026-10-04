/**
 * Bloc « Participants » de la page « Le groupe » : ajout de prénoms (plusieurs à la fois), une
 * info par personne, absence du jour, retrait, liste effacée. Dans les jeux, le bloc « Qui
 * joue ? » (bloc-joueurs.js) choisit les joueurs parmi ce groupe.
 */
import * as listeParticipants from './participants.js';
import { el, remplir, icone } from './ui.js';
import { confirmer, modifierInfo } from './dialogues.js';
import { etiquetteInfo } from './groupe.js';

export function creerBlocParticipants(groupe) {
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
  const homonymes = el('p', { class: 'ajout-prenom__homonymes', role: 'status' });
  const compteur = el('p', { class: 'bloc-participants__compte' });
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
      groupe.participants.map((prenom) => {
        const absent = groupe.estAbsent(prenom);
        return el(
          'li',
          { class: `puce${absent ? ' puce--absente' : ''}` },
          el('span', { class: 'puce__prenom' }, prenom),
          absent ? el('span', { class: 'puce__absence' }, 'absence') : null,
          etiquetteInfo(groupe, prenom, 'puce__info'),
          // Absence du jour : la personne reste dans le groupe, mais ne joue pas
          el(
            'button',
            {
              type: 'button',
              class: 'puce__retirer puce__basculer-absence',
              dataset: { absence: prenom },
              'aria-pressed': String(absent),
              'aria-label': `Absence aujourd’hui : ${prenom}`,
              title: absent
                ? 'De retour : la personne rejoue'
                : 'Absence aujourd’hui : la personne ne joue pas et la roue ne la tire pas',
              onclick: () => {
                groupe.basculerAbsent(prenom);
                dessiner();
                liste.querySelector(`[data-absence="${CSS.escape(prenom)}"]`)?.focus();
              },
            },
            icone(absent ? 'user-check' : 'user-slash'),
          ),
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
        );
      }),
    );
    const total = groupe.participants.length;
    const absences = groupe.absents.length;
    remplir(
      compteur,
      total
        ? `${total} participant${total > 1 ? 's' : ''}${absences ? ` · ${absences} absence${absences > 1 ? 's' : ''} aujourd’hui` : ''}`
        : 'Aucun participant : on peut jouer sans prénoms, mais sans classement.',
    );
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
        const { liste: nouvelle, ajouts } = listeParticipants.ajouterPrenoms(
          groupe.participants,
          champ.value,
        );
        groupe.changerParticipants(nouvelle);
        // Un homonyme reçoit un numéro (« Marie 2 ») : on le dit
        remplir(homonymes, listeParticipants.messageHomonymes(ajouts));
        // L'info ne s'applique que si un seul prénom est saisi
        if (ajouts.length === 1 && info.value.trim()) {
          groupe.changerInfos(
            listeParticipants.definirInfo(groupe.infos, ajouts[0].prenom, {
              theme: theme.value,
              texte: info.value,
            }),
          );
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
      'Plusieurs à la fois ? Séparez-les par des virgules. Deux personnes ont le même prénom ? La deuxième devient « Marie 2 » (ou écrivez « Marie\u00a0D. »). La liste sert pour tous les jeux.',
    ),
    homonymes,
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
  // Groupe remplacé ailleurs (fichier importé) : la liste suit
  groupe.surChangement(dessiner);
  bloc.append(
    el('h3', { id: 'titre-participants' }, 'Participants'),
    formulaire,
    compteur,
    liste,
    el('div', { class: 'groupe-boutons' }, boutonEffacer),
  );
  return bloc;
}
