/**
 * Bloc « Qui joue ? » de l'accueil d'un jeu. Le groupe se gère sur la page « Le groupe » ; ici,
 * on choisit les joueurs de la partie parmi les présents : tout le groupe (par défaut), au clic,
 * ou au hasard (d'abord ceux qui n'ont pas encore été tirés). Un retardataire s'ajoute au
 * groupe sans quitter le jeu.
 *
 * creerBlocJoueurs(groupe, { selection, surSelection, hasard, designer }) → élément
 * - selection : { mode, choisis }, gardée par cadre-jeu.js tant que la page est ouverte ;
 * - surSelection(nouvelle) : appelé à chaque changement de sélection ;
 * - designer() : la roue, parmi les joueurs.
 */
import * as listeParticipants from './participants.js';
import {
  MODES,
  joueursDeLaPartie,
  basculerJoueur,
  tirerJoueurs,
  chargerTires,
  enregistrerTires,
} from './joueurs.js';
import { avatar } from './plan-salle.js';
import { ouvrirDialogue } from './dialogues.js';
import { sons } from './sons.js';
import { el, remplir, icone, annoncer } from './ui.js';

/** Adresse de la page « Le groupe », depuis n'importe quelle page du site. */
const PAGE_GROUPE = new URL('../../../groupe/', import.meta.url).href;
/** Nombre de joueurs proposé pour un tirage au sort. */
const NOMBRE_PAR_DEFAUT = 4;

const cle = (prenom) => String(prenom).toLocaleLowerCase('fr');
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function creerBlocJoueurs(groupe, { selection, surSelection, hasard, designer }) {
  let actuelle = selection;
  let nombre =
    actuelle.mode === 'hasard'
      ? Math.max(1, actuelle.choisis.length)
      : Math.min(NOMBRE_PAR_DEFAUT, Math.max(1, groupe.presents.length));
  const bloc = el('section', { class: 'carte bloc-joueurs', 'aria-labelledby': 'titre-joueurs' });
  const corps = el('div', { class: 'bloc-joueurs__corps' });

  const joueurs = () => joueursDeLaPartie(groupe.presents, actuelle);

  function changer(nouvelle) {
    actuelle = nouvelle;
    surSelection(nouvelle);
    dessiner();
  }

  function tirer() {
    const resultat = tirerJoueurs(groupe.presents, nombre, chargerTires(), hasard);
    enregistrerTires(resultat.dejaTires);
    sons.ding();
    changer({ mode: 'hasard', choisis: resultat.joueurs.map(cle) });
    annoncer(`Tirage au sort : ${resultat.joueurs.join(', ')}.`);
  }

  function choisirMode(mode) {
    if (mode === 'hasard') {
      tirer();
      return;
    }
    // « Choisir » part de la sélection du moment : on décoche ceux qui ne jouent pas
    changer({ mode, choisis: mode === 'choix' ? joueurs().map(cle) : [] });
  }

  async function ajouterQuelquun() {
    const reponse = await demanderParticipant();
    if (!reponse) return;
    const { liste, ajouts } = listeParticipants.ajouterPrenoms(groupe.participants, reponse.prenom);
    // Un homonyme reçoit un numéro (« Marie 2 ») : c'est bien une nouvelle personne
    const nouveau = ajouts[0]?.prenom;
    if (!nouveau) return;
    groupe.changerParticipants(liste);
    if (reponse.texte.trim()) {
      groupe.changerInfos(
        listeParticipants.definirInfo(groupe.infos, nouveau, {
          theme: reponse.theme,
          texte: reponse.texte,
        }),
      );
    }
    // Un retardataire vient pour jouer : on l'ajoute aussi à la sélection du moment
    if (actuelle.mode !== 'tous') {
      changer({ ...actuelle, choisis: [...actuelle.choisis, cle(nouveau)] });
    } else {
      changer(actuelle);
    }
    annoncer(
      [listeParticipants.messageHomonymes(ajouts), `${nouveau} rejoint le groupe.`]
        .filter(Boolean)
        .join(' '),
    );
  }

  function dessinerModes() {
    return el(
      'fieldset',
      { class: 'segments' },
      el('legend', { class: 'visuellement-cache' }, 'Qui joue la partie ?'),
      MODES.map((m) =>
        el(
          'label',
          { class: 'segment' },
          el('input', {
            type: 'radio',
            name: 'mode-joueurs',
            value: m.valeur,
            class: 'visuellement-cache',
            checked: actuelle.mode === m.valeur,
            onchange: () => choisirMode(m.valeur),
          }),
          m.libelle,
        ),
      ),
    );
  }

  function dessinerTirage() {
    if (actuelle.mode !== 'hasard') return null;
    return el(
      'div',
      { class: 'bloc-joueurs__tirage' },
      el('label', { for: 'nombre-joueurs', class: 'champ__libelle' }, 'Nombre de joueurs'),
      el(
        'div',
        { class: 'champ__ligne' },
        el('input', {
          id: 'nombre-joueurs',
          class: 'champ__controle champ__controle--court',
          type: 'number',
          inputmode: 'numeric',
          min: 1,
          max: groupe.presents.length,
          value: String(nombre),
          onchange: (e) => {
            const valeur = Math.round(Number(e.target.value));
            nombre = Math.min(groupe.presents.length, Math.max(1, valeur || 1));
            tirer();
          },
        }),
        el(
          'button',
          { type: 'button', class: 'bouton', onclick: () => tirer() },
          icone('dice'),
          'Tirer au sort',
        ),
      ),
    );
  }

  function dessinerListe() {
    const choisis = new Set(joueurs().map(cle));
    return el(
      'ul',
      { class: 'bloc-joueurs__liste', 'aria-label': 'Joueurs' },
      groupe.presents.map((prenom) =>
        el(
          'li',
          {},
          el(
            'button',
            {
              type: 'button',
              class: 'joueur',
              'aria-pressed': String(choisis.has(cle(prenom))),
              dataset: { joueur: prenom },
              onclick: () => {
                changer(basculerJoueur(groupe.presents, actuelle, prenom));
                bloc.querySelector(`[data-joueur="${CSS.escape(prenom)}"]`)?.focus();
              },
            },
            avatar(groupe, prenom, 'avatar--mini'),
            prenom,
          ),
        ),
      ),
    );
  }

  function dessinerCompte() {
    const n = joueurs().length;
    const total = groupe.presents.length;
    const absents = groupe.participants.filter((p) => groupe.estAbsent(p));
    return el(
      'p',
      { class: 'bloc-joueurs__compte', 'aria-live': 'polite' },
      actuelle.mode === 'tous'
        ? `Tout le groupe joue : ${pluriel(n, 'joueur')}.`
        : `${pluriel(n, 'joueur')} sur ${total}.`,
      absents.length ? ` Absences aujourd’hui : ${absents.join(', ')}.` : '',
    );
  }

  function dessiner() {
    const vide = groupe.participants.length === 0;
    const tousAbsents = !vide && groupe.presents.length === 0;
    remplir(
      corps,
      vide
        ? el(
            'p',
            { class: 'champ__aide' },
            'Le groupe est vide : on peut jouer sans prénoms, mais sans classement.',
          )
        : null,
      tousAbsents
        ? el('p', { class: 'champ__aide' }, 'Tout le groupe est absent aujourd’hui.')
        : null,
      !vide && !tousAbsents
        ? [
            dessinerModes(),
            dessinerTirage(),
            dessinerListe(),
            dessinerCompte(),
            actuelle.mode === 'tous'
              ? null
              : el('p', { class: 'champ__aide' }, 'Touchez un prénom pour le faire jouer ou non.'),
          ]
        : null,
      el(
        'div',
        { class: 'groupe-boutons' },
        el(
          'button',
          { type: 'button', class: 'bouton', onclick: ajouterQuelquun },
          icone('user-plus'),
          'Ajouter quelqu’un',
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton',
            disabled: joueurs().length < 2,
            onclick: () => designer(),
          },
          icone('arrows-spin'),
          'Désigner quelqu’un',
        ),
      ),
    );
  }

  bloc.append(
    el(
      'div',
      { class: 'bloc-joueurs__entete' },
      el('h3', { id: 'titre-joueurs' }, 'Qui joue ?'),
      el(
        'a',
        { class: 'bouton bouton--discret', href: PAGE_GROUPE },
        icone('users'),
        'Gérer le groupe',
      ),
    ),
    corps,
  );
  dessiner();
  return bloc;
}

/** Fenêtre « Ajouter quelqu'un » : un prénom et, si l'on veut, une info sur la personne. */
function demanderParticipant() {
  return ouvrirDialogue({
    titre: 'Ajouter quelqu’un',
    construire({ corps, pied, fermer }) {
      const prenom = el('input', {
        id: 'ajout-prenom',
        class: 'champ__controle',
        type: 'text',
        autocomplete: 'off',
        required: true,
        maxlength: listeParticipants.LONGUEUR_MAX,
        placeholder: 'Ex. : Marie',
      });
      const theme = el(
        'select',
        { id: 'ajout-theme', class: 'champ__controle' },
        listeParticipants.THEMES.map((t) => el('option', { value: t.valeur }, t.libelle)),
      );
      const texte = el('input', {
        id: 'ajout-info',
        class: 'champ__controle',
        type: 'text',
        autocomplete: 'off',
        maxlength: listeParticipants.LONGUEUR_INFO,
        placeholder: 'Ex. : la guitare, le tiramisu…',
      });
      corps.append(
        el(
          'form',
          {
            id: 'formulaire-ajout',
            onsubmit: (e) => {
              e.preventDefault();
              if (!prenom.value.trim()) return;
              fermer({ prenom: prenom.value, theme: theme.value, texte: texte.value });
            },
          },
          el(
            'div',
            { class: 'champ' },
            el('label', { for: 'ajout-prenom', class: 'champ__libelle' }, 'Prénom'),
            prenom,
          ),
          el(
            'div',
            { class: 'champ' },
            el('label', { for: 'ajout-theme', class: 'champ__libelle' }, 'Une info (facultatif)'),
            theme,
          ),
          el(
            'div',
            { class: 'champ' },
            el('label', { for: 'ajout-info', class: 'visuellement-cache' }, 'Info'),
            texte,
          ),
          el(
            'p',
            { class: 'champ__aide' },
            'La personne rejoint le groupe, pour ce jeu et tous les autres.',
          ),
        ),
      );
      pied.append(
        el('button', { type: 'button', class: 'bouton', onclick: () => fermer(null) }, 'Annuler'),
        el(
          'button',
          { type: 'submit', form: 'formulaire-ajout', class: 'bouton bouton--principal' },
          icone('user-plus'),
          'Ajouter',
        ),
      );
      setTimeout(() => prenom.focus(), 0);
    },
  });
}
