/**
 * Fenêtres de dialogue communes : choisir un ou plusieurs prénoms, confirmer, roue des prénoms.
 */
import { el } from './ui.js';
import { creerRoue, couleursRoue } from './roue.js';
import { sons } from './sons.js';

/**
 * Ouvre un <dialog> modal. `construire({ corps, pied, fermer })` remplit le contenu.
 * Renvoie une promesse résolue avec la valeur passée à fermer() (ou `valeurAnnulation`).
 */
export function ouvrirDialogue({ titre, classe = '', construire, valeurAnnulation = null }) {
  return new Promise((resoudre) => {
    let valeur = valeurAnnulation;
    const idTitre = `dialogue-${Math.random().toString(36).slice(2, 8)}`;
    const corps = el('div', { class: 'dialogue__corps' });
    const pied = el('div', { class: 'dialogue__pied' });
    const dialog = el(
      'dialog',
      { class: `dialogue ${classe}`, 'aria-labelledby': idTitre },
      el(
        'div',
        { class: 'dialogue__entete' },
        el('h2', { id: idTitre, class: 'dialogue__titre' }, titre),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton-icone',
            'aria-label': 'Fermer',
            onclick: () => dialog.close(),
          },
          '✕',
        ),
      ),
      corps,
      pied,
    );
    const fermer = (v) => {
      valeur = v;
      dialog.close();
    };
    dialog.addEventListener('close', () => {
      dialog.remove();
      resoudre(valeur);
    });
    construire({ corps, pied, fermer, dialog });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function confirmer({ titre, message, oui = 'Oui', non = 'Annuler' }) {
  return ouvrirDialogue({
    titre,
    valeurAnnulation: false,
    construire({ corps, pied, fermer }) {
      corps.append(el('p', {}, message));
      pied.append(
        el('button', { type: 'button', class: 'bouton', onclick: () => fermer(false) }, non),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--principal',
            autofocus: true,
            onclick: () => fermer(true),
          },
          oui,
        ),
      );
    },
  });
}

/**
 * Demande à l'animateur de cliquer un prénom (ou plusieurs avec `multiple`).
 * Résout avec la liste choisie ([] si personne). Sans participants, résout [] tout de suite.
 */
export function choisirPrenoms({
  titre,
  message = '',
  prenoms,
  multiple = false,
  libelleAucun = 'Personne',
  preselection = [],
}) {
  if (!prenoms.length) return Promise.resolve([]);
  return ouvrirDialogue({
    titre,
    classe: 'dialogue--prenoms',
    valeurAnnulation: [],
    construire({ corps, pied, fermer }) {
      if (message) corps.append(el('p', { class: 'dialogue__message' }, message));
      const choisis = new Set(preselection);
      const grille = el('div', { class: 'grille-prenoms' });
      if (multiple) {
        corps.append(
          el(
            'p',
            { class: 'dialogue__outils' },
            el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--discret',
                onclick: () => {
                  const tous = choisis.size < prenoms.length;
                  for (const p of prenoms) {
                    if (tous) choisis.add(p);
                    else choisis.delete(p);
                  }
                  for (const b of grille.children) {
                    b.setAttribute('aria-pressed', String(tous));
                  }
                },
              },
              'Tout le monde / personne',
            ),
          ),
        );
      }
      for (const prenom of prenoms) {
        const bouton = el(
          'button',
          {
            type: 'button',
            class: 'puce-prenom',
            'aria-pressed': multiple ? String(choisis.has(prenom)) : null,
            onclick: () => {
              if (!multiple) {
                fermer([prenom]);
                return;
              }
              if (choisis.has(prenom)) choisis.delete(prenom);
              else choisis.add(prenom);
              bouton.setAttribute('aria-pressed', String(choisis.has(prenom)));
            },
          },
          prenom,
        );
        grille.append(bouton);
      }
      corps.append(grille);
      pied.append(
        el('button', { type: 'button', class: 'bouton', onclick: () => fermer([]) }, libelleAucun),
      );
      if (multiple) {
        pied.append(
          el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--principal',
              onclick: () => fermer(prenoms.filter((p) => choisis.has(p))),
            },
            'Valider',
          ),
        );
      }
    },
  });
}

/**
 * Roue des prénoms. `tirage` vient de creerTirage (il garde la mémoire des personnes déjà passées).
 * Résout avec le prénom choisi, ou null si on ferme sans tirer.
 */
export function designerAvecRoue({
  prenoms,
  tirage,
  hasard,
  titre = 'Désigner quelqu’un',
  surEquitable,
}) {
  return ouvrirDialogue({
    titre,
    classe: 'dialogue--roue',
    construire({ corps, pied, fermer }) {
      let choisi = null;
      let enCours = false;
      const roue = creerRoue(prenoms, couleursRoue(prenoms.length), { hasard });
      const resultat = el('p', { class: 'roue-resultat', 'aria-live': 'polite' });
      const lancer = el(
        'button',
        { type: 'button', class: 'bouton bouton--principal bouton--grand', autofocus: true },
        'Lancer la roue',
      );
      const valider = el(
        'button',
        { type: 'button', class: 'bouton', disabled: true, onclick: () => fermer(choisi) },
        'C’est parti !',
      );
      const equitable = el('input', {
        type: 'checkbox',
        id: 'roue-equitable',
        checked: tirage.equitable,
        onchange: () => {
          tirage.equitable = equitable.checked;
          surEquitable?.(equitable.checked);
        },
      });
      lancer.addEventListener('click', async () => {
        if (enCours) return;
        enCours = true;
        lancer.disabled = true;
        valider.disabled = true;
        resultat.textContent = '';
        const index = tirage.tirer();
        await roue.tourner(index);
        choisi = prenoms[index];
        resultat.textContent = choisi;
        sons.ding();
        enCours = false;
        lancer.disabled = false;
        lancer.textContent = 'Relancer';
        valider.disabled = false;
        valider.focus();
      });
      corps.append(
        roue.element,
        resultat,
        el(
          'p',
          { class: 'case-a-cocher' },
          equitable,
          el(
            'label',
            { for: 'roue-equitable' },
            'Tirage équitable : chacun passe une fois avant de revenir',
          ),
        ),
      );
      pied.append(lancer, valider);
    },
  });
}
