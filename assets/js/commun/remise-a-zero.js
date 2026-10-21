/**
 * « Nouvelle formation » (page Le groupe) : tout vider d'un coup, au choix :
 * - les joueurs, et tout ce qui va avec (nom du groupe, infos, absences, places, équipes, scores) ;
 * - les équipes (et le mode de jeu choisi) ;
 * - les scores des joueurs et des équipes ;
 * - les contenus des jeux, qui reprennent leur contenu d'exemple, avec leurs réglages et leur
 *   minuteur par défaut.
 * Restent : le mot de passe, le son, la roue équitable, les thématiques de l'animateur, les records.
 */
import { JEUX } from '../jeux.js';
import { effacer } from './stockage.js';
import { cleContenu, nettoyerContenu } from './contenu.js';
import { oublierSource } from './jeux-de-donnees.js';
import { cleLancement } from './lancement.js';
import { CLE_MODE } from './mode-jeu.js';
import { enregistrerTires } from './joueurs.js';
import { ouvrirDialogue } from './dialogues.js';
import { el, icone } from './ui.js';

const PARTIES = [
  {
    cle: 'joueurs',
    libelle: 'Les joueurs',
    aide: 'Prénoms, infos, absences, plan de salle et nom du groupe.',
  },
  { cle: 'equipes', libelle: 'Les équipes', aide: 'Et le mode de jeu choisi.' },
  {
    cle: 'scores',
    libelle: 'Les scores',
    aide: 'Des joueurs et des équipes, tous jeux confondus.',
  },
  {
    cle: 'contenus',
    libelle: 'Les contenus des jeux',
    aide: 'Chaque jeu reprend son contenu d’exemple, avec ses réglages et son minuteur par défaut.',
  },
];

/** Ce qui est vraiment vidé, dans l'ordre : sans joueurs, plus d'équipes ni de scores. */
export function partiesAVider(choix) {
  const choisies = new Set(choix);
  if (choisies.has('joueurs')) {
    choisies.add('equipes');
    choisies.add('scores');
  }
  return PARTIES.map((p) => p.cle).filter((cle) => choisies.has(cle));
}

/** « les joueurs, les équipes et les scores » */
export function decrireParties(parties) {
  const noms = PARTIES.filter((p) => parties.includes(p.cle)).map((p) => p.libelle.toLowerCase());
  return noms.length < 2 ? (noms[0] ?? '') : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`;
}

/** Les contenus d'exemple dans tous les jeux (les images de Zoom mystère qui ne servent plus partent). */
async function remettreLesExemples() {
  for (const jeu of JEUX) {
    effacer(cleContenu(jeu.slug));
    effacer(cleLancement(jeu.slug));
    oublierSource(jeu.slug);
    try {
      const adresse = new URL(`../../../jeux/${jeu.slug}/exemple.js`, import.meta.url).href;
      const module = await import(adresse);
      await module.transfert?.apresEnregistrement?.(nettoyerContenu(module.schema, module.exemple));
    } catch {
      // Une image restée dans le navigateur ne gêne pas : le contenu, lui, est revenu à l'exemple
    }
  }
}

/** Vide les parties choisies ; renvoie celles vidées (voir partiesAVider). */
export async function viderTout(groupe, choix) {
  const parties = partiesAVider(choix);
  if (parties.includes('joueurs')) {
    groupe.remplacer({});
    enregistrerTires([]);
  } else {
    if (parties.includes('equipes')) groupe.changerEquipes([]);
    if (parties.includes('scores')) groupe.reinitialiserScores();
  }
  if (parties.includes('equipes')) effacer(CLE_MODE);
  if (parties.includes('contenus')) await remettreLesExemples();
  return parties;
}

/**
 * Fenêtre « Tout vider ? » : une case par partie, toutes cochées. Les joueurs vidés emportent les
 * équipes et les scores (cases cochées d'office). Résout avec les parties choisies, ou null.
 */
export function demanderQuoiVider() {
  return ouvrirDialogue({
    titre: 'Tout vider pour une nouvelle formation ?',
    valeurAnnulation: null,
    construire({ corps, pied, fermer }) {
      const cases = new Map();
      const lignes = PARTIES.map((partie) => {
        const id = `vider-${partie.cle}`;
        const caseACocher = el('input', {
          id,
          type: 'checkbox',
          checked: true,
          'aria-describedby': `${id}-aide`,
          onchange: () => suivre(),
        });
        cases.set(partie.cle, caseACocher);
        return el(
          'div',
          { class: 'champ remise-a-zero__ligne' },
          el(
            'p',
            { class: 'case-a-cocher' },
            caseACocher,
            el('label', { for: id }, partie.libelle),
          ),
          el('p', { class: 'champ__aide', id: `${id}-aide` }, partie.aide),
        );
      });
      const valider = el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--danger',
          onclick: () =>
            fermer([...cases].filter(([, caseACocher]) => caseACocher.checked).map(([cle]) => cle)),
        },
        icone('broom'),
        'Tout vider',
      );

      /** Joueurs cochés : équipes et scores le sont d'office ; rien de coché : rien à vider. */
      function suivre() {
        const joueurs = cases.get('joueurs').checked;
        for (const cle of ['equipes', 'scores']) {
          if (joueurs) cases.get(cle).checked = true;
          cases.get(cle).disabled = joueurs;
        }
        valider.disabled = ![...cases.values()].some((c) => c.checked);
      }
      suivre();

      corps.append(
        el(
          'p',
          { class: 'dialogue__message' },
          'Exportez d’abord ce que vous voulez garder : le groupe (bouton « Exporter le groupe ») et vos contenus (page « Les contenus »).',
        ),
        el('fieldset', { class: 'remise-a-zero' }, el('legend', {}, 'À vider'), lignes),
        el(
          'p',
          { class: 'champ__aide' },
          'Vos thématiques, le mot de passe et le réglage du son sont gardés.',
        ),
      );
      pied.append(
        el('button', { type: 'button', class: 'bouton', onclick: () => fermer(null) }, 'Annuler'),
        valider,
      );
    },
  });
}
