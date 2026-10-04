import { svg, creerIllustration } from '../../assets/js/commun/illustration.js';

/**
 * Un personnage et une chaise. États : 'vrai' (il se lève, bras en l'air), 'faux' (il s'assoit).
 * Au repos, il hésite à côté de la chaise.
 */
export function creerIllustrationDebout() {
  const chaise = [
    svg('rect', { x: 150, y: 40, width: 15, height: 74, rx: 6, class: 'ill-accent' }),
    svg('rect', { x: 158, y: 40, width: 7, height: 74, rx: 3, class: 'ill-ombre' }),
    svg('rect', { x: 114, y: 108, width: 9, height: 50, rx: 4, class: 'ill-accent' }),
    svg('rect', { x: 154, y: 108, width: 9, height: 50, rx: 4, class: 'ill-accent' }),
    svg('rect', { x: 108, y: 98, width: 60, height: 14, rx: 5, class: 'ill-accent' }),
    svg('rect', { x: 108, y: 106, width: 60, height: 6, rx: 3, class: 'ill-ombre' }),
    svg('rect', { x: 112, y: 100, width: 26, height: 4, rx: 2, class: 'ill-reflet' }),
  ];
  const corps = (x) => [
    svg('circle', { cx: x + 16, cy: 26, r: 15, class: 'ill-nuit' }),
    svg('rect', { x, y: 46, width: 32, height: 54, rx: 14, class: 'ill-nuit' }),
    svg('rect', { x: x + 3, y: 90, width: 11, height: 66, rx: 5, class: 'ill-nuit' }),
    svg('rect', { x: x + 18, y: 90, width: 11, height: 66, rx: 5, class: 'ill-nuit' }),
  ];
  const debout = svg(
    'g',
    { class: 'debout-ill__debout' },
    corps(42),
    svg(
      'g',
      { class: 'debout-ill__bras-bas' },
      svg('rect', { x: 34, y: 50, width: 10, height: 44, rx: 5, class: 'ill-nuit' }),
      svg('rect', { x: 72, y: 50, width: 10, height: 44, rx: 5, class: 'ill-nuit' }),
    ),
    svg(
      'g',
      { class: 'debout-ill__bras-haut' },
      svg('rect', {
        x: 34,
        y: 12,
        width: 10,
        height: 44,
        rx: 5,
        transform: 'rotate(-24 39 54)',
        class: 'ill-nuit',
      }),
      svg('rect', {
        x: 72,
        y: 12,
        width: 10,
        height: 44,
        rx: 5,
        transform: 'rotate(24 77 54)',
        class: 'ill-nuit',
      }),
    ),
  );
  const assis = svg(
    'g',
    { class: 'debout-ill__assis' },
    svg('circle', { cx: 140, cy: 40, r: 15, class: 'ill-nuit' }),
    svg('rect', { x: 124, y: 58, width: 30, height: 46, rx: 12, class: 'ill-nuit' }),
    svg('rect', { x: 94, y: 86, width: 56, height: 13, rx: 6, class: 'ill-nuit' }),
    svg('rect', { x: 94, y: 88, width: 12, height: 68, rx: 6, class: 'ill-nuit' }),
    svg('rect', {
      x: 112,
      y: 60,
      width: 10,
      height: 38,
      rx: 5,
      transform: 'rotate(-28 117 62)',
      class: 'ill-nuit',
    }),
  );
  const bulle = svg(
    'g',
    { class: 'debout-ill__bulle' },
    svg('circle', { cx: 92, cy: 18, r: 15, class: 'ill-accent' }),
    svg('text', { x: 92, y: 19, 'font-size': 20, class: 'ill-texte-accent' }, '?'),
  );
  return creerIllustration({ nom: 'debout-assis', dessin: [...chaise, assis, debout, bulle] });
}
