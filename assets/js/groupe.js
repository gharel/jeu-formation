/**
 * Page « Le groupe » : les prénoms et l'info de chacun, puis le plan de salle pour retenir
 * qui est assis où. Les données sont partagées avec tous les jeux (groupe.js).
 */
import { exigerAcces } from './commun/acces.js';
import { creerGroupe } from './commun/groupe.js';
import { creerBlocParticipants } from './commun/bloc-participants.js';
import { creerPlanSalle } from './commun/plan-salle.js';
import { hasardDePage } from './commun/hasard.js';
import {
  el,
  remplir,
  icone,
  focaliser,
  ecouterClavier,
  basculerPleinEcran,
  pleinEcranDisponible,
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
  ),
);
focaliser(titre);
