/**
 * Éditeur générique du contenu d'un jeu, construit à partir de son schéma (voir contenu.js).
 * Les réponses (champs « secret ») sont masquées par défaut : l'écran est peut-être projeté.
 */
import { el, remplir } from './ui.js';
import { elementVide } from './contenu.js';
import { lireNombre, formaterNombre } from './nombres.js';
import { enregistrerImage, lireFichierImage, imageDuCollage, adresseImage } from './images.js';

let compteur = 0;
function identifiant(prefixe) {
  compteur += 1;
  return `${prefixe}-${compteur}`;
}

function etiquette(champ, id) {
  return el('label', { for: id, class: 'champ__libelle' }, champ.libelle);
}

function aide(champ) {
  if (!champ.aide) return null;
  return el('p', { class: 'champ__aide', id: `${champ.idAide}` }, champ.aide);
}

/** Construit le contrôle d'un champ. `lire()` et `ecrire(v)` accèdent à la valeur du brouillon. */
function construireChamp(champ, lire, ecrire, outils) {
  const id = identifiant('champ');
  const idAide = champ.aide ? `${id}-aide` : null;
  const avecAide = { ...champ, idAide };
  const classeSecret = champ.secret ? 'secret' : '';

  switch (champ.type) {
    case 'texte':
    case 'texte-long': {
      const long = champ.type === 'texte-long';
      const listeId = champ.suggestions ? `${id}-suggestions` : null;
      const controle = el(long ? 'textarea' : 'input', {
        id,
        class: `champ__controle ${classeSecret}`,
        type: long ? null : 'text',
        rows: long ? 2 : null,
        maxlength: champ.longueurMax ?? (long ? 1000 : 200),
        autocomplete: 'off',
        spellcheck: champ.secret ? 'false' : null,
        placeholder: champ.exemple ?? null,
        list: listeId,
        'aria-describedby': idAide,
        required: champ.requis || null,
        value: lire() ?? '',
        oninput: (e) => ecrire(e.target.value),
      });
      if (long) controle.value = lire() ?? '';
      const suggestions = listeId
        ? el(
            'datalist',
            { id: listeId },
            ...champ.suggestions.map((s) => el('option', { value: s })),
          )
        : null;
      return el(
        'div',
        { class: `champ champ--${champ.type}` },
        etiquette(champ, id),
        controle,
        suggestions,
        aide(avecAide),
      );
    }

    case 'nombre': {
      const erreur = el('p', { class: 'champ__erreur', id: `${id}-erreur`, hidden: true });
      const valeur = lire();
      const controle = el('input', {
        id,
        class: `champ__controle champ__controle--nombre ${classeSecret}`,
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        placeholder: champ.exemple ?? null,
        'aria-describedby': [idAide, `${id}-erreur`].filter(Boolean).join(' '),
        required: champ.requis || null,
        value: valeur === null || valeur === undefined ? '' : formaterNombre(valeur),
        oninput: (e) => ecrire(lireNombre(e.target.value)),
        onblur: (e) => {
          const invalide = e.target.value.trim() !== '' && lireNombre(e.target.value) === null;
          erreur.hidden = !invalide;
          erreur.textContent = invalide
            ? 'Ce n’est pas un nombre reconnu (exemple : 1 500 ou 2,5).'
            : '';
          e.target.setAttribute('aria-invalid', String(invalide));
        },
      });
      const unite = champ.unite ? el('span', { class: 'champ__unite' }, champ.unite) : null;
      return el(
        'div',
        { class: 'champ champ--nombre' },
        etiquette(champ, id),
        el('div', { class: 'champ__ligne' }, controle, unite),
        erreur,
        aide(avecAide),
      );
    }

    case 'case': {
      const controle = el('input', {
        id,
        type: 'checkbox',
        checked: lire(),
        'aria-describedby': idAide,
        onchange: (e) => ecrire(e.target.checked),
      });
      return el(
        'div',
        { class: 'champ champ--case case-a-cocher' },
        controle,
        el('label', { for: id }, champ.libelle),
        aide(avecAide),
      );
    }

    case 'choix': {
      const controle = el(
        'select',
        {
          id,
          class: `champ__controle ${classeSecret}`,
          'aria-describedby': idAide,
          onchange: (e) => ecrire(e.target.value),
        },
        ...champ.options.map((o) => el('option', { value: o.valeur }, o.libelle)),
      );
      controle.value = lire();
      return el(
        'div',
        { class: 'champ champ--choix' },
        etiquette(champ, id),
        controle,
        aide(avecAide),
      );
    }

    case 'liste':
      return construireListe(champ, lire, ecrire, avecAide);

    case 'image':
      return construireImage(champ, lire, ecrire, outils, avecAide);

    default:
      return null;
  }
}

function construireListe(champ, lire, ecrire, avecAide) {
  const conteneur = el('fieldset', { class: 'champ champ--liste' });
  const max = champ.max ?? 20;

  function dessiner(focusIndex = null) {
    const valeurs = lire();
    const lignes = valeurs.map((texte, i) => {
      const id = identifiant('liste');
      const champTexte = el('input', {
        id,
        type: 'text',
        class: `champ__controle ${champ.secret ? 'secret' : ''}`,
        maxlength: champ.longueurMax ?? 200,
        autocomplete: 'off',
        value: texte,
        placeholder: champ.exemple ?? null,
        oninput: (e) => {
          const copie = [...lire()];
          copie[i] = e.target.value;
          ecrire(copie);
        },
      });
      return el(
        'li',
        { class: 'liste-champ__ligne' },
        el(
          'label',
          { for: id, class: 'liste-champ__numero' },
          `${champ.nomItem ?? 'Ligne'} ${i + 1}`,
        ),
        champTexte,
        el(
          'button',
          {
            type: 'button',
            class: 'bouton-icone',
            'aria-label': `Retirer ${(champ.nomItem ?? 'ligne').toLowerCase()} ${i + 1}`,
            disabled: valeurs.length <= 1,
            onclick: () => {
              ecrire(lire().filter((_, j) => j !== i));
              dessiner(Math.max(0, i - 1));
            },
          },
          '✕',
        ),
      );
    });
    remplir(
      conteneur,
      el('legend', { class: 'champ__libelle' }, champ.libelle),
      aide(avecAide),
      el('ol', { class: 'liste-champ' }, lignes),
      valeurs.length < max
        ? el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--discret',
              onclick: () => {
                ecrire([...lire(), '']);
                dessiner(lire().length - 1);
              },
            },
            `+ Ajouter ${champ.article ?? 'une'} ${(champ.nomItem ?? 'ligne').toLowerCase()}`,
          )
        : null,
    );
    if (focusIndex !== null) conteneur.querySelectorAll('input')[focusIndex]?.focus();
  }
  dessiner();
  return conteneur;
}

function construireImage(champ, lire, ecrire, outils, avecAide) {
  const conteneur = el('div', { class: 'champ champ--image' });
  const idFichier = identifiant('fichier');
  const message = el('p', { class: 'champ__erreur', role: 'alert' });

  async function recevoir(fichier) {
    message.textContent = '';
    try {
      const donnees = await lireFichierImage(fichier);
      const id = await enregistrerImage(donnees);
      ecrire({ id, focus: { x: 0.5, y: 0.5 } });
      dessiner();
    } catch (erreur) {
      message.textContent = erreur.message;
    }
  }

  const entreeFichier = el('input', {
    id: idFichier,
    type: 'file',
    accept: 'image/*',
    class: 'visuellement-cache',
    onchange: (e) => {
      const fichier = e.target.files?.[0];
      if (fichier) recevoir(fichier);
      e.target.value = '';
    },
  });

  const zone = el('div', {
    class: 'champ-image',
    tabindex: '0',
    role: 'group',
    'aria-label': `${champ.libelle} : cliquez ici puis collez une capture avec Ctrl+V`,
    'aria-describedby': avecAide.idAide,
  });
  zone.addEventListener('paste', (e) => {
    const fichier = imageDuCollage(e);
    if (!fichier) return;
    e.preventDefault();
    e.stopPropagation();
    recevoir(fichier);
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('champ-image--survol');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('champ-image--survol'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('champ-image--survol');
    const fichier = e.dataTransfer?.files?.[0];
    if (fichier) recevoir(fichier);
  });
  outils.zonesImage.push({ zone, recevoir, estVide: () => !lire() });

  async function dessiner() {
    const image = lire();
    if (!image) {
      remplir(
        zone,
        el(
          'p',
          { class: 'champ-image__invite' },
          'Cliquez ici puis collez une capture d’écran (Ctrl+V)',
        ),
        el('p', { class: 'champ-image__ou' }, 'ou glissez une image ici, ou'),
        el('label', { for: idFichier, class: 'bouton bouton--discret' }, 'Choisir une image…'),
      );
      return;
    }
    const adresse = await adresseImage(image);
    const marqueur = el('span', { class: 'champ-image__marqueur', 'aria-hidden': 'true' });
    const placerMarqueur = () => {
      const { x, y } = lire().focus;
      marqueur.style.left = `${x * 100}%`;
      marqueur.style.top = `${y * 100}%`;
    };
    const apercu = el('img', {
      src: adresse ?? '',
      alt: 'Aperçu de l’image. Cliquez pour choisir le point de départ du zoom.',
      class: 'champ-image__apercu',
      draggable: 'false',
    });
    const cadreApercu = el('div', { class: 'champ-image__cadre secret' }, apercu, marqueur);
    cadreApercu.addEventListener('click', (e) => {
      const rect = apercu.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      ecrire({
        ...lire(),
        focus: { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 },
      });
      placerMarqueur();
    });
    placerMarqueur();
    remplir(
      zone,
      cadreApercu,
      el(
        'p',
        { class: 'champ-image__actions' },
        el(
          'span',
          { class: 'champ__aide' },
          'Cliquez dans l’image pour choisir où commence le zoom.',
        ),
        el('label', { for: idFichier, class: 'bouton bouton--discret' }, 'Changer d’image…'),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--discret',
            onclick: () => {
              ecrire(null);
              dessiner();
            },
          },
          'Retirer l’image',
        ),
      ),
    );
  }
  dessiner();
  remplir(
    conteneur,
    el('p', { class: 'champ__libelle' }, champ.libelle),
    zone,
    entreeFichier,
    message,
    aide(avecAide),
  );
  return conteneur;
}

/**
 * Crée l'éditeur. Renvoie { element, valeur(), detruire() }.
 * `valeur()` donne le brouillon courant (à valider puis enregistrer par l'appelant).
 */
export function creerEditeur({ schema, contenu }) {
  const brouillon = structuredClone(contenu);
  const { min = 1, max = 50 } = schema.elements;
  while (brouillon.elements.length < min) brouillon.elements.push(elementVide(schema));
  const fixe = min === max;
  const outils = { zonesImage: [] };

  const racine = el('div', { class: 'editeur editeur--masque' });
  const boutonMasque = el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--discret',
      'aria-pressed': 'false',
      onclick: () => {
        const masque = racine.classList.toggle('editeur--masque');
        boutonMasque.setAttribute('aria-pressed', String(!masque));
        boutonMasque.textContent = masque ? '👁 Afficher les réponses' : '🙈 Masquer les réponses';
      },
    },
    '👁 Afficher les réponses',
  );

  const reglages = (schema.reglages ?? []).length
    ? el(
        'fieldset',
        { class: 'carte editeur__reglages' },
        el('legend', {}, 'Réglages'),
        ...schema.reglages.map((r) =>
          construireChamp(
            r,
            () => brouillon.reglages[r.cle],
            (v) => {
              brouillon.reglages[r.cle] = v;
            },
            outils,
          ),
        ),
      )
    : null;

  const liste = el('ol', { class: 'editeur__elements' });
  const ajout = el('div', { class: 'editeur__ajout' });

  function dessinerElements(focus = null) {
    outils.zonesImage = [];
    const cartes = brouillon.elements.map((element, i) => {
      const titre = el(
        'h3',
        { class: 'editeur__titre-element' },
        `${schema.elements.libelle} ${i + 1}`,
      );
      const actions = fixe
        ? null
        : el(
            'div',
            { class: 'editeur__actions-element' },
            el(
              'button',
              {
                type: 'button',
                class: 'bouton-icone',
                'aria-label': `Monter ${schema.elements.libelle.toLowerCase()} ${i + 1}`,
                disabled: i === 0,
                onclick: () => deplacer(i, -1),
              },
              '↑',
            ),
            el(
              'button',
              {
                type: 'button',
                class: 'bouton-icone',
                'aria-label': `Descendre ${schema.elements.libelle.toLowerCase()} ${i + 1}`,
                disabled: i === brouillon.elements.length - 1,
                onclick: () => deplacer(i, 1),
              },
              '↓',
            ),
            el(
              'button',
              {
                type: 'button',
                class: 'bouton-icone bouton-icone--danger',
                'aria-label': `Supprimer ${schema.elements.libelle.toLowerCase()} ${i + 1}`,
                onclick: () => {
                  brouillon.elements.splice(i, 1);
                  dessinerElements(Math.min(i, brouillon.elements.length - 1));
                },
              },
              '✕',
            ),
          );
      return el(
        'li',
        { class: 'carte editeur__element', dataset: { index: String(i) } },
        el('div', { class: 'editeur__entete-element' }, titre, actions),
        ...schema.elements.champs.map((c) =>
          construireChamp(
            c,
            () => brouillon.elements[i][c.cle],
            (v) => {
              brouillon.elements[i][c.cle] = v;
            },
            outils,
          ),
        ),
      );
    });
    remplir(liste, cartes);
    remplir(
      ajout,
      !fixe && brouillon.elements.length < max
        ? el(
            'button',
            {
              type: 'button',
              class: 'bouton',
              onclick: () => {
                brouillon.elements.push(elementVide(schema));
                dessinerElements(brouillon.elements.length - 1);
              },
            },
            `+ Ajouter ${schema.elements.feminin ? 'une' : 'un'} ${schema.elements.libelle.toLowerCase()}`,
          )
        : null,
    );
    if (focus !== null && focus >= 0) {
      liste.children[focus]?.querySelector('input, textarea, select, [tabindex]')?.focus();
    }
  }

  function deplacer(i, sens) {
    const j = i + sens;
    if (j < 0 || j >= brouillon.elements.length) return;
    [brouillon.elements[i], brouillon.elements[j]] = [brouillon.elements[j], brouillon.elements[i]];
    dessinerElements(j);
  }

  // Collage d'une image ailleurs que dans une zone : on la place dans la première zone vide.
  function surCollage(e) {
    if (e.defaultPrevented || !outils.zonesImage.length) return;
    const fichier = imageDuCollage(e);
    if (!fichier) return;
    const cible = outils.zonesImage.find((z) => z.estVide()) ?? null;
    if (!cible) return;
    e.preventDefault();
    cible.recevoir(fichier);
  }
  document.addEventListener('paste', surCollage);

  dessinerElements();
  remplir(
    racine,
    el('div', { class: 'editeur__outils' }, boutonMasque),
    reglages,
    el(
      'h3',
      { class: 'editeur__intertitre' },
      `${schema.elements.pluriel[0].toUpperCase()}${schema.elements.pluriel.slice(1)}`,
    ),
    liste,
    ajout,
  );

  return {
    element: racine,
    valeur: () => brouillon,
    detruire: () => document.removeEventListener('paste', surCollage),
  };
}
