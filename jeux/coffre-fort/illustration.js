import { svg, ombrer, etoile, creerIllustration } from '../../assets/js/commun/illustration.js';

/** Un coffre-fort à molette. État : 'ouvert' (la porte pivote et dévoile le trésor). */
export function creerIllustrationCoffre() {
  const cx = 96;
  const cy = 86;
  const graduations = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6;
    return svg('line', {
      x1: (cx + 24 * Math.sin(angle)).toFixed(1),
      y1: (cy - 24 * Math.cos(angle)).toFixed(1),
      x2: (cx + 30 * Math.sin(angle)).toFixed(1),
      y2: (cy - 30 * Math.cos(angle)).toFixed(1),
      class: 'coffre-ill__graduation',
    });
  });
  const lingot = (x, y) => [
    svg('polygon', {
      points: `${x},${y + 16} ${x + 6},${y} ${x + 34},${y} ${x + 40},${y + 16}`,
      class: 'ill-jaune',
    }),
    svg('rect', { x: x + 8, y: y + 2, width: 14, height: 3, rx: 1.5, class: 'ill-reflet' }),
  ];
  return creerIllustration({
    nom: 'coffre-fort',
    hauteur: 184,
    dessin: [
      // Les pieds
      svg('rect', { x: 26, y: 162, width: 28, height: 16, rx: 4, class: 'ill-nuit' }),
      svg('rect', { x: 146, y: 162, width: 28, height: 16, rx: 4, class: 'ill-nuit' }),
      // La caisse
      ...ombrer(
        'ill-coffre',
        svg('rect', { x: 10, y: 8, width: 180, height: 158, rx: 16, class: 'ill-accent' }),
        svg('rect', { x: 124, y: 96, width: 132, height: 132, rx: 66, class: 'ill-ombre' }),
      ),
      svg('rect', { x: 22, y: 12, width: 44, height: 5, rx: 2.5, class: 'ill-reflet' }),
      // L'intérieur et le trésor, cachés par la porte
      svg('rect', { x: 26, y: 24, width: 148, height: 126, rx: 10, class: 'ill-nuit' }),
      svg(
        'g',
        { class: 'coffre-ill__tresor' },
        ...lingot(58, 116),
        ...lingot(102, 116),
        ...lingot(80, 98),
        etoile(150, 52, 12, 'ill-jaune'),
        etoile(126, 36, 7, 'ill-jaune'),
      ),
      // La porte : la molette, la poignée, les gonds
      svg(
        'g',
        { class: 'coffre-ill__porte' },
        svg('rect', {
          x: 26,
          y: 24,
          width: 148,
          height: 126,
          rx: 10,
          class: 'coffre-ill__battant',
        }),
        svg('rect', { x: 20, y: 42, width: 12, height: 20, rx: 4, class: 'ill-nuit' }),
        svg('rect', { x: 20, y: 112, width: 12, height: 20, rx: 4, class: 'ill-nuit' }),
        svg(
          'g',
          { class: 'coffre-ill__molette' },
          svg('circle', { cx, cy, r: 34, class: 'ill-nuit' }),
          ...graduations,
          svg('circle', { cx, cy, r: 12, class: 'ill-jaune' }),
          svg('rect', { x: cx - 3, y: cy - 30, width: 6, height: 18, rx: 3, class: 'ill-jaune' }),
        ),
        svg('rect', { x: 146, y: 66, width: 14, height: 40, rx: 7, class: 'ill-jaune' }),
        svg('rect', { x: 153, y: 66, width: 7, height: 40, rx: 3.5, class: 'ill-ombre' }),
      ),
    ],
  });
}
