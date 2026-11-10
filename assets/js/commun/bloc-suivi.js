/**
 * Bloc « Où en est-on ? » de la page « Le groupe » : des notes pour reprendre à la prochaine
 * séance. La diapositive où le groupe s'est arrêté, et les logiciels vus ensemble (ajout de
 * plusieurs à la fois, retrait). Les notes suivent le groupe (suivi.js, groupe.js).
 */
import * as notesSuivi from './suivi.js';
import { el, remplir, icone } from './ui.js';

export function creerBlocSuivi(groupe) {
  const diapositive = el('input', {
    id: 'suivi-diapositive',
    type: 'text',
    class: 'champ__controle',
    autocomplete: 'off',
    maxlength: notesSuivi.LONGUEUR_DIAPOSITIVE,
    placeholder: 'Ex. : diapo 42, les tableaux croisés',
    // Enregistrée à chaque frappe : rien n'est perdu si l'onglet est fermé sans quitter le champ
    oninput: (e) => groupe.changerSuivi({ ...groupe.suivi, diapositive: e.target.value }),
    // Champ quitté : il montre le texte gardé (espaces en trop retirées)
    onchange: (e) => {
      e.target.value = groupe.suivi.diapositive;
    },
  });
  const champ = el('input', {
    id: 'suivi-logiciel',
    type: 'text',
    class: 'champ__controle',
    autocomplete: 'off',
    maxlength: 200,
    placeholder: 'Ex. : Google Sheets, Canva',
    'aria-describedby': 'aide-logiciels',
  });
  const liste = el('ul', { class: 'puces bloc-suivi__logiciels', 'aria-label': 'Logiciels vus' });
  const compteur = el('p', { class: 'bloc-suivi__compte' });
  const message = el('p', { class: 'ajout-prenom__homonymes', role: 'status' });

  function changerLogiciels(logiciels) {
    groupe.changerSuivi({ ...groupe.suivi, logiciels });
    dessiner();
    champ.focus();
  }

  function dessiner() {
    // Pendant la saisie, le champ garde ce qui est tapé (le groupe en garde la version nettoyée)
    if (document.activeElement !== diapositive) diapositive.value = groupe.suivi.diapositive;
    const { logiciels } = groupe.suivi;
    remplir(
      liste,
      logiciels.map((nom) =>
        el(
          'li',
          { class: 'puce' },
          el('span', { class: 'puce__prenom' }, nom),
          el(
            'button',
            {
              type: 'button',
              class: 'puce__retirer',
              'aria-label': `Retirer ${nom} des logiciels vus`,
              onclick: () => {
                remplir(message);
                changerLogiciels(notesSuivi.retirerLogiciel(groupe.suivi.logiciels, nom));
              },
            },
            icone('xmark'),
          ),
        ),
      ),
    );
    const n = logiciels.length;
    remplir(
      compteur,
      n ? `${n} logiciel${n > 1 ? 's' : ''} vu${n > 1 ? 's' : ''}` : 'Aucun logiciel noté.',
    );
  }

  const formulaire = el(
    'form',
    {
      class: 'bloc-suivi__ajout',
      onsubmit: (e) => {
        e.preventDefault();
        if (!champ.value.trim()) return;
        const { liste: nouvelle, ajouts } = notesSuivi.ajouterLogiciels(
          groupe.suivi.logiciels,
          champ.value,
        );
        remplir(
          message,
          ajouts.length
            ? ''
            : nouvelle.length >= notesSuivi.NOMBRE_LOGICIELS_MAX
              ? `La liste est pleine : ${notesSuivi.NOMBRE_LOGICIELS_MAX} logiciels au plus.`
              : 'Déjà noté dans la liste.',
        );
        champ.value = '';
        changerLogiciels(nouvelle);
      },
    },
    el('label', { for: 'suivi-logiciel', class: 'champ__libelle' }, 'Logiciels vus ensemble'),
    el(
      'div',
      { class: 'champ__ligne' },
      champ,
      el(
        'button',
        { type: 'submit', class: 'bouton', 'aria-label': 'Ajouter aux logiciels vus' },
        'Ajouter',
      ),
    ),
    el(
      'p',
      { id: 'aide-logiciels', class: 'champ__aide' },
      'Plusieurs à la fois ? Séparez-les par des virgules.',
    ),
    message,
  );

  dessiner();
  // Groupe remplacé (fichier importé, groupe récent rechargé, tout vidé) : les notes suivent
  groupe.surChangement(dessiner);

  return el(
    'section',
    { class: 'carte bloc-suivi', 'aria-labelledby': 'titre-suivi' },
    el('h3', { id: 'titre-suivi' }, 'Où en est-on ?'),
    el(
      'p',
      { class: 'champ__aide' },
      'Notez où le groupe s’est arrêté pour reprendre au bon endroit à la prochaine séance. Ces notes suivent le groupe : elles sont dans son fichier JSON et dans les groupes récents.',
    ),
    el(
      'div',
      { class: 'bloc-suivi__colonnes' },
      el(
        'div',
        { class: 'champ bloc-suivi__diapositive' },
        el(
          'label',
          { for: 'suivi-diapositive', class: 'champ__libelle' },
          'Diapositive où le groupe s’est arrêté',
        ),
        diapositive,
      ),
      el('div', { class: 'bloc-suivi__vus' }, formulaire, compteur, liste),
    ),
  );
}
