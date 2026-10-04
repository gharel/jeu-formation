/**
 * Page « Le groupe » : son nom, les prénoms et l'info de chacun, le plan de salle pour retenir
 * qui est assis où, et les scores de tous les jeux. Les données sont partagées avec tous les jeux (groupe.js), et tout
 * le groupe s'exporte ou s'importe en un fichier JSON (fichier-groupe.js).
 */
import { exigerAcces } from './commun/acces.js';
import { creerGroupe } from './commun/groupe.js';
import { creerBlocParticipants } from './commun/bloc-participants.js';
import { creerBlocScores } from './commun/bloc-scores.js';
import { creerPlanSalle } from './commun/plan-salle.js';
import { hasardDePage } from './commun/hasard.js';
import { LONGUEUR_NOM } from './commun/participants.js';
import { preparerExportGroupe, lireImportGroupe } from './commun/fichier-groupe.js';
import { telechargerJson, nomDeFichier } from './commun/fichiers.js';
import { confirmer } from './commun/dialogues.js';
import {
  el,
  remplir,
  icone,
  focaliser,
  ecouterClavier,
  basculerPleinEcran,
  pleinEcranDisponible,
  annoncer,
} from './commun/ui.js';

await exigerAcces();

const groupe = creerGroupe();
const plan = creerPlanSalle(groupe, { modifiable: true, hasard: hasardDePage() });

// Plein écran : pour projeter le plan (masqué sur téléphone, voir base.css)
if (pleinEcranDisponible()) {
  document.getElementById('actions')?.append(
    el(
      'button',
      {
        type: 'button',
        class: 'bouton-bandeau bouton-plein-ecran',
        'aria-keyshortcuts': 'F',
        title: 'Plein écran (touche F)',
        onclick: () => basculerPleinEcran(),
      },
      icone('expand'),
      'Plein écran',
    ),
  );
}
ecouterClavier({ f: () => basculerPleinEcran() });

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Nom du groupe, export et import du fichier JSON. */
function creerBlocFichier() {
  const messages = el('div', { class: 'messages', role: 'status' });
  const erreurs = el('div', { class: 'messages', role: 'alert' });
  const champNom = el('input', {
    id: 'nom-groupe',
    type: 'text',
    class: 'champ__controle',
    autocomplete: 'off',
    maxlength: LONGUEUR_NOM,
    placeholder: 'Ex. : Google Sheets, mairie, octobre',
    value: groupe.nom,
    onchange: (e) => groupe.changerNom(e.target.value),
  });
  // Groupe importé : le nom suit (et s'affiche nettoyé après la saisie)
  groupe.surChangement(() => {
    champNom.value = groupe.nom;
  });

  /** Un seul message à la fois ; `aVerifier` : ce que l'import a ignoré. */
  function afficher(zone, classe, texte, aVerifier = []) {
    remplir(messages);
    remplir(erreurs);
    remplir(
      zone,
      el(
        'div',
        { class: `message ${classe}` },
        el('p', {}, texte),
        aVerifier.length
          ? [
              el('p', {}, 'À vérifier :'),
              el(
                'ul',
                {},
                aVerifier.map((d) => el('li', {}, d)),
              ),
            ]
          : null,
      ),
    );
  }

  async function importer(fichier) {
    let lu;
    try {
      lu = lireImportGroupe(await fichier.text());
    } catch (erreur) {
      afficher(erreurs, 'message--erreur', erreur.message);
      return;
    }
    const actuels = groupe.participants.length;
    if (
      actuels &&
      !(await confirmer({
        titre: 'Remplacer le groupe ?',
        message: `Les ${pluriel(actuels, 'participant')} actuels, leurs infos, le plan de salle et les scores seront remplacés par le groupe du fichier (${pluriel(lu.participants.length, 'participant')}).`,
        oui: 'Remplacer',
      }))
    ) {
      return;
    }
    groupe.remplacer(lu);
    const places = Object.keys(groupe.plan.places).length;
    const texte = `Groupe importé${groupe.nom ? ` : ${groupe.nom}` : ''}. ${pluriel(groupe.participants.length, 'participant')}, ${pluriel(places, 'personne')} sur le plan.`;
    afficher(messages, 'message--info', texte, lu.avertissements);
    annoncer(texte);
  }

  const entreeImport = el('input', {
    id: 'fichier-groupe',
    type: 'file',
    accept: 'application/json,.json',
    class: 'visuellement-cache',
    onchange: async (e) => {
      const fichier = e.target.files?.[0];
      e.target.value = '';
      if (fichier) await importer(fichier);
    },
  });

  return el(
    'section',
    { class: 'carte bloc-fichier-groupe', 'aria-labelledby': 'titre-fichier-groupe' },
    el('h3', { id: 'titre-fichier-groupe' }, 'Nom et fichier du groupe'),
    el(
      'div',
      { class: 'bloc-fichier-groupe__ligne' },
      el(
        'div',
        { class: 'champ bloc-fichier-groupe__nom' },
        el('label', { for: 'nom-groupe', class: 'champ__libelle' }, 'Nom du groupe (facultatif)'),
        champNom,
      ),
      el(
        'div',
        { class: 'groupe-boutons' },
        el(
          'button',
          {
            type: 'button',
            class: 'bouton',
            onclick: () =>
              telechargerJson(
                nomDeFichier('skazy-groupe', groupe.nom),
                preparerExportGroupe(groupe),
              ),
          },
          icone('download'),
          'Exporter le groupe',
        ),
        el(
          'label',
          { for: 'fichier-groupe', class: 'bouton bouton--discret' },
          icone('upload'),
          'Importer un groupe…',
        ),
        entreeImport,
      ),
    ),
    el(
      'p',
      { class: 'champ__aide' },
      'Le fichier JSON garde le nom, les prénoms, les infos, les absences, la disposition de la salle et les places. Exportez-le pour retrouver ce groupe à la prochaine séance, ou préparez-le à l’avance.',
    ),
    messages,
    erreurs,
  );
}

const titre = el('h2', {}, 'Qui est dans la salle ?');
remplir(
  document.getElementById('cadre'),
  el(
    'section',
    { class: 'ecran ecran-groupe' },
    el(
      'div',
      { class: 'intro carte' },
      el('p', { class: 'intro__icone' }, icone('users')),
      el(
        'div',
        {},
        titre,
        el(
          'p',
          { class: 'intro__accroche' },
          'Saisissez les prénoms, une info sur chacun, puis placez-les sur le plan de la salle : vous retiendrez qui est assis où.',
        ),
        el(
          'p',
          { class: 'champ__aide' },
          'La liste sert pour tous les jeux. Pendant une partie, le bouton « Groupe » du bandeau la réaffiche avec le plan. Rien ne sort de ce navigateur.',
        ),
      ),
    ),
    creerBlocFichier(),
    el(
      'div',
      { class: 'groupe-colonnes' },
      creerBlocParticipants(groupe),
      el(
        'section',
        { class: 'carte bloc-plan', 'aria-labelledby': 'titre-plan' },
        el('h3', { id: 'titre-plan' }, 'Plan de salle'),
        plan.element,
      ),
    ),
    creerBlocScores(groupe),
  ),
);
// Lien « Voir les scores du groupe » de la fin d'une partie (#scores) : on va droit au bloc. Aucun
// élément n'a l'id « scores » : sinon le navigateur traiterait l'ancre après nous, et le focus
// retomberait sur la page.
const ancre = location.hash === '#scores' ? document.getElementById('titre-scores') : null;
focaliser(ancre ?? titre);
