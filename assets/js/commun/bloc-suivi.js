/**
 * Bloc « Où en est-on ? » de la page « Le groupe » : des notes pour reprendre à la prochaine
 * séance. Le numéro de la diapositive où le groupe s'est arrêté, et ce qui a été vu ensemble
 * (logiciels, notions, ce qu'il reste à reprendre) en texte libre. Les deux sont enregistrés à
 * chaque frappe et suivent le groupe (suivi.js, groupe.js).
 */
import { DIAPOSITIVE_MAX, LONGUEUR_VU } from './suivi.js';
import { el } from './ui.js';

export function creerBlocSuivi(groupe) {
  // Le groupe reçoit un numéro ou rien, jamais le texte tapé : un texte serait lu comme une
  // note au premier format, et son reste rejoindrait « Vu ensemble » à chaque frappe
  const numeroTape = (valeur) => (valeur.trim() === '' ? null : Math.round(Number(valeur)));

  const diapositive = el('input', {
    id: 'suivi-diapositive',
    type: 'number',
    class: 'champ__controle champ__controle--court',
    inputmode: 'numeric',
    min: 1,
    max: DIAPOSITIVE_MAX,
    step: 1,
    autocomplete: 'off',
    placeholder: 'Ex. : 42',
    'aria-describedby': 'aide-suivi-diapositive',
    // Enregistré à chaque frappe : rien n'est perdu si l'onglet est fermé sans quitter le champ
    oninput: (e) =>
      groupe.changerSuivi({ ...groupe.suivi, diapositive: numeroTape(e.target.value) }),
    // Champ quitté : il montre le numéro gardé (vide si le numéro tapé n'en est pas un)
    onchange: () => afficher(diapositive),
  });
  const vu = el('textarea', {
    id: 'suivi-vu',
    class: 'champ__controle',
    rows: 3,
    maxlength: LONGUEUR_VU,
    placeholder: 'Ex. : Google Sheets, les tableaux croisés. À reprendre : RECHERCHEV',
    'aria-describedby': 'aide-suivi-vu',
    oninput: (e) => groupe.changerSuivi({ ...groupe.suivi, vu: e.target.value }),
    // Champ quitté : il montre le texte gardé (espaces en trop retirées)
    onchange: () => afficher(vu),
  });

  function afficher(champ) {
    const { suivi } = groupe;
    champ.value = champ === diapositive ? (suivi.diapositive ?? '') : suivi.vu;
  }

  /** Pendant la saisie, un champ garde ce qui est tapé (le groupe en garde la version nettoyée). */
  function dessiner() {
    for (const champ of [diapositive, vu]) if (document.activeElement !== champ) afficher(champ);
  }

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
      'Notez où le groupe s’est arrêté pour reprendre au bon endroit à la prochaine séance.',
    ),
    el(
      'div',
      { class: 'bloc-suivi__colonnes' },
      el(
        'div',
        { class: 'champ bloc-suivi__champ' },
        el(
          'label',
          { for: 'suivi-diapositive', class: 'champ__libelle' },
          'Arrêté à la diapositive',
        ),
        diapositive,
        el(
          'p',
          { id: 'aide-suivi-diapositive', class: 'champ__aide' },
          'Le numéro de la dernière diapositive vue.',
        ),
      ),
      el(
        'div',
        { class: 'champ bloc-suivi__champ' },
        el('label', { for: 'suivi-vu', class: 'champ__libelle' }, 'Vu ensemble'),
        vu,
        el(
          'p',
          { id: 'aide-suivi-vu', class: 'champ__aide' },
          'Logiciels, notions, ce qu’il reste à reprendre.',
        ),
      ),
    ),
  );
}
