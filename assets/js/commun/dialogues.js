/**
 * Fenêtres de dialogue communes : choisir un ou plusieurs prénoms, confirmer, roue des prénoms.
 */
import { el, remplir, icone } from './ui.js';
import { creerRoue, couleursRoue } from './roue.js';
import { sons, preparerSon } from './sons.js';

/**
 * Ouvre un <dialog> modal. `construire({ corps, pied, fermer })` remplit le contenu.
 * Renvoie une promesse résolue avec la valeur passée à fermer() (ou `valeurAnnulation`).
 * `focusApres` : élément qui reçoit le focus dès la fermeture, à la place du bouton qui a ouvert
 * la fenêtre (en partie, Entrée sur ce bouton rouvrirait la fenêtre au lieu de jouer).
 */
export function ouvrirDialogue({
  titre,
  classe = '',
  construire,
  valeurAnnulation = null,
  focusApres = null,
}) {
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
            onclick: () => fermer(valeurAnnulation),
          },
          icone('xmark'),
        ),
      ),
      corps,
      pied,
    );
    const rendreFocus = () => focusApres?.focus({ preventScroll: true });
    const fermer = (v) => {
      valeur = v;
      dialog.close();
      // Tout de suite : l'événement « close » n'arrive qu'un peu plus tard
      rendreFocus();
    };
    dialog.addEventListener('close', () => {
      dialog.remove();
      rendreFocus();
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
              icone('users'),
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
          multiple ? icone('check', { classe: 'puce-prenom__coche' }) : null,
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
 * Roue générique. `libelles` : textes des segments ; `tirage` vient de creerTirage.
 * `resultatDe(index)` : texte affiché en grand, `detailDe(index)` : ligne en dessous (facultative),
 * `libelleValider(index)` : texte du bouton qui ferme la fenêtre.
 * Avec `surEquitable`, une case « tirage équitable » est proposée.
 * Résout avec l'index tiré, ou null si on ferme sans valider.
 */
export function tirerAvecRoue({
  titre,
  libelles,
  tirage,
  hasard,
  resultatDe = (i) => libelles[i],
  detailDe = () => '',
  libelleValider = () => 'C’est parti !',
  surEquitable = null,
  optionsRoue = {},
}) {
  return ouvrirDialogue({
    titre,
    classe: 'dialogue--roue',
    construire({ corps, pied, fermer }) {
      let choisi = null;
      let enCours = false;
      const roue = creerRoue(libelles, couleursRoue(libelles.length), {
        hasard,
        surPassage: sons.roueClic,
        ...optionsRoue,
      });
      const resultat = el('p', { class: 'roue-resultat', 'aria-live': 'polite' });
      const detail = el('p', { class: 'roue-detail' });
      const lancer = el(
        'button',
        { type: 'button', class: 'bouton bouton--principal bouton--grand', autofocus: true },
        'Lancer la roue',
      );
      const valider = el(
        'button',
        { type: 'button', class: 'bouton', disabled: true, onclick: () => fermer(choisi) },
        libelleValider(0),
      );
      lancer.addEventListener('click', async () => {
        if (enCours) return;
        enCours = true;
        // Déjà fait à l'ouverture, sauf si le son vient d'être activé : pas au premier cliquetis
        preparerSon();
        lancer.disabled = true;
        valider.disabled = true;
        remplir(resultat);
        remplir(detail);
        const index = tirage.tirer();
        await roue.tourner(index);
        choisi = index;
        remplir(resultat, resultatDe(index));
        remplir(detail, detailDe(index));
        remplir(valider, libelleValider(index));
        sons.ding();
        enCours = false;
        lancer.disabled = false;
        lancer.textContent = 'Relancer';
        valider.disabled = false;
        valider.focus();
      });
      corps.append(roue.element, resultat, detail);
      if (surEquitable) {
        const equitable = el('input', {
          type: 'checkbox',
          id: 'roue-equitable',
          checked: tirage.equitable,
          onchange: () => {
            tirage.equitable = equitable.checked;
            surEquitable(equitable.checked);
          },
        });
        corps.append(
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
      }
      pied.append(lancer, valider);
      // La sortie audio s'ouvre dès que la roue s'affiche : le temps que l'animateur la lance,
      // la sortie est prête (l'ouvrir au clic retardait les premiers cliquetis)
      requestAnimationFrame(() => setTimeout(preparerSon, 0));
    },
  });
}

/**
 * Roue des prénoms. `tirage` vient de creerTirage (il garde la mémoire des personnes déjà passées).
 * `decrire(prenom)` donne l'info affichée sous le prénom tiré (« Dessert préféré : … »).
 * Résout avec le prénom choisi, ou null si on ferme sans tirer.
 */
export async function designerAvecRoue({
  prenoms,
  tirage,
  hasard,
  titre = 'Désigner quelqu’un',
  surEquitable = () => {},
  decrire = () => '',
}) {
  const index = await tirerAvecRoue({
    titre,
    libelles: prenoms,
    tirage,
    hasard,
    detailDe: (i) => decrire(prenoms[i]),
    surEquitable,
  });
  return index === null ? null : prenoms[index];
}

/**
 * Modifier l'info d'un participant. Résout avec { theme, texte } (texte vide = retirer l'info),
 * ou null si on annule.
 */
export function modifierInfo({ prenom, info, themes }) {
  return ouvrirDialogue({
    titre: `Une info sur ${prenom}`,
    construire({ corps, pied, fermer }) {
      const theme = el(
        'select',
        { id: 'info-theme', class: 'champ__controle' },
        themes.map((t) => el('option', { value: t.valeur }, t.libelle)),
      );
      theme.value = info?.theme ?? themes[0].valeur;
      const texte = el('input', {
        id: 'info-texte',
        type: 'text',
        class: 'champ__controle',
        autocomplete: 'off',
        maxlength: 60,
        value: info?.texte ?? '',
        placeholder: 'Ex. : le tiramisu',
      });
      const formulaire = el(
        'form',
        {
          id: 'formulaire-info',
          onsubmit: (e) => {
            e.preventDefault();
            fermer({ theme: theme.value, texte: texte.value });
          },
        },
        el(
          'div',
          { class: 'champ' },
          el('label', { for: 'info-theme', class: 'champ__libelle' }, 'Thème'),
          theme,
        ),
        el(
          'div',
          { class: 'champ' },
          el('label', { for: 'info-texte', class: 'champ__libelle' }, 'Réponse'),
          texte,
        ),
      );
      corps.append(formulaire);
      remplir(
        pied,
        info
          ? el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--discret',
                onclick: () => fermer({ theme: theme.value, texte: '' }),
              },
              'Retirer l’info',
            )
          : null,
        el(
          'button',
          { type: 'submit', form: 'formulaire-info', class: 'bouton bouton--principal' },
          'Enregistrer',
        ),
      );
      setTimeout(() => texte.focus(), 0);
    },
  });
}
