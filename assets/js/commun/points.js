/**
 * Bouton « Attribuer le point » : ouvre la liste des prénoms et ajoute les points choisis.
 * Sans participants, renvoie null (on joue sans classement).
 */
import { el, remplir, icone } from './ui.js';

export function creerBoutonPoints(
  ctx,
  { points = 1, titre = 'Qui a trouvé ?', message = '', multiple = false, preselection = [] } = {},
) {
  if (!ctx.participants.length) return null;
  const libelle = `${points} point${points > 1 ? 's' : ''}`;
  const bouton = el(
    'button',
    { type: 'button', class: 'bouton bouton--principal bouton--grand' },
    icone('trophy'),
    `Attribuer ${libelle}`,
  );
  bouton.addEventListener('click', async () => {
    const choisis = await ctx.choisirPrenoms({ titre, message, multiple, preselection });
    if (!choisis.length) return;
    for (const prenom of choisis) ctx.scores.ajouter(prenom, points);
    bouton.disabled = true;
    remplir(bouton, icone('check'), `+${libelle} pour ${choisis.join(', ')}`);
    ctx.annoncer(`${libelle} pour ${choisis.join(', ')}`);
    ctx.sons.succes();
    bouton.dispatchEvent(new CustomEvent('points-attribues', { bubbles: true, detail: choisis }));
  });
  return bouton;
}
