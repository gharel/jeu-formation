/**
 * Bloc « Groupes récents » de la page « Le groupe » : les groupes du dernier mois, mis de côté
 * quand ils allaient être perdus (historique-groupes.js), à recharger en entier ou en partie
 * (prénoms, disposition, équipes, scores) ou à supprimer.
 */
import * as historique from './historique-groupes.js';
import { ecouterStockage } from './stockage.js';
import { confirmer, ouvrirDialogue } from './dialogues.js';
import { el, remplir, icone, annoncer, focaliser } from './ui.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
/** Prénoms montrés pour reconnaître un groupe sans nom. */
const PRENOMS_MONTRES = 8;

/** « 6 participants · 2 équipes · Îlots, 4 placés · en tête : Ana, 12 points » */
function details(resume) {
  const morceaux = [pluriel(resume.participants, 'participant')];
  if (resume.equipes) morceaux.push(pluriel(resume.equipes, 'équipe'));
  if (resume.places) {
    const places = `${resume.places} placé${resume.places > 1 ? 's' : ''}`;
    morceaux.push(resume.disposition ? `${resume.disposition}, ${places}` : places);
  }
  if (resume.meilleur) {
    const { prenom, points } = resume.meilleur;
    morceaux.push(`en tête : ${prenom}, ${pluriel(points, 'point')}`);
  }
  return morceaux.join(' · ');
}

/**
 * Fenêtre « Recharger ce groupe ? » : une case par partie, toutes cochées. Sans prénom dans le
 * groupe actuel, les prénoms reviennent d'office. Résout avec les parties choisies, ou null.
 */
function demanderQuoiRecharger(resume, groupe) {
  const actuels = groupe.participants.length;
  return ouvrirDialogue({
    titre: `Recharger « ${resume.titre} » ?`,
    valeurAnnulation: null,
    construire({ corps, pied, fermer }) {
      const cases = new Map();
      const lignes = historique.PARTIES_RECHARGE.map((partie) => {
        const id = `recharger-${partie.cle}`;
        const caseACocher = el('input', {
          id,
          type: 'checkbox',
          checked: true,
          disabled: partie.cle === 'prenoms' && !actuels,
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
      const avertissement = el('p', { class: 'champ__aide' });
      const valider = el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--principal',
          onclick: () =>
            fermer([...cases].filter(([, caseACocher]) => caseACocher.checked).map(([cle]) => cle)),
        },
        icone('rotate-left'),
        'Recharger',
      );

      /** Sans les prénoms, le reste vaut pour le groupe actuel ; rien de coché : rien à faire. */
      function suivre() {
        const prenoms = cases.get('prenoms').checked;
        remplir(
          avertissement,
          prenoms
            ? ''
            : 'Sans les prénoms, la disposition, les équipes et les scores ne valent que pour les personnes déjà dans le groupe.',
        );
        avertissement.hidden = prenoms;
        valider.disabled = ![...cases.values()].some((c) => c.checked);
      }
      suivre();

      corps.append(
        el('p', { class: 'dialogue__message' }, resume.prenoms.join(', ')),
        el(
          'fieldset',
          { class: 'remise-a-zero' },
          el('legend', {}, 'À recharger'),
          lignes,
          avertissement,
        ),
      );
      // append() du DOM écrirait « null » : le message n'est ajouté que s'il y a un groupe actuel
      if (actuels) {
        corps.append(
          el(
            'p',
            { class: 'champ__aide' },
            `Le groupe actuel (${pluriel(actuels, 'participant')}) reste dans « Groupes récents ».`,
          ),
        );
      }
      pied.append(
        el('button', { type: 'button', class: 'bouton', onclick: () => fermer(null) }, 'Annuler'),
        valider,
      );
    },
  });
}

export function creerBlocHistorique(groupe) {
  const titre = el('h3', { id: 'titre-historique' }, icone('clock-rotate-left'), 'Groupes récents');
  const liste = el('ul', { class: 'historique-groupes', 'aria-label': 'Groupes récents' });
  const etat = el('p', { class: 'bloc-historique__etat' }, 'Aucun groupe récent pour l’instant.');
  const messages = el('div', { class: 'messages', role: 'status' });
  const boutonEffacer = el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--discret',
      onclick: async () => {
        const n = historique.charger().length;
        if (
          await confirmer({
            titre: 'Effacer les groupes récents ?',
            message: `${n > 1 ? `Les ${n} groupes gardés ici seront effacés` : 'Le groupe gardé ici sera effacé'}. Le groupe en cours ne change pas.`,
            oui: 'Effacer',
          })
        ) {
          historique.enregistrer([]);
          dessiner();
          remplir(messages);
          annoncer('Groupes récents effacés');
          focaliser(titre);
        }
      },
    },
    icone('trash-can'),
    'Effacer l’historique',
  );

  async function recharger(entree, resume) {
    const choix = await demanderQuoiRecharger(resume, groupe);
    if (!choix?.length) return;
    groupe.recharger(entree, choix);
    const places = Object.keys(groupe.plan.places).length;
    const texte = `Groupe rechargé${groupe.nom ? ` : ${groupe.nom}` : ''} (${historique.decrireParties(choix)}). ${pluriel(groupe.participants.length, 'participant')}, ${pluriel(places, 'personne')} sur le plan.`;
    remplir(messages, el('div', { class: 'message message--info' }, el('p', {}, texte)));
    annoncer(texte);
    focaliser(titre);
  }

  async function supprimerEntree(entree, resume) {
    if (
      await confirmer({
        titre: 'Retirer ce groupe ?',
        message: `${resume.titre} (${pluriel(resume.participants, 'participant')}) sera retiré des groupes récents.`,
        oui: 'Retirer',
      })
    ) {
      historique.enregistrer(historique.supprimer(historique.charger(), entree.id));
      dessiner();
      remplir(messages);
      annoncer(`${resume.titre} retiré des groupes récents`);
      focaliser(titre);
    }
  }

  function ligne(entree) {
    const resume = historique.resumer(entree);
    const enCours = entree.id === groupe.idHistorique;
    const prenoms =
      resume.prenoms.length > PRENOMS_MONTRES
        ? `${resume.prenoms.slice(0, PRENOMS_MONTRES).join(', ')}…`
        : resume.prenoms.join(', ');
    return el(
      'li',
      { class: 'historique-groupes__ligne' },
      el(
        'div',
        { class: 'historique-groupes__texte' },
        el(
          'p',
          { class: 'historique-groupes__titre' },
          resume.titre,
          enCours ? el('span', { class: 'historique-groupes__en-cours' }, 'en cours') : null,
        ),
        el('p', { class: 'historique-groupes__prenoms' }, prenoms),
        el(
          'p',
          { class: 'historique-groupes__details' },
          `${details(resume)} · ${historique.decrireDates(entree)}`,
        ),
      ),
      el(
        'div',
        { class: 'groupe-boutons historique-groupes__boutons' },
        el(
          'button',
          {
            type: 'button',
            class: 'bouton',
            'aria-label': `Recharger « ${resume.titre} »`,
            onclick: () => recharger(entree, resume),
          },
          icone('rotate-left'),
          'Recharger…',
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--discret',
            'aria-label': `Retirer « ${resume.titre} »`,
            onclick: () => supprimerEntree(entree, resume),
          },
          icone('trash-can'),
          'Retirer',
        ),
      ),
    );
  }

  function dessiner() {
    const entrees = historique.charger();
    remplir(liste, entrees.map(ligne));
    liste.hidden = !entrees.length;
    etat.hidden = entrees.length > 0;
    boutonEffacer.hidden = !entrees.length;
  }

  // Un groupe est mis de côté juste avant d'être remplacé (liste effacée, tout vidé, import)
  groupe.surChangement(dessiner);
  groupe.surChangementScores(dessiner);
  ecouterStockage(historique.CLE_HISTORIQUE, dessiner);
  dessiner();

  return el(
    'section',
    { class: 'carte bloc-historique', 'aria-labelledby': 'titre-historique' },
    el('div', { class: 'ecran__entete' }, titre, boutonEffacer),
    el(
      'p',
      { class: 'champ__aide' },
      `Quand vous videz le groupe, effacez la liste ou en importez un autre, il reste ici ${historique.DUREE_JOURS} jours dans ce navigateur. Rechargez-le en entier, ou seulement ses prénoms, sa disposition, ses équipes ou ses scores.`,
    ),
    etat,
    liste,
    messages,
  );
}
