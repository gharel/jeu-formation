/**
 * Fenêtre de la fiche d'une thématique (page « Les contenus ») : titre, description, icône.
 */
import { el, remplir, icone } from './ui.js';
import { ouvrirDialogue } from './dialogues.js';
import { texteCourt, LONGUEUR_TITRE, LONGUEUR_DESCRIPTION } from './jeux-de-donnees.js';
import { ICONES_THEMATIQUE, ICONE_PAR_DEFAUT, thematiqueDuTitre } from './catalogue-thematiques.js';

/**
 * Fenêtre « Créer une thématique » (sans `thematique`) ou « Modifier … » : titre, description,
 * icône et, à la création, le point de départ (`departs` : [{ valeur, libelle }]). Le titre doit
 * différer de celui des autres `thematiques`. Résout avec { titre, description, icone, depart }
 * ou null si on annule.
 */
export function ouvrirFicheThematique({ thematique = null, thematiques, departs = [] }) {
  const creation = !thematique;
  return ouvrirDialogue({
    titre: creation ? 'Créer une thématique' : `Modifier « ${thematique.titre} »`,
    classe: 'dialogue--fiche',
    construire({ corps, pied, fermer }) {
      const champTitre = el('input', {
        id: 'fiche-titre',
        type: 'text',
        class: 'champ__controle',
        autocomplete: 'off',
        required: true,
        autofocus: true,
        maxlength: LONGUEUR_TITRE,
        value: thematique?.titre ?? '',
        placeholder: 'Ex. : Excel débutant',
        'aria-describedby': 'fiche-erreur',
      });
      const erreur = el('p', { id: 'fiche-erreur', class: 'champ__erreur', role: 'alert' });
      const champDescription = el('textarea', {
        id: 'fiche-description',
        class: 'champ__controle',
        rows: 2,
        maxlength: LONGUEUR_DESCRIPTION,
        value: thematique?.description ?? '',
        placeholder: 'Ex. : Les formules, les graphiques et l’impression, pour bien démarrer.',
      });
      const iconeActuelle = thematique?.icone ?? ICONE_PAR_DEFAUT;
      const choixIcone = el(
        'fieldset',
        { class: 'champ choix-icones' },
        el('legend', { class: 'champ__libelle' }, 'Icône'),
        el(
          'div',
          { class: 'choix-icones__grille' },
          ICONES_THEMATIQUE.map(({ icone: nom, libelle }) =>
            el(
              'label',
              { class: 'choix-icone', title: libelle },
              el('input', {
                type: 'radio',
                name: 'fiche-icone',
                value: nom,
                class: 'visuellement-cache',
                checked: nom === iconeActuelle,
              }),
              icone(nom),
              el('span', { class: 'visuellement-cache' }, libelle),
            ),
          ),
        ),
      );
      const choixDepart = creation
        ? el(
            'select',
            { id: 'fiche-depart', class: 'champ__controle' },
            departs.map((d) => el('option', { value: d.valeur }, d.libelle)),
          )
        : null;

      function valider(evenement) {
        evenement.preventDefault();
        const titre = texteCourt(champTitre.value, LONGUEUR_TITRE);
        const homonyme = thematiqueDuTitre(thematiques, titre, thematique?.slug);
        if (!titre || homonyme) {
          remplir(
            erreur,
            titre
              ? `Une thématique s’appelle déjà « ${homonyme.titre} » : choisissez un autre titre.`
              : 'Donnez un titre à la thématique.',
          );
          champTitre.focus();
          return;
        }
        fermer({
          titre,
          description: texteCourt(champDescription.value, LONGUEUR_DESCRIPTION),
          icone: corps.querySelector('input[name="fiche-icone"]:checked')?.value ?? iconeActuelle,
          depart: choixDepart?.value ?? null,
        });
      }

      corps.append(
        el(
          'form',
          { id: 'formulaire-fiche', novalidate: true, onsubmit: valider },
          el(
            'div',
            { class: 'champ' },
            el('label', { for: 'fiche-titre', class: 'champ__libelle' }, 'Titre'),
            champTitre,
            erreur,
          ),
          el(
            'div',
            { class: 'champ' },
            el(
              'label',
              { for: 'fiche-description', class: 'champ__libelle' },
              'Description (facultative)',
            ),
            champDescription,
          ),
          choixIcone,
          creation
            ? el(
                'div',
                { class: 'champ' },
                el('label', { for: 'fiche-depart', class: 'champ__libelle' }, 'Point de départ'),
                choixDepart,
                el(
                  'p',
                  { class: 'champ__aide' },
                  'Les questions de départ de chaque jeu, à modifier ensuite jeu par jeu. Zoom mystère n’entre pas dans les thématiques (il lui faut des captures d’écran).',
                ),
              )
            : el(
                'p',
                { class: 'champ__aide' },
                'Pour changer les questions : « Aperçu », puis « Modifier » sur chaque jeu.',
              ),
        ),
      );
      pied.append(
        el('button', { type: 'button', class: 'bouton', onclick: () => fermer(null) }, 'Annuler'),
        el(
          'button',
          { type: 'submit', form: 'formulaire-fiche', class: 'bouton bouton--principal' },
          creation ? 'Créer la thématique' : 'Enregistrer',
        ),
      );
    },
  });
}
