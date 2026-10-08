/**
 * Bouton « Attribuer le point » : ouvre la liste des prénoms et ajoute les points choisis, à une
 * personne, à plusieurs, à tout le monde ou à une équipe. Sans participants, renvoie null (on joue
 * sans classement).
 */
import { el, remplir, icone } from './ui.js';

/** « Ana », « Ana et Bob », « Ana, Bob et Chloé » */
function enumerer(noms) {
  return noms.length < 2 ? (noms[0] ?? '') : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`;
}

/**
 * Qui a marqué, en peu de mots : « Ana », « Ana et Bob », « Ana, Bob et Chloé », « tout le monde »
 * (tous les joueurs, s'ils sont plusieurs) ou « 4 personnes » (au-delà de `max` noms).
 * `equipes` : les équipes choisies ({ nom, membres }) ; elles sont nommées à la place de leurs
 * membres (« Les Bleus », « Les Bleus et Chloé »).
 */
export function nommerGagnants(prenoms, participants = [], max = 3, equipes = []) {
  const couverts = new Set(equipes.flatMap((e) => e.membres));
  const noms = [...equipes.map((e) => e.nom), ...prenoms.filter((p) => !couverts.has(p))];
  if (equipes.length && noms.length <= max) return enumerer(noms);
  if (prenoms.length > 1 && prenoms.length === participants.length) return 'tout le monde';
  if (prenoms.length > max) return `${prenoms.length} personnes`;
  return enumerer(prenoms);
}

/** Les gagnants choisis par ctx.choisirGagnants() ({ prenoms, equipes }), en peu de mots. */
export function decrireGagnants(ctx, { prenoms, equipes = [] }, max = 3) {
  const choisies = (ctx.equipes ?? []).filter((e) => equipes.includes(e.id));
  return nommerGagnants(prenoms, ctx.participants, max, choisies);
}

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
    const gagnants = await ctx.choisirGagnants({
      titre,
      message,
      multiple,
      plusieurs: !multiple,
      preselection,
    });
    if (!gagnants.prenoms.length) return;
    ctx.scores.ajouterGagnants(gagnants, points);
    const qui = decrireGagnants(ctx, gagnants);
    bouton.disabled = true;
    remplir(bouton, icone('check'), `+${libelle} pour ${qui}`);
    ctx.annoncer(`${libelle} pour ${qui}`);
    ctx.sons.ding();
  });
  return bouton;
}
